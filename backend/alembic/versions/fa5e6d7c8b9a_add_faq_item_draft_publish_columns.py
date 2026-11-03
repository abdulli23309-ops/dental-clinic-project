"""add is_draft, breaks_json and published_at to faq_items

Revision ID: fa5e6d7c8b9a
Revises: g1h2i3j4k5l6
Create Date: 2026-11-03 12:00:00.000000

Forward-only migration. Adds columns that the ORM (FaqItemORM) already maps
but that no previous Alembic revision provisions. Without these columns any
query against FaqItemORM fails on a database built purely through Alembic.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "fa5e6d7c8b9a"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "faq_items",
        sa.Column("is_draft", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "faq_items",
        sa.Column("breaks_json", sa.Text(), nullable=True),
    )
    op.add_column(
        "faq_items",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("faq_items", "published_at")
    op.drop_column("faq_items", "breaks_json")
    op.drop_column("faq_items", "is_draft")
