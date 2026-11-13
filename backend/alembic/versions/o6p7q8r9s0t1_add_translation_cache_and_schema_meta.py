"""add translation_cache and schema_meta tables

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-11-13 21:00:00.000000

Creates the translation_cache table for live Urdu neural translations
and schema_meta table for versioned one-time data operations.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "o6p7q8r9s0t1"
down_revision: Union[str, None] = "n5o6p7q8r9s0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create translation_cache if it does not already exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "translation_cache" not in tables:
        op.create_table(
            "translation_cache",
            sa.Column("hash_key", sa.String(length=64), primary_key=True, index=True),
            sa.Column("source_lang", sa.String(length=10), nullable=False, server_default="en"),
            sa.Column("target_lang", sa.String(length=10), nullable=False, server_default="ur"),
            sa.Column("source_text", sa.Text(), nullable=False),
            sa.Column("translated_text", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="auto"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 2. Create schema_meta for one-time migrations and cache version tracking
    if "schema_meta" not in tables:
        op.create_table(
            "schema_meta",
            sa.Column("key", sa.String(length=100), primary_key=True),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("translation_cache")
    op.drop_table("schema_meta")
