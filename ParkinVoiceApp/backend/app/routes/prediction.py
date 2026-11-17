# app/routes/prediction.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from pathlib import Path
import shutil
import tempfile
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session

from ..ml_inference import predict
from ..database import get_db
from ..models import Prediction, Patient, User
from ..auth import get_current_user

router = APIRouter(tags=["prediction"])   # pas de prefix="/api"

ALLOWED_EXT = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
MAX_SIZE_MB = 50


@router.get("/prediction/history", response_model=List[dict])
async def get_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Historique des prédictions du médecin connecté."""
    predictions = db.query(Prediction).filter(
        Prediction.doctor_id == current_user.id
    ).order_by(Prediction.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for p in predictions:
        has_acc = False
        if p.patient_id:
            patient_rec = db.query(Patient).filter(Patient.id == p.patient_id).first()
            if patient_rec and patient_rec.hashed_password:
                has_acc = True
        results.append({
            "id": p.id,
            "result": p.result,
            "confidence": p.confidence,
            "probability": p.probability,
            "patient_id": p.patient_id,
            "patient_name": p.patient_name,
            "file_name": p.file_name,
            "duration": p.duration,
            "notes": p.notes,
            "is_shared_with_patient": getattr(p, "is_shared_with_patient", False),
            "has_account": has_acc,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return results


@router.get("/prediction/{prediction_id}", response_model=dict)
async def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer une prédiction précise."""
    prediction = db.query(Prediction).filter(
        Prediction.id == prediction_id,
        Prediction.doctor_id == current_user.id
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction non trouvée")

    has_acc = False
    if prediction.patient_id:
        patient_rec = db.query(Patient).filter(Patient.id == prediction.patient_id).first()
        if patient_rec and patient_rec.hashed_password:
            has_acc = True

    return {
        "id": prediction.id,
        "result": prediction.result,
        "confidence": prediction.confidence,
        "probability": prediction.probability,
        "patient_id": prediction.patient_id,
        "patient_name": prediction.patient_name,
        "file_name": prediction.file_name,
        "duration": prediction.duration,
        "notes": prediction.notes,
        "is_shared_with_patient": getattr(prediction, "is_shared_with_patient", False),
        "has_account": has_acc,
        "created_at": prediction.created_at.isoformat() if prediction.created_at else None,
    }


@router.post("/prediction/{prediction_id}/share", response_model=dict)
async def share_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Partager une prédiction avec le compte du patient."""
    prediction = db.query(Prediction).filter(
        Prediction.id == prediction_id,
        Prediction.doctor_id == current_user.id
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction non trouvée")

    if not prediction.patient_id:
        raise HTTPException(status_code=400, detail="Cette prédiction n'est rattachée à aucun patient")

    patient = db.query(Patient).filter(Patient.id == prediction.patient_id).first()
    if not patient or not patient.hashed_password:
        raise HTTPException(status_code=400, detail="Le patient n'a pas encore créé de compte sur l'application")

    prediction.is_shared_with_patient = True
    db.commit()
    db.refresh(prediction)

    return {
        "message": "Résultat transmis au profil du patient avec succès",
        "id": prediction.id,
        "is_shared_with_patient": True
    }


@router.delete("/prediction/{prediction_id}", response_model=dict)
async def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer une prédiction."""
    prediction = db.query(Prediction).filter(
        Prediction.id == prediction_id,
        Prediction.doctor_id == current_user.id
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction non trouvée")

    if prediction.file_path and Path(prediction.file_path).exists():
        Path(prediction.file_path).unlink(missing_ok=True)

    db.delete(prediction)
    db.commit()

    return {"message": "Prediction supprimée avec succès"}


@router.post("/predict")
@router.post("/prediction/analyze", include_in_schema=False)
async def predict_audio(
    file: UploadFile = File(...),
    patient_id: Optional[int] = Form(None),
    patient_name: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    save: bool = Form(False),
    share: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Vérification extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté ({ext}). Formats acceptés : {', '.join(sorted(ALLOWED_EXT))}"
        )

    # 2. Sauvegarde temporaire
    tmp_dir = Path(tempfile.gettempdir()) / "parkinvoice_uploads"
    tmp_dir.mkdir(exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}{ext}"

    try:
        with tmp_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)

        # 3. Vérification taille
        size_mb = tmp_path.stat().st_size / (1024 * 1024)
        if size_mb > MAX_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux ({size_mb:.1f} Mo). Maximum : {MAX_SIZE_MB} Mo."
            )

        # 4. Prédiction IA
        try:
            result = predict(tmp_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

        # 5. Résolution patient & compte
        resolved_patient_id = patient_id
        resolved_patient_name = patient_name
        has_account = False

        if resolved_patient_id:
            patient_rec = db.query(Patient).filter(Patient.id == resolved_patient_id).first()
            if patient_rec:
                resolved_patient_name = f"{patient_rec.first_name} {patient_rec.last_name}"
                if patient_rec.hashed_password and patient_rec.is_active:
                    has_account = True

        # 6. Sauvegarde de la prédiction en base
        # 6. Gestion de la sauvegarde et du partage
        if not save:
            # Ne pas enregistrer la prédiction, retourner uniquement le résultat IA
            return {
                "status": "success",
                "saved": False,
                "shared": False,
                "patient_id": resolved_patient_id,
                "patient_name": resolved_patient_name,
                "has_account": has_account,
                **result,
            }

        # Créer l'entrée de prédiction
        prediction_entry = Prediction(
            doctor_id=current_user.id,
            patient_id=resolved_patient_id,
            patient_name=resolved_patient_name,
            file_name=file.filename or "audio.wav",
            result=result.get("prediction") or result.get("result") or "Inconnu",
            probability=float(result.get("probability", 0.0)),
            confidence=float(result.get("confidence", 0.0)),
            duration=float(result.get("details", {}).get("duration", 0.0)) if isinstance(result.get("details"), dict) else None,
            notes=notes,
            is_shared_with_patient=False,
        )
        # Partage si demandé et le patient a un compte actif
        if share and resolved_patient_id:
            pat = db.query(Patient).filter(Patient.id == resolved_patient_id).first()
            if pat and pat.hashed_password and pat.is_active:
                prediction_entry.is_shared_with_patient = True
        db.add(prediction_entry)
        db.commit()
        db.refresh(prediction_entry)

        return {
            "status": "success",
            "saved": True,
            "shared": prediction_entry.is_shared_with_patient,
            "id": prediction_entry.id,
            "file_name": file.filename,
            "patient_id": resolved_patient_id,
            "patient_name": resolved_patient_name,
            "has_account": has_account,
            **result,
        }

    finally:
        if tmp_path.exists():
            tmp_path.unlink()