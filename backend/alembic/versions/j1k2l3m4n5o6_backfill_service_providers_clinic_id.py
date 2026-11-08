"""backfill service_providers clinic_id

Revision ID: j1k2l3m4n5o6
Revises: h2i3j4k5l6m7_decouple_clinical_authorship
Create Date: 2026-11-05 09:50:00.000000

Backfills service_providers.clinic_id from team_members.clinic_id for unscoped
rows (where clinic_id IS NULL) under strict validation:
1. team_members.clinic_id is not NULL.
2. The branch actively offers that procedure in clinic_services (is_active = True).
3. The backfill does not collide with an existing row for (team_member_id, service_id, tm.clinic_id).

Rows are skipped if:
- team_members.clinic_id is NULL.
- Branch does not offer that service in clinic_services.
- An explicit scoped row for (team_member_id, service_id, clinic_id) already exists.

Idempotent. No-op downgrade.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "j1k2l3m4n5o6"
down_revision: Union[str, None] = "h2i3j4k5l6m7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Pre-backfill count check
    null_before = conn.execute(
        sa.text("SELECT count(*) FROM service_providers WHERE clinic_id IS NULL")
    ).scalar()

    # Idempotent backfill with branch offering validation and collision avoidance
    backfill_stmt = sa.text("""
        UPDATE service_providers
        SET clinic_id = tm.clinic_id,
            updated_at = NOW()
        FROM team_members tm, clinic_services cs
        WHERE service_providers.team_member_id = tm.id
          AND cs.clinic_id = tm.clinic_id
          AND cs.service_id = service_providers.service_id
          AND cs.is_active = TRUE
          AND service_providers.clinic_id IS NULL
          AND tm.clinic_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM service_providers existing
              WHERE existing.team_member_id = service_providers.team_member_id
                AND existing.service_id = service_providers.service_id
                AND existing.clinic_id = tm.clinic_id
          );
    """)
    result = conn.execute(backfill_stmt)

    null_after = conn.execute(
        sa.text("SELECT count(*) FROM service_providers WHERE clinic_id IS NULL")
    ).scalar()

    print(
        f"[MIGRATION j1k2l3m4n5o6] Backfill complete. "
        f"Rows updated: {result.rowcount}. "
        f"Unscoped rows before: {null_before}, after: {null_after}."
    )


def downgrade() -> None:
    # No-op downgrade: Reverting backfilled clinic_id values would destroy valid branch
    # authorizations established during the backfill. If rollback is necessary,
    # restore from a verified pre-migration database snapshot.
    pass

