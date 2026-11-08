"""forward-only migration: decouple clinical authorship from login accounts

Revision ID: h2i3j4k5l6m7_decouple_clinical_authorship
Revises: fa5e6d7c8b9a_add_faq_item_draft_publish_columns
Create Date: 2026-11-04 00:00:00.000000

Forward-only migration. Adds durable clinician reference columns to tables that
have ON DELETE RESTRICT foreign keys to users.id. This allows clinical attribution
to survive user account deletion without using CASCADE or NULL.

Tables affected:
- prescriptions.doctor_id        -> add historical_clinician_id (ref team_members.id)
- patient_attachments.uploaded_by -> add historical_clinician_id (ref team_members.id)
- patient_consents.obtained_by   -> add historical_clinician_id (ref team_members.id)
- treatment_plan_items.created_by_user_id -> add historical_clinician_id (ref team_members.id)
- referral_letters.doctor_id     -> add historical_clinician_id (ref team_members.id)

The new columns are nullable UUID columns referencing team_members.id. They are
initially empty. The guarded execution script populates them from users.team_member_id
before deleting user accounts, ensuring clinical authorship attribution survives
user account deletion without CASCADE or NULL.

Down-revision is intentionally left empty: this is a forward-only migration.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "fa5e6d7c8b9a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES_NEEDING_CLINICIAN_ID = [
    "prescriptions",
    "patient_attachments",
    "patient_consents",
    "treatment_plan_items",
    "referral_letters",
]

COLUMN_NAME = "historical_clinician_id"


def upgrade() -> None:
    for table in TABLES_NEEDING_CLINICIAN_ID:
        op.add_column(
            table,
            sa.Column(
                COLUMN_NAME,
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("team_members.id"),
                nullable=True,
                index=True,
                comment="Durable clinician identity preserving authorship after user account deletion",
            ),
        )


def downgrade() -> None:
    # Forward-only migration: downgrade intentionally not supported.
    # Removing these columns would risk losing clinical authorship attribution.
    pass
