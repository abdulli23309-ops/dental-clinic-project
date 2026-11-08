"""Add phone_normalized, booking source and lead link, clinic_services table, and show_patients_treated

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-18 10:30:00.000000

"""
from typing import Sequence, Union
import re
from alembic import op
import sqlalchemy as sa


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalize_pakistan_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return ""
    if digits.startswith("0092"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = "92" + digits[1:]
    elif digits.startswith("3") and len(digits) == 10:
        digits = "92" + digits
    elif not digits.startswith("92") and len(digits) >= 7:
        digits = "92" + digits
    return digits


def upgrade() -> None:
    # 1. phone_normalized on leads
    op.add_column("leads", sa.Column("phone_normalized", sa.String(50), nullable=False, server_default=""))
    op.create_index("ix_leads_phone_normalized", "leads", ["phone_normalized"])

    # 2. phone_normalized on patients
    op.add_column("patients", sa.Column("phone_normalized", sa.String(50), nullable=False, server_default=""))
    op.create_index("ix_patients_phone_normalized", "patients", ["phone_normalized"])

    # 3. bookings enhancements
    op.add_column("bookings", sa.Column("phone_normalized", sa.String(50), nullable=False, server_default=""))
    op.create_index("ix_bookings_phone_normalized", "bookings", ["phone_normalized"])
    op.add_column("bookings", sa.Column("lead_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_bookings_lead_id_leads", "bookings", "leads", ["lead_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_bookings_lead_id", "bookings", ["lead_id"])
    op.add_column("bookings", sa.Column("source", sa.String(50), nullable=False, server_default="reception"))
    op.alter_column("bookings", "patient_email", existing_type=sa.String(255), nullable=True)

    # 4. team_members show_patients_treated
    op.add_column("team_members", sa.Column("show_patients_treated", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    # 5. clinic_services table
    op.create_table(
        "clinic_services",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clinic_id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_clinic_services"),
        sa.ForeignKeyConstraint(["clinic_id"], ["clinics.id"], name="fk_clinic_services_clinic_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], name="fk_clinic_services_service_id", ondelete="CASCADE"),
        sa.UniqueConstraint("clinic_id", "service_id", name="uq_clinic_services_clinic_service"),
    )
    op.create_index("ix_clinic_services_clinic_id", "clinic_services", ["clinic_id"])
    op.create_index("ix_clinic_services_service_id", "clinic_services", ["service_id"])

    # 6. Backfill existing phone numbers
    conn = op.get_bind()
    for row in conn.execute(sa.text("SELECT id, phone FROM patients")).fetchall():
        pid, ph = row[0], row[1]
        norm = _normalize_pakistan_phone(ph)
        conn.execute(sa.text("UPDATE patients SET phone_normalized = :norm WHERE id = :id"), {"norm": norm, "id": pid})

    for row in conn.execute(sa.text("SELECT id, patient_phone FROM bookings")).fetchall():
        bid, ph = row[0], row[1]
        norm = _normalize_pakistan_phone(ph)
        conn.execute(sa.text("UPDATE bookings SET phone_normalized = :norm WHERE id = :id"), {"norm": norm, "id": bid})

    for row in conn.execute(sa.text("SELECT id, phone FROM leads")).fetchall():
        lid, ph = row[0], row[1]
        norm = _normalize_pakistan_phone(ph)
        conn.execute(sa.text("UPDATE leads SET phone_normalized = :norm WHERE id = :id"), {"norm": norm, "id": lid})

    # 7. Backfill clinic_services: every active service linked to every active clinic
    conn.execute(sa.text("""
        INSERT INTO clinic_services (id, clinic_id, service_id, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), c.id, s.id, true, now(), now()
        FROM clinics c
        CROSS JOIN services s
        WHERE s.is_active = true
        ON CONFLICT DO NOTHING
    """))


def downgrade() -> None:
    op.drop_index("ix_clinic_services_service_id", table_name="clinic_services")
    op.drop_index("ix_clinic_services_clinic_id", table_name="clinic_services")
    op.drop_table("clinic_services")

    op.drop_column("team_members", "show_patients_treated")

    # Ensure patient_email is not null before restoring NOT NULL constraint
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE bookings SET patient_email = 'unknown@marlowdental.com' WHERE patient_email IS NULL"))
    op.alter_column("bookings", "patient_email", existing_type=sa.String(255), nullable=False)
    op.drop_column("bookings", "source")
    op.drop_constraint("fk_bookings_lead_id_leads", "bookings", type_="foreignkey")
    op.drop_index("ix_bookings_lead_id", table_name="bookings")
    op.drop_column("bookings", "lead_id")
    op.drop_index("ix_bookings_phone_normalized", table_name="bookings")
    op.drop_column("bookings", "phone_normalized")

    op.drop_index("ix_patients_phone_normalized", table_name="patients")
    op.drop_column("patients", "phone_normalized")

    op.drop_index("ix_leads_phone_normalized", table_name="leads")
    op.drop_column("leads", "phone_normalized")
