"""Add lead_capture_tokens table and uq_leads_open_phone partial unique index

Revision ID: d4e5f6a7b8c9
Revises: c8d9e0f1a2b3
Create Date: 2026-10-18 17:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c8d9e0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create lead_capture_tokens table
    op.create_table(
        'lead_capture_tokens',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('lead_id', sa.Uuid(as_uuid=True), sa.ForeignKey('leads.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_lead_capture_tokens_lead_id', 'lead_capture_tokens', ['lead_id'])
    op.create_index('ix_lead_capture_tokens_token_hash', 'lead_capture_tokens', ['token_hash'], unique=True)

    # 2. Create partial unique index uq_leads_open_phone on leads(phone_normalized) WHERE status = 'unconverted'
    op.create_index(
        'uq_leads_open_phone',
        'leads',
        ['phone_normalized'],
        unique=True,
        postgresql_where=sa.text("status = 'unconverted'"),
        sqlite_where=sa.text("status = 'unconverted'"),
    )


def downgrade() -> None:
    op.drop_index('uq_leads_open_phone', table_name='leads')
    op.drop_index('ix_lead_capture_tokens_token_hash', table_name='lead_capture_tokens')
    op.drop_index('ix_lead_capture_tokens_lead_id', table_name='lead_capture_tokens')
    op.drop_table('lead_capture_tokens')
