"""add image_url to locations

Revision ID: f5a6b7c8d9ea
Revises: f4a5b6c7d8e9
Create Date: 2026-10-26 15:39:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a6b7c8d9ea'
down_revision: Union[str, None] = 'f4a5b6c7d8e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'locations',
        sa.Column('image_url', sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('locations', 'image_url')
