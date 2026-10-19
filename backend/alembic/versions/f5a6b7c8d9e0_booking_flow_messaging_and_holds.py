"""Add communication fields to messages, contact_holds, call_logs, and lead_events

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-10-18 11:00:00.000000

"""
from typing import Sequence, Union
import re
from alembic import op
import sqlalchemy as sa


revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, None] = 'e4f5a6b7c8d9'
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
    # 1. messages updates
    op.add_column("messages", sa.Column("direction", sa.String(20), nullable=False, server_default="outbound"))
    op.add_column("messages", sa.Column("purpose", sa.String(50), nullable=False, server_default="manual"))
    op.add_column("messages", sa.Column("lead_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_messages_lead_id_leads", "messages", "leads", ["lead_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_messages_lead_id", "messages", ["lead_id"])

    op.add_column("messages", sa.Column("phone_normalized", sa.String(50), nullable=True))
    op.create_index("ix_messages_phone_normalized", "messages", ["phone_normalized"])

    # Partial unique index on (provider, provider_message_id) where provider_message_id is not null
    op.create_index(
        "uq_messages_provider_msg_id",
        "messages",
        ["provider", "provider_message_id"],
        unique=True,
        postgresql_where=sa.text("provider_message_id IS NOT NULL"),
    )

    # Backfill phone_normalized on messages from message.phone
    conn = op.get_bind()
    for row in conn.execute(sa.text("SELECT id, phone FROM messages WHERE phone IS NOT NULL")).fetchall():
        mid, ph = row[0], row[1]
        norm = _normalize_pakistan_phone(ph)
        conn.execute(sa.text("UPDATE messages SET phone_normalized = :norm WHERE id = :id"), {"norm": norm, "id": mid})

    # 2. contact_holds table
    op.create_table(
        "contact_holds",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("phone_normalized", sa.String(50), nullable=False),
        sa.Column("held_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_contact_holds"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name="fk_contact_holds_user_id", ondelete="SET NULL"),
    )
    op.create_index("ix_contact_holds_phone_normalized", "contact_holds", ["phone_normalized"])
    op.create_index("ix_contact_holds_held_until", "contact_holds", ["held_until"])
    op.create_index("ix_contact_holds_released_at", "contact_holds", ["released_at"])

    # 3. call_logs table
    op.create_table(
        "call_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("phone_normalized", sa.String(50), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=True),
        sa.Column("patient_id", sa.Uuid(), nullable=True),
        sa.Column("booking_id", sa.Uuid(), nullable=True),
        sa.Column("outcome", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recorded_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_call_logs"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], name="fk_call_logs_lead_id", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], name="fk_call_logs_patient_id", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], name="fk_call_logs_booking_id", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"], name="fk_call_logs_user_id", ondelete="SET NULL"),
    )
    op.create_index("ix_call_logs_phone_normalized", "call_logs", ["phone_normalized"])
    op.create_index("ix_call_logs_lead_id", "call_logs", ["lead_id"])
    op.create_index("ix_call_logs_patient_id", "call_logs", ["patient_id"])
    op.create_index("ix_call_logs_booking_id", "call_logs", ["booking_id"])
    op.create_index("ix_call_logs_outcome", "call_logs", ["outcome"])

    # 4. lead_events table
    op.create_table(
        "lead_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("actor_type", sa.String(50), nullable=False),
        sa.Column("actor_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_lead_events"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], name="fk_lead_events_lead_id", ondelete="CASCADE"),
    )
    op.create_index("ix_lead_events_lead_id", "lead_events", ["lead_id"])
    op.create_index("ix_lead_events_event_type", "lead_events", ["event_type"])
    op.create_index("ix_lead_events_created_at", "lead_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_lead_events_created_at", table_name="lead_events")
    op.drop_index("ix_lead_events_event_type", table_name="lead_events")
    op.drop_index("ix_lead_events_lead_id", table_name="lead_events")
    op.drop_table("lead_events")

    op.drop_index("ix_call_logs_outcome", table_name="call_logs")
    op.drop_index("ix_call_logs_booking_id", table_name="call_logs")
    op.drop_index("ix_call_logs_patient_id", table_name="call_logs")
    op.drop_index("ix_call_logs_lead_id", table_name="call_logs")
    op.drop_index("ix_call_logs_phone_normalized", table_name="call_logs")
    op.drop_table("call_logs")

    op.drop_index("ix_contact_holds_released_at", table_name="contact_holds")
    op.drop_index("ix_contact_holds_held_until", table_name="contact_holds")
    op.drop_index("ix_contact_holds_phone_normalized", table_name="contact_holds")
    op.drop_table("contact_holds")

    op.drop_index("uq_messages_provider_msg_id", table_name="messages")
    op.drop_index("ix_messages_phone_normalized", table_name="messages")
    op.drop_column("messages", "phone_normalized")

    op.drop_constraint("fk_messages_lead_id_leads", "messages", type_="foreignkey")
    op.drop_index("ix_messages_lead_id", table_name="messages")
    op.drop_column("messages", "lead_id")
    op.drop_column("messages", "purpose")
    op.drop_column("messages", "direction")
