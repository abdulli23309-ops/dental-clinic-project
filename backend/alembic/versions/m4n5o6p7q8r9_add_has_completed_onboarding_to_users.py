"""add has_completed_onboarding to users

Revision ID: m4n5o6p7q8r9
Revises: l3m4n5o6p7q8
Create Date: 2026-11-10 21:55:00.000000

Adds has_completed_onboarding flag to users table and sets existing users to true.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "m4n5o6p7q8r9"
down_revision: Union[str, None] = "l3m4n5o6p7q8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "has_completed_onboarding",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Existing users (including admins) have already completed onboarding
    op.execute("UPDATE users SET has_completed_onboarding = true")


def downgrade() -> None:
    op.drop_column("users", "has_completed_onboarding")

