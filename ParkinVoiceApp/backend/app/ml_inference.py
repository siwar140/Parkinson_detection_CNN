# app/ml_inference.py
"""
Inférence Parkinson — strictement fidèle au pipeline d'entraînement.

Pipeline .npy (spectrograms_creation.py) :
    - sr        = 8000
    - n_fft     = 512
    - hop_length= 128  (= n_fft // 4)
    - win_length= 512
    - center    = False
    - amplitude_to_db(np.abs(stft))   ← sans ref=np.max
    - forme     = (257, 59)

Notebook :
    - MEAN = -42.3466  ;  STD = 19.0233
    - THRESHOLD = 0.4333
"""

# ─── Variables d'environnement AVANT TensorFlow ───
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from pathlib import Path
from typing import Dict, Any, List
import numpy as np
import librosa

# ==========================================================
# Paramètres figés — IDENTIQUES au pipeline d'entraînement
# ==========================================================
SR          = 8000
N_FFT       = 512
HOP_LENGTH  = N_FFT // 4      # 128
WIN_LENGTH  = 512
CENTER      = False

TARGET_H    = 257
TARGET_W    = 59
SEGMENT_SEC = 1.0

MEAN        = -42.3466
STD         = 19.0233
THRESHOLD   = 0.4333

MODEL_DIR        = Path(__file__).resolve().parents[1] / "models_ia"
KERAS_MODEL_PATH = MODEL_DIR / "best_model_cnn_legacy.h5"
H5_MODEL_PATH    = MODEL_DIR / "best_model_cnn_legacy.h5"

_model = None


# ==========================================================
# Chargement du modèle
# ==========================================================
def get_loaded_model():
    global _model
    if _model is not None:
        return _model
    try:
        import tensorflow as tf
        if KERAS_MODEL_PATH.exists():
            _model = tf.keras.models.load_model(str(KERAS_MODEL_PATH), compile=False)
            print(f"✅ Modèle chargé : {KERAS_MODEL_PATH}")
            return _model
        if H5_MODEL_PATH.exists():
            _model = tf.keras.models.load_model(str(H5_MODEL_PATH), compile=False)
            print(f"✅ Modèle chargé : {H5_MODEL_PATH}")
            return _model
    except Exception as e:
        print(f"⚠️ Erreur chargement modèle : {e}")
    return None

# ==========================================================
# Spectrogramme linéaire en dB — EXACTEMENT comme les .npy
# ==========================================================
def audio_to_spectrogram(y: np.ndarray, sr: int = SR) -> np.ndarray:
    """
    Reproduit ligne par ligne spectrograms_creation.spectrograms_creation() :
        stft(n_fft=512, hop_length=128, win_length=512, center=False)
        amplitude_to_db(np.abs(S))         ← sans ref=np.max
        puis normalisation avec les stats du notebook
    """
    # 1. STFT identique au script
    S = librosa.stft(
        y,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        win_length=WIN_LENGTH,
        center=CENTER,
    )

    # 2. dB identique au script (pas de ref=np.max !)
    S_db = librosa.amplitude_to_db(np.abs(S))

    # 3. Forcer la forme (257, 59)
    if S_db.shape[0] < TARGET_H:
        S_db = np.pad(S_db, ((0, TARGET_H - S_db.shape[0]), (0, 0)))
    else:
        S_db = S_db[:TARGET_H, :]

    if S_db.shape[1] < TARGET_W:
        S_db = np.pad(S_db, ((0, 0), (0, TARGET_W - S_db.shape[1])))
    else:
        S_db = S_db[:, :TARGET_W]

    # 4. Normalisation identique au notebook
    S_norm = (S_db - MEAN) / STD

    return S_norm.astype(np.float32)


# ==========================================================
# Segmentation en tranches de 1 seconde
# ==========================================================
def segment_audio(y: np.ndarray, sr: int = SR,
                  seg_sec: float = SEGMENT_SEC) -> List[np.ndarray]:
    seg_len = int(seg_sec * sr)
    return [y[i:i + seg_len]
            for i in range(0, len(y) - seg_len + 1, seg_len)]


# ==========================================================
# Prédiction d'un segment
# ==========================================================
def predict_segment(segment: np.ndarray, model) -> float:
    spec = audio_to_spectrogram(segment)
    x = spec[np.newaxis, ..., np.newaxis]
    pred = model.predict(x, verbose=0)
    p = float(pred[0][0])

    # ─── LOG TEMPORAIRE ───
    print(f"[DEBUG] spec  shape={spec.shape}  min={spec.min():.3f}  max={spec.max():.3f}  mean={spec.mean():.3f}")
    print(f"[DEBUG] proba brute = {p:.6f}")
    # ──────────────────────

    return p


# ==========================================================
# Prédiction d'un fichier audio complet
# ==========================================================
def predict(audio_path: str | Path) -> Dict[str, Any]:
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {audio_path}")

    # 1. Chargement
    y, _ = librosa.load(str(audio_path), sr=SR)
    duration = len(y) / SR

    # 2. Refus si < 1 s
    if duration < SEGMENT_SEC:
        raise ValueError(
            f"Audio trop court ({duration:.2f} s). "
            f"Durée minimale requise : {SEGMENT_SEC} s."
        )

    # 3. Modèle
    model = get_loaded_model()
    if model is None:
        raise RuntimeError("Modèle IA indisponible.")

    # 4. Segmentation (1 sec)
    segments = segment_audio(y, SR, SEGMENT_SEC)
    print(f"[DEBUG] Fichier={audio_path.name}  durée={duration:.2f}s  segments={len(segments)}")

    if not segments:
        raise ValueError("Aucun segment d'une seconde exploitable.")

    # 5. Prédiction segment par segment
    probs = [predict_segment(s, model) for s in segments]

    votes    = [1 if p >= THRESHOLD else 0 for p in probs]
    n_total  = len(votes)
    n_malade = sum(votes)
    n_sain   = n_total - n_malade

    # ----- Cas 1 segment : confiance = probabilité réelle du modèle -----
    if n_total == 1:
        p = probs[0]
        if p >= THRESHOLD:
            result     = "Malade"
            confidence = p                       # ex : 0.6005
        else:
            result     = "Sain"
            confidence = 1 - p

    # ----- Cas multi-segments : vote majoritaire × certitude moyenne -----
    else:
        mean_p = float(np.mean(probs))
        if n_malade > n_total / 2:
            result     = "Malade"
            confidence = (n_malade / n_total) * mean_p
        else:
            result     = "Sain"
            confidence = (n_sain / n_total) * (1 - mean_p)

    return {
        "result":      result,
        "confidence":  round(confidence, 2),   # en %
        "probability": round(float(np.mean(probs)), 4),
        "n_segments":  n_total,
        "n_malade":    n_malade,
        "n_sain":      n_sain,
        "duration":    round(duration, 2),
    }