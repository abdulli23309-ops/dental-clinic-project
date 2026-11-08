"""unique constraint on service_providers (team_member_id, service_id, clinic_id)

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-11-05 10:00:00.000000

Adds a UNIQUE constraint on service_providers(team_member_id, service_id, clinic_id).
Fails loudly if any duplicate combinations remain in the table.
"""

from typing import Sequence, Union
from alembic import op

revision: str = "l3m4n5o6p7q8"
down_revision: Union[str, None] = "k2l3m4n5o6p7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT_NAME = "uq_service_providers_doctor_service_clinic"


def upgrade() -> None:
    # Adds the unique constraint. If any duplicate tuples remain, PostgreSQL will fail loudly.
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        "service_providers",
        ["team_member_id", "service_id", "clinic_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        CONSTRAINT_NAME,
        "service_providers",
        type_="unique",
    )

