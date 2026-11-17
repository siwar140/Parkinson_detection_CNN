# backend/evaluate_app.py
"""
Évalue le pipeline COMPLET de l'application sur toute une base audio.

Pour chaque fichier .wav :
    1. Segment en tranches de 1 seconde
    2. Calcule le spectrogramme linéaire dB
    3. Normalise avec MEAN/STD du notebook
    4. Prédit chaque segment
    5. Vote majoritaire
    6. Compare avec l'étiquette réelle (dossier Control ou Patologicas)

Usage :
    python evaluate_app.py "C:\chemin\vers\Segmented_1\audio"
    python evaluate_app.py "C:\chemin\vers\Segmented_1\audio" --threshold 0.4333
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    roc_auc_score,
    accuracy_score,
    roc_curve,
)

# Import du pipeline de l'application
from app.ml_inference import predict, THRESHOLD as DEFAULT_THR


# ==========================================================
# Évaluation sur toute la base
# ==========================================================
def evaluate_base(base_dir: Path, threshold: float = None):
    """
    Parcourt base_dir/Control/*.wav et base_dir/Patologicas/*.wav
    et prédit chaque fichier avec le pipeline de l'application.
    """
    classes = ["Control", "Patologicas"]

    y_true = []
    y_pred = []
    y_probs = []            # proba moyenne par fichier
    file_names = []
    errors = []

    print("=" * 70)
    print(f"📂 Base : {base_dir}")
    print(f"🎯 Seuil : {threshold if threshold is not None else DEFAULT_THR}")
    print("=" * 70)

    for label, cls in enumerate(classes):
        cls_dir = base_dir / cls
        if not cls_dir.exists():
            print(f"⚠️  Dossier manquant : {cls_dir}")
            continue

        wav_files = sorted(cls_dir.glob("*.wav"))
        print(f"\n[{cls}] {len(wav_files)} fichiers")

        for i, wav in enumerate(wav_files, 1):
            try:
                result = predict(wav)
            except Exception as e:
                errors.append((wav.name, str(e)))
                print(f"  [{i:>4}/{len(wav_files)}] ❌ {wav.name} : {e}")
                continue

            # Le résultat du pipeline
            predicted_label = 1 if result["result"] == "Malade" else 0

            y_true.append(label)
            y_pred.append(predicted_label)
            y_probs.append(result["probability"])
            file_names.append(wav.name)

            mark = "✅" if predicted_label == label else "❌"
            print(
                f"  [{i:>4}/{len(wav_files)}] {mark} {wav.name:<45} "
                f"→ {result['result']:<7} "
                f"(p={result['probability']:.3f}, conf={result['confidence']:.1f}%, "
                f"seg={result['n_segments']})"
            )

    y_true  = np.array(y_true)
    y_pred  = np.array(y_pred)
    y_probs = np.array(y_probs)

    print("\n" + "=" * 70)
    print("📊 RÉSULTATS GLOBAUX")
    print("=" * 70)
    print(f"Fichiers traités : {len(y_true)}")
    print(f"Fichiers en erreur : {len(errors)}")
    print(f"Control      : {(y_true == 0).sum()}")
    print(f"Patologicas  : {(y_true == 1).sum()}")

    if len(y_true) == 0:
        print("⚠️  Aucun fichier traité — impossible de calculer la matrice.")
        return

    # Métriques
    acc = accuracy_score(y_true, y_pred)
    try:
        auc = roc_auc_score(y_true, y_probs)
    except ValueError:
        auc = float("nan")

    print(f"\nAccuracy      : {acc:.4f}")
    print(f"ROC AUC       : {auc:.4f}")

    print("\nClassification Report :")
    print(classification_report(y_true, y_pred, target_names=classes, digits=4))

    # Matrice de confusion
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    print("Matrice de confusion (fichiers audio) :")
    print(f"   TN={tn}  FP={fp}")
    print(f"   FN={fn}  TP={tp}")
    print(f"\nSensibilité (recall Patologicas) : {tp / (tp + fn) if (tp + fn) else 0:.4f}")
    print(f"Spécificité (recall Control)     : {tn / (tn + fp) if (tn + fp) else 0:.4f}")
    print(f"Précision Patologicas            : {tp / (tp + fp) if (tp + fp) else 0:.4f}")

    # Affichage
    plot_confusion_matrix(cm, threshold if threshold is not None else DEFAULT_THR)
    plot_roc(y_true, y_probs, auc)

    # Fichiers mal classés
    if len(errors) > 0:
        print("\n⚠️  Fichiers ignorés :")
        for name, err in errors[:20]:
            print(f"   - {name} : {err}")
        if len(errors) > 20:
            print(f"   ... et {len(errors) - 20} autres")


# ==========================================================
# Visualisations
# ==========================================================
def plot_confusion_matrix(cm: np.ndarray, threshold: float):
    plt.figure(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["Control", "Patologicas"],
        yticklabels=["Control", "Patologicas"],
        cbar=True,
    )
    plt.xlabel("Classe prédite")
    plt.ylabel("Classe réelle")
    plt.title(f"Matrice de confusion — Pipeline complet (seuil = {threshold})")
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
    plt.title("Courbe ROC — Pipeline complet")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.show()


# ==========================================================
# CLI
# ==========================================================
def main():
    parser = argparse.ArgumentParser(
        description="Évalue le pipeline complet (audio → spectrogramme → CNN → vote)"
    )
    parser.add_argument(
        "base_dir",
        type=str,
        help="Dossier contenant Control/ et Patologicas/ avec les .wav",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=None,
        help=f"Seuil de décision (défaut : {DEFAULT_THR} du notebook)",
    )
    args = parser.parse_args()

    base_dir = Path(args.base_dir)
    if not base_dir.exists():
        print(f"❌ Dossier introuvable : {base_dir}")
        sys.exit(1)

    evaluate_base(base_dir, args.threshold)


if __name__ == "__main__":
    main()