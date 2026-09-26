"""create appointments table

Revision ID: 0001_initial_appointments
Revises:
Create Date: 2026-09-26 14:50:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_appointments"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "appointments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("confirmation_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="requested", nullable=False),
        sa.Column("service_id", sa.Text(), nullable=False),
        sa.Column("preferred_date", sa.Date(), nullable=False),
        sa.Column("preferred_time", sa.Text(), nullable=False),
        sa.Column("patient_full_name", sa.Text(), nullable=False),
        sa.Column("patient_phone", sa.Text(), nullable=False),
        sa.Column("patient_email", sa.Text(), nullable=False),
        sa.Column("has_insurance", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("insurance_provider", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("utm_source", sa.Text(), nullable=True),
        sa.Column("utm_campaign", sa.Text(), nullable=True),
        sa.Column("staff_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_appointments"),
        sa.UniqueConstraint("confirmation_id", name="uq_appointments_confirmation_id"),
    )

    op.create_index(
        "ix_appointments_confirmation_id",
        "appointments",
        ["confirmation_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_preferred_date",
        "appointments",
        ["preferred_date"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_status_created_at",
        "appointments",
        ["status", sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_appointments_status_created_at", table_name="appointments")
    op.drop_index("ix_appointments_preferred_date", table_name="appointments")
    op.drop_index("ix_appointments_confirmation_id", table_name="appointments")
    op.drop_table("appointments")
