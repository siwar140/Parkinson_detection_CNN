from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean
from datetime import datetime
from typing import List, Optional

from ..database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_image: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    doctor: Mapped["User"] = relationship("User", back_populates="patients")
    predictions: Mapped[List["Prediction"]] = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Patient {self.first_name} {self.last_name}>"

    @property
    def is_healthy(self) -> bool:
        """Determine health status based on majority of patient's prediction results.
        Returns True if the majority of stored predictions have a result indicating health (e.g., "normal" or "healthy").
        The exact criteria can be adapted; here we consider any result containing the word 'normal' (case‑insensitive) as healthy.
        """
        healthy_count = 0
        unhealthy_count = 0
        for pred in self.predictions:
            if pred.result and isinstance(pred.result, str):
                lowered = pred.result.lower()
                if "normal" in lowered or "healthy" in lowered:
                    healthy_count += 1
                else:
                    unhealthy_count += 1
        # If no predictions, default to True (no evidence of disease)
        if healthy_count + unhealthy_count == 0:
            return True
        return healthy_count >= unhealthy_count
