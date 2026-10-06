from datetime import date
from uuid import UUID
from app.domain.models.appointment import Appointment, AppointmentStatus


def test_appointment_domain_creation_and_defaults():
    apt = Appointment(
        confirmation_id="MD-2026-1001",
        service_id="cleanings-exams",
        preferred_date=date(2026, 10, 5),
        preferred_time="10:00 AM",
        patient_full_name="John Doe",
        patient_phone="3125550199",
        patient_email="john@example.com",
    )
    assert isinstance(apt.id, UUID)
    assert apt.status == AppointmentStatus.REQUESTED
    assert apt.created_at is not None
    assert apt.updated_at is not None


def test_appointment_domain_status_transitions():
    apt = Appointment(
        confirmation_id="MD-2026-1002",
        service_id="fillings-crowns",
        preferred_date=date(2026, 10, 6),
        preferred_time="11:30 AM",
        patient_full_name="Jane Doe",
        patient_phone="3125550188",
        patient_email="jane@example.com",
    )
    initial_updated = apt.updated_at

    apt.confirm(staff_note="Called patient, booked in Operatory 1.")
    assert apt.status == AppointmentStatus.CONFIRMED
    assert apt.staff_notes == "Called patient, booked in Operatory 1."
    assert apt.updated_at >= initial_updated

    apt.cancel(reason="Patient rescheduled to November.")
    assert apt.status == AppointmentStatus.CANCELLED
    assert apt.staff_notes == "Patient rescheduled to November."
