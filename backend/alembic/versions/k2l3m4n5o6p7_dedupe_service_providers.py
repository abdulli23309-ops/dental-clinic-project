"""dedupe service_providers

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-11-05 09:55:00.000000

Dedupes rows in service_providers sharing identical (team_member_id, service_id, clinic_id).
Retains the oldest row per unique tuple (ordered by created_at ASC, id ASC).

Safety checks before deletion:
- Queries database catalog for any foreign key constraints referencing service_providers.id.
- If any dependent foreign keys are found, aborts with RuntimeError.

Downgrade restores nothing (forward-only cleanup).
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "k2l3m4n5o6p7"
down_revision: Union[str, None] = "j1k2l3m4n5o6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Pre-flight check: verify no foreign keys reference service_providers.id
    fk_check_stmt = sa.text("""
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE ccu.table_name = 'service_providers'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name != 'service_providers';
    """)
    fk_refs = conn.execute(fk_check_stmt).fetchall()
    if fk_refs:
        raise RuntimeError(
            f"[MIGRATION k2l3m4n5o6p7 ABORTED] External foreign keys reference service_providers.id: {fk_refs}. "
            "Deduplication cannot proceed safely without manual review."
        )

    # 2. Delete duplicate rows, retaining oldest by (created_at ASC, id ASC)
    dedupe_stmt = sa.text("""
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY team_member_id, service_id, clinic_id
                       ORDER BY created_at ASC, id ASC
                   ) AS rn
            FROM service_providers
            WHERE clinic_id IS NOT NULL
        )
        DELETE FROM service_providers
        WHERE id IN (
            SELECT id FROM ranked WHERE rn > 1
        );
    """)
    res = conn.execute(dedupe_stmt)
    print(f"[MIGRATION k2l3m4n5o6p7] Deduplication complete. Duplicate rows removed: {res.rowcount}.")


def downgrade() -> None:
    # Downgrade cannot safely restore discarded duplicate rows.
    # If recovery is required, restore from a verified pre-migration database snapshot.
    pass

