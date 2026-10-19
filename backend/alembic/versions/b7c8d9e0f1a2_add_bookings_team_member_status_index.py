"""Add composite index on bookings (team_member_id, status) for patientsTreated

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f2
Create Date: 2026-10-18 12:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a6b7c8d9e0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_bookings_team_member_status",
        "bookings",
        ["team_member_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_bookings_team_member_status", table_name="bookings")
