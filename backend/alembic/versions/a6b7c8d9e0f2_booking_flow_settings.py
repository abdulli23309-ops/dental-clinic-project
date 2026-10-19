"""Add booking_flow_settings table and seed defaults per organization

Revision ID: a6b7c8d9e0f2
Revises: f5a6b7c8d9e0
Create Date: 2026-10-18 11:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a6b7c8d9e0f2'
down_revision: Union[str, None] = 'f5a6b7c8d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "booking_flow_settings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("followup_gaps_minutes", sa.JSON(), nullable=False, server_default='[10, 1440, 2880]'),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("cold_wait_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("hold_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("fallback_owner_user_id", sa.Uuid(), nullable=True),
        sa.Column("auto_confirm_online", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("days_shown", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("show_patients_treated", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("lead_capture_notice", sa.Text(), nullable=False, server_default="We save your details so we can help you finish booking."),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_booking_flow_settings"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name="fk_booking_flow_settings_org_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["fallback_owner_user_id"], ["users.id"], name="fk_booking_flow_settings_user_id", ondelete="SET NULL"),
        sa.UniqueConstraint("organization_id", name="uq_booking_flow_settings_org_id"),
    )
    op.create_index("ix_booking_flow_settings_org_id", "booking_flow_settings", ["organization_id"])

    # Backfill default settings for all existing organizations
    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO booking_flow_settings (
            id, organization_id, followup_gaps_minutes, max_attempts, cold_wait_hours,
            hold_minutes, fallback_owner_user_id, auto_confirm_online, days_shown,
            show_patients_treated, lead_capture_notice, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), id, '[10, 1440, 2880]'::json, 3, 24,
            30, NULL, true, 7,
            true, 'We save your details so we can help you finish booking.', now(), now()
        FROM organizations
        ON CONFLICT (organization_id) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_index("ix_booking_flow_settings_org_id", table_name="booking_flow_settings")
    op.drop_table("booking_flow_settings")
