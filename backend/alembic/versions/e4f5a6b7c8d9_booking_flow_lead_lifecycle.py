"""Add lead lifecycle fields, migrate statuses to unconverted, and seed lead sources

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-10-18 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_LEAD_SOURCES = [
    "website_abandon",
    "website_booking",
    "whatsapp_message",
    "whatsapp_missed_call",
    "phone_missed_call",
    "call_desk",
    "manual",
]


def upgrade() -> None:
    # 1. New lead columns
    op.add_column("leads", sa.Column("service_id", sa.String(100), nullable=True))
    op.add_column("leads", sa.Column("team_member_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_leads_team_member_id_team_members", "leads", "team_members", ["team_member_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_leads_team_member_id", "leads", ["team_member_id"])

    op.add_column("leads", sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("leads", sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_leads_next_attempt_at", "leads", ["next_attempt_at"])
    op.add_column("leads", sa.Column("cold_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("capture_token", sa.String(64), nullable=True))
    op.create_index("ix_leads_capture_token", "leads", ["capture_token"], unique=True)
    op.add_column("leads", sa.Column("consent_notice_version", sa.String(50), nullable=True))

    # 2. Change server_default for status to 'unconverted'
    op.alter_column("leads", "status", server_default="unconverted")

    # 3. Status migration per spec: new, contacted, qualified -> unconverted
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE leads
        SET status = 'unconverted'
        WHERE status IN ('new', 'contacted', 'qualified')
    """))

    # Backfill capture_token for existing leads
    conn.execute(sa.text("""
        UPDATE leads
        SET capture_token = substr(md5(random()::text || id::text), 1, 32)
        WHERE capture_token IS NULL
    """))

    # 4. Seed lead_sources per spec
    for src in SPEC_LEAD_SOURCES:
        conn.execute(sa.text("""
            INSERT INTO lead_sources (id, name, utm_source, is_active, created_at)
            SELECT gen_random_uuid(), CAST(:src_name AS varchar), CAST(:src_utm AS varchar), true, now()
            WHERE NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = CAST(:src_chk AS varchar))
        """), {"src_name": src, "src_utm": src, "src_chk": src})


def downgrade() -> None:
    conn = op.get_bind()

    # Roll back lead_sources seeded rows
    for src in SPEC_LEAD_SOURCES:
        conn.execute(sa.text("DELETE FROM lead_sources WHERE name = CAST(:src_name AS varchar)"), {"src_name": src})

    # Roll back status migration
    conn.execute(sa.text("""
        UPDATE leads
        SET status = 'new'
        WHERE status = 'unconverted'
    """))
    op.alter_column("leads", "status", server_default="new")

    op.drop_index("ix_leads_capture_token", table_name="leads")
    op.drop_column("leads", "consent_notice_version")
    op.drop_column("leads", "capture_token")
    op.drop_column("leads", "last_activity_at")
    op.drop_column("leads", "cold_at")
    op.drop_index("ix_leads_next_attempt_at", table_name="leads")
    op.drop_column("leads", "next_attempt_at")
    op.drop_column("leads", "last_contacted_at")
    op.drop_column("leads", "attempts")

    op.drop_constraint("fk_leads_team_member_id_team_members", "leads", type_="foreignkey")
    op.drop_index("ix_leads_team_member_id", table_name="leads")
    op.drop_column("leads", "team_member_id")
    op.drop_column("leads", "service_id")
