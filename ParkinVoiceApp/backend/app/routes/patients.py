# app/routes/patients.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime, timedelta
from ..database import get_db
from ..models import Patient, User, Prediction
from ..auth import (
    get_current_user, get_current_patient, authenticate_patient,
    create_access_token, get_password_hash, verify_password
)
from ..schemas import (
    PatientLogin, PatientCreate, PatientRegister, PatientUpdate,
    PatientSelfUpdate, PatientPasswordUpdate
)
from ..config import settings

router = APIRouter(prefix="/patients", tags=["patients"])
patient_auth_router = APIRouter(prefix="/patient", tags=["patient"])


# ============================================================
# AUTHENTIFICATION PATIENT
# ============================================================

@patient_auth_router.post("/login", response_model=dict)
async def patient_login(request: PatientLogin, db: Session = Depends(get_db)):
    patient = authenticate_patient(db, request.email, request.password)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    token = create_access_token(
        {"sub": str(patient.id), "type": "patient"},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "patient",
        "patient": patient_payload(patient)
    }


@patient_auth_router.post("/register", response_model=dict)
async def patient_register(request: PatientRegister, db: Session = Depends(get_db)):
    """Creer ou activer le compte patient en le rattachant a un medecin."""
    doctor = db.query(User).filter(User.email == request.doctor_email).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medecin introuvable. Verifiez son adresse email"
        )
    
    patient = db.query(Patient).filter(Patient.email == request.email).first()
    
    if patient and patient.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe deja pour cet email"
        )
    
    if patient and (
        patient.first_name.strip().lower() != request.first_name.strip().lower()
        or patient.last_name.strip().lower() != request.last_name.strip().lower()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les informations ne correspondent pas au dossier patient"
        )
    
    if patient and request.birth_date and patient.birth_date and patient.birth_date != request.birth_date.isoformat():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date de naissance ne correspond pas au dossier patient"
        )
    
    if patient:
        patient.hashed_password = get_password_hash(request.password)
        if request.birth_date:
            patient.birth_date = request.birth_date.isoformat()
    else:
        patient = Patient(
            first_name=request.first_name,
            last_name=request.last_name,
            birth_date=request.birth_date.isoformat() if request.birth_date else None,
            gender=request.gender,
            phone=request.phone,
            email=request.email,
            notes=request.notes,
            hashed_password=get_password_hash(request.password),
            doctor_id=doctor.id,
        )
        db.add(patient)
    
    db.commit()
    return {"message": "Compte patient active. Vous pouvez maintenant vous connecter."}


@patient_auth_router.get("/me", response_model=dict)
async def patient_profile(current_patient: Patient = Depends(get_current_patient)):
    return patient_payload(current_patient)


@patient_auth_router.put("/profile", response_model=dict)
async def update_patient_profile(
    data: PatientSelfUpdate,
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient)
):
    """Mettre a jour le profil du patient connecte"""
    if data.email and data.email != current_patient.email:
        existing = db.query(Patient).filter(
            Patient.email == data.email,
            Patient.id != current_patient.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet email est deja utilise par un autre compte"
            )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_patient, field, value)

    db.commit()
    db.refresh(current_patient)
    return patient_payload(current_patient)


@patient_auth_router.post("/profile-image", response_model=dict)
async def upload_patient_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient)
):
    """Uploader une photo de profil patient"""
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d'image non supporte (JPEG, PNG, WEBP)"
        )
    
    upload_dir = os.path.join(settings.UPLOAD_DIR, "profiles")
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Extension d'image non supportee"
        )
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image trop volumineuse (5 Mo maximum)"
        )
    
    filename = f"patient_{current_patient.id}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    
    current_patient.profile_image = filename
    db.commit()
    db.refresh(current_patient)
    
    return {
        "message": "Photo de profil mise a jour",
        "profile_image": filename
    }


@patient_auth_router.put("/password", response_model=dict)
async def update_patient_password(
    data: PatientPasswordUpdate,
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient)
):
    """Changer le mot de passe du patient"""
    if not current_patient.hashed_password or not verify_password(data.old_password, current_patient.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ancien mot de passe incorrect"
        )
    
    current_patient.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Mot de passe modifie avec succes"}


@patient_auth_router.get("/predictions", response_model=List[dict])
async def patient_predictions(
    db: Session = Depends(get_db),
    current_patient: Patient = Depends(get_current_patient),
):
    preds = db.query(Prediction).filter(
        Prediction.patient_id == current_patient.id,
        Prediction.is_shared_with_patient == True
    ).order_by(Prediction.created_at.desc()).all()

    return [
        {
            "id": item.id,
            "result": item.result,
            "probability": item.probability,
            "confidence": item.confidence,
            "duration": item.duration,
            "notes": item.notes,
            "doctor_name": item.doctor.full_name if item.doctor else "Médecin",
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in preds
    ]


def patient_payload(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "email": patient.email,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "full_name": f"{patient.first_name} {patient.last_name}",
        "birth_date": patient.birth_date,
        "gender": patient.gender,
        "phone": patient.phone,
        "profile_image": getattr(patient, "profile_image", None),
        "has_account": bool(patient.hashed_password and patient.is_active),
        "doctor_id": patient.doctor_id,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
        "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
    }


# ============================================================
# GESTION DES PATIENTS (COTE MEDECIN)
# ============================================================

@router.get("", response_model=List[dict])
async def get_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recuperer tous les patients du medecin connecte avec le nombre d'analyses"""
    patients = db.query(Patient).filter(
        Patient.doctor_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    result = []
    for p in patients:
        analyses_count = db.query(Prediction).filter(
            Prediction.patient_id == p.id
        ).count()
        
        result.append({
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "birth_date": p.birth_date,
            "gender": p.gender,
            "phone": p.phone,
            "email": p.email,
            "notes": p.notes,
            "profile_image": p.profile_image,
            "has_account": bool(p.hashed_password and p.is_active),
            "is_healthy": p.is_healthy,
            "total_analyses": analyses_count,        })
    
    return result


@router.post("", response_model=dict)
async def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creer un nouveau patient"""
    if patient_data.email and db.query(Patient).filter(Patient.email == patient_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email patient est deja utilise"
        )

    patient = Patient(
        first_name=patient_data.first_name,
        last_name=patient_data.last_name,
        birth_date=patient_data.birth_date.isoformat() if patient_data.birth_date else None,
        gender=patient_data.gender,
        phone=patient_data.phone,
        email=patient_data.email,
        notes=patient_data.notes,
        hashed_password=get_password_hash(patient_data.password) if patient_data.password else None,
        doctor_id=current_user.id
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    return {
        "id": patient.id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "birth_date": patient.birth_date,
        "gender": patient.gender,
        "phone": patient.phone,
        "email": patient.email,
        "notes": patient.notes,
        "profile_image": patient.profile_image,
        "doctor_id": patient.doctor_id,
        "created_at": patient.created_at.isoformat() if patient.created_at else None
    }


@router.get("/{patient_id}", response_model=dict)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recuperer un patient specifique"""
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouve")
    
    return {
        "id": patient.id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "birth_date": patient.birth_date,
        "gender": patient.gender,
        "phone": patient.phone,
        "email": patient.email,
        "notes": patient.notes,
        "profile_image": patient.profile_image,
        "has_account": bool(patient.hashed_password and patient.is_active),
        "doctor_id": patient.doctor_id,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
        "updated_at": patient.updated_at.isoformat() if patient.updated_at else None
    }


@router.put("/{patient_id}", response_model=dict)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mettre a jour un patient"""
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouve")
    
    for field, value in patient_data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value.isoformat() if field == "birth_date" and value else value)
    
    db.commit()
    db.refresh(patient)
    
    return {
        "id": patient.id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "birth_date": patient.birth_date,
        "gender": patient.gender,
        "phone": patient.phone,
        "email": patient.email,
        "notes": patient.notes,
        "profile_image": patient.profile_image,
        "has_account": bool(patient.hashed_password and patient.is_active),
        "doctor_id": patient.doctor_id,
        "created_at": patient.created_at.isoformat() if patient.created_at else None
    }


@router.delete("/{patient_id}", response_model=dict)
async def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer un patient"""
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouve")
    
    db.delete(patient)
    db.commit()
    
    return {"message": "Patient supprime avec succes"}


@router.get("/{patient_id}/analyses", response_model=List[dict])
async def get_patient_analyses(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recuperer les analyses d'un patient"""
    predictions = db.query(Prediction).filter(
        Prediction.patient_id == patient_id,
        Prediction.doctor_id == current_user.id
    ).order_by(Prediction.created_at.desc()).all()
    
    return [
        {
            "id": p.id,
            "patient_id": p.patient_id,
            "result": p.result,
            "confidence": p.confidence,
            "probability": p.probability,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in predictions
    ]