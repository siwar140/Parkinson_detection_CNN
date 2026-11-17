# backend/evaluate_model.py
"""
Évaluation du modèle CNN Parkinson sur un dataset de spectrogrammes .npy.

Usage :
    python evaluate_model.py "C:\chemin\vers\Split_8k_1_BD"
    python evaluate_model.py "C:\chemin\vers\Split_8k_1_BD" --split Validation
    python evaluate_model.py "C:\chemin\vers\Split_8k_1_BD" --threshold 0.4333
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    roc_auc_score,
    roc_curve,
    accuracy_score,
)

# ==========================================================
# Constantes — identiques au pipeline d'entraînement
# ==========================================================
IMG_H, IMG_W = 257, 59
MEAN         = -42.3466
STD          = 19.0233
CLASS_NAMES  = ["Control", "Patologicas"]
DEFAULT_THR  = 0.4333

MODEL_PATH   = Path(__file__).resolve().parent / "models_ia" / "best_model_cnn.keras"


# ==========================================================
# Chargement des données
# ==========================================================
def load_split(split_dir: Path):
    """Charge tous les .npy de split_dir/Control et split_dir/Patologicas."""
    X, y, files = [], [], []

    for label, cls in enumerate(CLASS_NAMES):
        cls_dir = split_dir / cls
        if not cls_dir.exists():
            print(f"⚠️  Dossier manquant : {cls_dir}")
            continue

        npy_files = sorted(cls_dir.glob("*.npy"))
        print(f"  {cls:<15}: {len(npy_files)} fichiers")

        for f in npy_files:
            try:
                spec = np.load(f).astype(np.float32)
            except Exception as e:
                print(f"⚠️  Erreur chargement {f.name} : {e}")
                continue

            if spec.shape != (IMG_H, IMG_W):
                print(f"⚠️  Forme invalide {f.name} : {spec.shape} — ignoré")
                continue

            X.append(spec)
            y.append(label)
            files.append(f.name)

    if not X:
        raise RuntimeError(f"Aucun fichier valide dans {split_dir}")

    X = np.stack(X, axis=0)              # (N, 257, 59)
    y = np.array(y, dtype=np.int32)      # (N,)
    return X, y, files


def normalize(X: np.ndarray) -> np.ndarray:
    """Applique la normalisation du notebook."""
    return ((X - MEAN) / STD).astype(np.float32)


# ==========================================================
# Évaluation
# ==========================================================
def evaluate(base_dir: Path, split: str, threshold: float):
    split_dir = base_dir / split
    if not split_dir.exists():
        raise FileNotFoundError(f"Dossier introuvable : {split_dir}")

    print(f"\n📂 Chargement de {split_dir}")
    X, y, files = load_split(split_dir)

    print(f"\n📊 Total : {len(X)} spectrogrammes")
    print(f"   Control      : {(y == 0).sum()}")
    print(f"   Patologicas  : {(y == 1).sum()}")

    print("\n🔧 Normalisation (MEAN={:.4f}, STD={:.4f})".format(MEAN, STD))
    X = normalize(X)

    # Chargement du modèle
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Modèle introuvable : {MODEL_PATH}")

    print(f"\n🧠 Chargement du modèle : {MODEL_PATH}")
    model = tf.keras.models.load_model(str(MODEL_PATH))

    # Prédictions
    print("\n🔮 Prédiction sur tout le jeu…")
    X_input = X[..., np.newaxis]                 # (N, 257, 59, 1)
    probs   = model.predict(X_input, verbose=1).flatten()
    y_pred  = (probs >= threshold).astype(int)

    # Métriques
    acc = accuracy_score(y, y_pred)
    try:
        auc = roc_auc_score(y, probs)
    except ValueError:
        auc = float("nan")

    print("\n" + "=" * 60)
    print(f"Seuil utilisé : {threshold}")
    print(f"Accuracy      : {acc:.4f}")
    print(f"ROC AUC       : {auc:.4f}")
    print("=" * 60)

    print("\nClassification Report :")
    print(classification_report(y, y_pred, target_names=CLASS_NAMES, digits=4))

    # Matrice de confusion
    cm = confusion_matrix(y, y_pred)
    tn, fp, fn, tp = cm.ravel()

    print("Matrice de confusion :")
    print(f"   TN={tn}  FP={fp}")
    print(f"   FN={fn}  TP={tp}")
    print(f"\nSensibilité (recall Patologicas) : {tp / (tp + fn):.4f}")
    print(f"Spécificité (recall Control)     : {tn / (tn + fp):.4f}")
    print(f"Précision Patologicas            : {tp / (tp + fp) if (tp + fp) else 0:.4f}")

    # Affichage
    plot_confusion_matrix(cm, threshold)

    # Si demandé, on peut aussi tracer la courbe ROC
    plot_roc(y, probs, auc)


def plot_confusion_matrix(cm: np.ndarray, threshold: float):
    plt.figure(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        cbar=True,
    )
    plt.xlabel("Classe prédite")
    plt.ylabel("Classe réelle")
    plt.title(f"Matrice de confusion (seuil = {threshold})")
    plt.tight_layout()
    plt.show()


def plot_roc(y_true: np.ndarray, probs: np.ndarray, auc: float):
    try:
        fpr, tpr, _ = roc_curve(y_true, probs)
    except ValueError:
        return
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, linewidth=2, label=f"AUC = {auc:.4f}")
    plt.plot([0, 1], [0, 1], "k--", alpha=0.5)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Courbe ROC")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.show()


# ==========================================================
# CLI
# ==========================================================
def main():
    parser = argparse.ArgumentParser(description="Matrice de confusion du modèle Parkinson")
    parser.add_argument(
        "base_dir",
        type=str,
        help="Chemin de base du dataset (contient Train/, Validation/)",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="Validation",
        choices=["Train", "Validation"],
        help="Sous-dossier à évaluer (défaut : Validation)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THR,
        help=f"Seuil de décision (défaut : {DEFAULT_THR})",
    )
    args = parser.parse_args()

    base_dir = Path(args.base_dir)
    if not base_dir.exists():
        print(f"❌ Dossier introuvable : {base_dir}")
        sys.exit(1)

    try:
        evaluate(base_dir, args.split, args.threshold)
    except Exception as e:
        print(f"❌ Erreur : {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()