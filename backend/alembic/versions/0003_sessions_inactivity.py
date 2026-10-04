"""add user sessions and inactivity settings

Revision ID: 0003_sessions_inactivity
Revises: 0002_admin_auth_and_clinic_cms
Create Date: 2026-10-03 16:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = "0003_sessions_inactivity"
down_revision: Union[str, None] = "0002_admin_auth_and_clinic_cms"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add inactivity fields to users table
    op.add_column(
        "users",
        sa.Column("inactivity_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("inactivity_timeout_minutes", sa.Integer(), server_default=sa.text("15"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("inactivity_warning_seconds", sa.Integer(), server_default=sa.text("60"), nullable=False),
    )

    # 2. Create user_sessions table
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_address", sa.String(length=50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_user_sessions"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_sessions_user_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])

    # 3. Add session_id and revoked_at to refresh_tokens table
    op.add_column(
        "refresh_tokens",
        sa.Column("session_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "refresh_tokens",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_refresh_tokens_session_id",
        "refresh_tokens",
        "user_sessions",
        ["session_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_refresh_tokens_session_id", "refresh_tokens", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_session_id", table_name="refresh_tokens")
    op.drop_constraint("fk_refresh_tokens_session_id", "refresh_tokens", type_="foreignkey")
    op.drop_column("refresh_tokens", "revoked_at")
    op.drop_column("refresh_tokens", "session_id")

    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")

    op.drop_column("users", "inactivity_warning_seconds")
    op.drop_column("users", "inactivity_timeout_minutes")
    op.drop_column("users", "inactivity_enabled")
