"""Associate orphaned clinic_working_hours with primary clinic

Revision ID: c1a2b3d4e5f6
Revises: 89c19b307e61
Create Date: 2026-10-25 18:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, None] = '89c19b307e61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Associate orphaned working hours rows (clinic_id IS NULL) with primary clinic
    op.execute(
        """
        UPDATE clinic_working_hours
        SET clinic_id = (
            SELECT id FROM clinics
            WHERE is_active = true
            ORDER BY is_primary DESC, display_order ASC, created_at ASC
            LIMIT 1
        )
        WHERE clinic_id IS NULL;
        """
    )


def downgrade() -> None:
    # Revert orphaned working hours rows back to NULL clinic_id
    op.execute(
        """
        UPDATE clinic_working_hours
        SET clinic_id = NULL
        WHERE id IN (
            '26de45c4-78d1-4bfb-8672-1f20874bc1e8',
            '5a43a8a3-d8cd-4403-bea7-5ba6fd8a9edd',
            '238ca966-13fd-4ee1-8f7f-19003264d59d',
            '13271f91-b7fb-4fdc-99b0-7cc2167c6ab0',
            'f9ba58eb-346f-48c8-8377-9b05e573d655',
            '2a653d48-0ffd-4cb9-96db-188c146f56f1',
            'a0a7539e-db54-4203-bc96-305039f887d8'
        );
        """
    )
