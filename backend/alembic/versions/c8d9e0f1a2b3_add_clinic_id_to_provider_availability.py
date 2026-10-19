"""Add clinic_id to provider_availability with backfill and index

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-10-18 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c8d9e0f1a2b3'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add clinic_id column
    op.add_column(
        "provider_availability",
        sa.Column(
            "clinic_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    # 2. Create index
    op.create_index(
        "ix_provider_availability_clinic_id",
        "provider_availability",
        ["clinic_id"],
    )
    # 3. Backfill from doctor's assigned clinic in team_members
    op.execute(
        """
        UPDATE provider_availability
        SET clinic_id = sub.clinic_id
        FROM (
            SELECT id, clinic_id 
            FROM team_members 
            WHERE clinic_id IS NOT NULL
        ) sub
        WHERE provider_availability.team_member_id = sub.id
          AND provider_availability.clinic_id IS NULL;
        """
    )
    # 4. Fallback for clinicians whose clinic_id was null: assign primary / first active clinic
    op.execute(
        """
        UPDATE provider_availability
        SET clinic_id = (
            SELECT id FROM clinics 
            WHERE is_active = true 
            ORDER BY is_primary DESC, created_at ASC 
            LIMIT 1
        )
        WHERE clinic_id IS NULL;
        """
    )


def downgrade() -> None:
    op.drop_index("ix_provider_availability_clinic_id", table_name="provider_availability")
    op.drop_column("provider_availability", "clinic_id")
