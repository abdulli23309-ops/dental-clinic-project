#!/usr/bin/env python3
"""Guarded purge of the 58 non-admin staff/test accounts.

This script is intentionally narrow: it deletes only the requested non-admin user rows and
keeps the protected admin plus the two live doctor logins intact.

Guard conditions enforced:
- the protected admin email is always excluded
- doctor@hiradental.com and dr.hira@hiradental.com are never targeted
- exact requested target set must be present before delete
- all deletes occur in a single Postgres transaction and are rolled back on error
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from sqlalchemy import text
from app.core.database import get_session_factory

PROTECTED_EMAIL = "admin@hiradental.com"
RETAINED_EMAILS = {
    PROTECTED_EMAIL,
    "doctor@hiradental.com",
    "dr.hira@hiradental.com",
}
TARGET_EMAILS = [
    "admin_concurrent_0de42d@hiradental.com",
    "admin_concurrent_109191@hiradental.com",
    "admin_concurrent_12aacd@hiradental.com",
    "admin_concurrent_13057f@hiradental.com",
    "admin_concurrent_1be2db@marlowdental.com",
    "admin_concurrent_1ccc0a@hiradental.com",
    "admin_concurrent_2414c9@hiradental.com",
    "admin_concurrent_2773f4@marlowdental.com",
    "admin_concurrent_2a5512@hiradental.com",
    "admin_concurrent_2a738b@hiradental.com",
    "admin_concurrent_306ffe@hiradental.com",
    "admin_concurrent_39ecac@hiradental.com",
    "admin_concurrent_3bbe77@marlowdental.com",
    "admin_concurrent_3cd35f@hiradental.com",
    "admin_concurrent_3f2359@hiradental.com",
    "admin_concurrent_43f01b@marlowdental.com",
    "admin_concurrent_5632ae@marlowdental.com",
    "admin_concurrent_56f9ff@hiradental.com",
    "admin_concurrent_57d221@marlowdental.com",
    "admin_concurrent_588571@marlowdental.com",
    "admin_concurrent_5c6ae2@hiradental.com",
    "admin_concurrent_5f1c7f@hiradental.com",
    "admin_concurrent_647a60@hiradental.com",
    "admin_concurrent_7470d2@hiradental.com",
    "admin_concurrent_85742d@hiradental.com",
    "admin_concurrent_8fe83a@marlowdental.com",
    "admin_concurrent_91be42@marlowdental.com",
    "admin_concurrent_930f4a@hiradental.com",
    "admin_concurrent_994b2d@marlowdental.com",
    "admin_concurrent_9b6ab5@hiradental.com",
    "admin_concurrent_9d0ffd@hiradental.com",
    "admin_concurrent_9e5cff@hiradental.com",
    "admin_concurrent_a3cebb@hiradental.com",
    "admin_concurrent_a3d714@marlowdental.com",
    "admin_concurrent_a84aaf@hiradental.com",
    "admin_concurrent_b6084c@hiradental.com",
    "admin_concurrent_b70337@hiradental.com",
    "admin_concurrent_bf57dc@marlowdental.com",
    "admin_concurrent_c3a694@marlowdental.com",
    "admin_concurrent_c550d4@marlowdental.com",
    "admin_concurrent_ce80e7@marlowdental.com",
    "admin_concurrent_d107b5@marlowdental.com",
    "admin_concurrent_d3661e@hiradental.com",
    "admin_concurrent_d3c279@hiradental.com",
    "admin_concurrent_d720ba@marlowdental.com",
    "admin_concurrent_d93c46@hiradental.com",
    "admin_concurrent_e1beae@hiradental.com",
    "admin_concurrent_e1feed@hiradental.com",
    "admin_concurrent_e665ac@marlowdental.com",
    "admin_concurrent_e92df7@hiradental.com",
    "admin_concurrent_edac57@marlowdental.com",
    "admin_concurrent_f3d131@marlowdental.com",
    "admin_concurrent_f75b33@hiradental.com",
    "admin_concurrent_f9c685@hiradental.com",
    "admin_concurrent_fbe538@hiradental.com",
    "admin_concurrent_fd015c@hiradental.com",
    "testadmin@hiradental.com",
    "receptionist@hiradental.com",
]

TARGET_SET = set(TARGET_EMAILS)
TARGET_COUNT = len(TARGET_EMAILS)
LOG_DIR = ROOT / "backups"
LOG_DIR.mkdir(exist_ok=True, parents=True)


def make_log_path() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return LOG_DIR / f"staff_accounts_deleted_{stamp}.log"


async def get_user_ids(session, emails: Iterable[str]) -> list[str]:
    email_list = list(emails)
    rows = (await session.execute(text("SELECT id, email FROM users WHERE email = ANY(:emails) ORDER BY email"), {"emails": email_list})).fetchall()
    return [str(r[0]) for r in rows]


async def table_count_by_user_refs(session, table: str, column_names: list[str], user_ids: list[str]) -> int:
    if not user_ids:
        return 0
    clauses = [f"{column} = ANY(:ids)" for column in column_names]
    sql = f"SELECT COUNT(*) FROM {table} WHERE {' OR '.join(clauses)}"
    return int(await session.scalar(text(sql), {"ids": user_ids}) or 0)


async def verify_initial_conditions() -> tuple[list[str], dict[str, int]]:
    factory = get_session_factory()
    async with factory() as session:
        # Guard clauses: protected admin and retained doctors must not be targeted.
        if TARGET_SET & {PROTECTED_EMAIL, "doctor@hiradental.com", "dr.hira@hiradental.com"}:
            raise RuntimeError("Guard clause failed: protected or retained login present in deletion target set.")
        if TARGET_COUNT != len(TARGET_SET):
            raise RuntimeError(f"Guard clause failed: duplicate email count mismatch ({TARGET_COUNT} vs {len(TARGET_SET)}).")

        rows = (await session.execute(text("SELECT id, email FROM users WHERE email = ANY(:emails) ORDER BY email"), {"emails": list(TARGET_SET)})).fetchall()
        found = {str(r.email) for r in rows}
        missing = sorted(TARGET_SET - found)
        if missing:
            raise RuntimeError(f"Guard clause failed: missing target emails {missing}")

        # This is the actual current user count in the live database after the previous bulk audit identified 61 total users.
        total_users = await session.scalar(text("SELECT COUNT(*) FROM users"))
        if total_users != 61:
            raise RuntimeError(f"Unexpected total user count before delete: expected 61, found {total_users}.")

        # Confirm the row counts that will be checked before/after in the FK-safe set.
        before_counts = {
            "bookings": await table_count_by_user_refs(session, "bookings", ["approved_by_user_id", "cancelled_by_user_id", "reminded_by_user_id"], [str(r[0]) for r in rows]),
            "activity_logs": await table_count_by_user_refs(session, "activity_logs", ["user_id"], [str(r[0]) for r in rows]),
            "visit_payments": await table_count_by_user_refs(session, "visit_payments", ["recorded_by_user_id", "voided_by_user_id"], [str(r[0]) for r in rows]),
            "tasks": await table_count_by_user_refs(session, "tasks", ["assigned_to_user_id", "created_by_user_id"], [str(r[0]) for r in rows]),
            "messages": await table_count_by_user_refs(session, "messages", ["sender_id", "recipient_id"], [str(r[0]) for r in rows]),
            "patient_medical_alerts": await table_count_by_user_refs(session, "patient_medical_alerts", ["recorded_by_user_id"], [str(r[0]) for r in rows]),
        }

        return [str(r[0]) for r in rows], before_counts


async def execute_deletion() -> dict[str, Any]:
    factory = get_session_factory()
    async with factory() as session:
        async with session.begin():
            target_ids = await get_user_ids(session, TARGET_EMAILS)
            if len(target_ids) != TARGET_COUNT:
                raise RuntimeError(f"Target count mismatch: expected {TARGET_COUNT} user ids, found {len(target_ids)}.")

            ids_for_sql = list(target_ids)
            target_emails = sorted((await session.execute(text("SELECT email FROM users WHERE id = ANY(:ids) ORDER BY email"), {"ids": ids_for_sql})).scalars().all())

            if any(email in RETAINED_EMAILS for email in target_emails):
                raise RuntimeError("Guard clause failed: retained account is in the target set.")
            if PROTECTED_EMAIL in target_emails:
                raise RuntimeError("Guard clause failed: protected admin email was targeted.")
            if {"doctor@hiradental.com", "dr.hira@hiradental.com"} & set(target_emails):
                raise RuntimeError("Guard clause failed: a doctor account intentionally retained by the user was targeted.")

            before_counts = {
                "bookings": await table_count_by_user_refs(session, "bookings", ["approved_by_user_id", "cancelled_by_user_id", "reminded_by_user_id"], ids_for_sql),
                "activity_logs": await table_count_by_user_refs(session, "activity_logs", ["user_id"], ids_for_sql),
                "visit_payments": await table_count_by_user_refs(session, "visit_payments", ["recorded_by_user_id", "voided_by_user_id"], ids_for_sql),
                "tasks": await table_count_by_user_refs(session, "tasks", ["assigned_to_user_id", "created_by_user_id"], ids_for_sql),
                "messages": await table_count_by_user_refs(session, "messages", ["sender_id", "recipient_id"], ids_for_sql),
                "patient_medical_alerts": await table_count_by_user_refs(session, "patient_medical_alerts", ["recorded_by_user_id"], ids_for_sql),
            }

            if not ids_for_sql:
                raise RuntimeError("Target deletion set is empty.")

            await session.execute(text("DELETE FROM user_sessions WHERE user_id = ANY(:ids)"), {"ids": ids_for_sql})
            await session.execute(text("DELETE FROM refresh_tokens WHERE user_id = ANY(:ids)"), {"ids": ids_for_sql})
            await session.execute(text("DELETE FROM users WHERE id = ANY(:ids)"), {"ids": ids_for_sql})

            remaining = await session.scalar(text("SELECT COUNT(*) FROM users"))
            session.add_all([])

            after_counts = {
                "bookings": await table_count_by_user_refs(session, "bookings", ["approved_by_user_id", "cancelled_by_user_id", "reminded_by_user_id"], ids_for_sql),
                "activity_logs": await table_count_by_user_refs(session, "activity_logs", ["user_id"], ids_for_sql),
                "visit_payments": await table_count_by_user_refs(session, "visit_payments", ["recorded_by_user_id", "voided_by_user_id"], ids_for_sql),
                "tasks": await table_count_by_user_refs(session, "tasks", ["assigned_to_user_id", "created_by_user_id"], ids_for_sql),
                "messages": await table_count_by_user_refs(session, "messages", ["sender_id", "recipient_id"], ids_for_sql),
                "patient_medical_alerts": await table_count_by_user_refs(session, "patient_medical_alerts", ["recorded_by_user_id"], ids_for_sql),
            }
            return {
                "target_ids": ids_for_sql,
                "target_emails": target_emails,
                "before_counts": before_counts,
                "after_counts": after_counts,
                "remaining_users": int(remaining),
            }


async def verify_post_delete(target_ids: list[str]) -> dict[str, Any]:
    factory = get_session_factory()
    async with factory() as session:
        remaining_users = (await session.execute(text("SELECT email FROM users ORDER BY email"))).scalars().all()
        remaining_count = await session.scalar(text("SELECT COUNT(*) FROM users"))
        sessions_after = await session.scalar(text("SELECT COUNT(*) FROM user_sessions WHERE user_id = ANY(:ids)"), {"ids": target_ids}) or 0
        refresh_after = await session.scalar(text("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ANY(:ids)"), {"ids": target_ids}) or 0
        team_member_count = await session.scalar(text("SELECT COUNT(*) FROM team_members")) or 0
        user_restrict_violations = {
            "doctor@hiradental.com": await session.scalar(text("SELECT COUNT(*) FROM prescriptions WHERE doctor_id = (SELECT id FROM users WHERE email = :email) OR signed_by_user_id = (SELECT id FROM users WHERE email = :email)"), {"email": "doctor@hiradental.com"}) or 0,
            "dr.hira@hiradental.com": await session.scalar(text("SELECT COUNT(*) FROM prescriptions WHERE doctor_id = (SELECT id FROM users WHERE email = :email) OR signed_by_user_id = (SELECT id FROM users WHERE email = :email)"), {"email": "dr.hira@hiradental.com"}) or 0,
        }
        return {
            "remaining_count": int(remaining_count),
            "remaining_emails": list(remaining_users),
            "user_sessions_after": int(sessions_after),
            "refresh_tokens_after": int(refresh_after),
            "team_member_count": int(team_member_count),
            "restrict_violations": user_restrict_violations,
        }


async def main() -> None:
    log_path = make_log_path()
    lines: list[str] = []
    try:
        target_ids, before_counts = await verify_initial_conditions()
        # The explicit target set should be all 58 requested rows and nothing else.
        if len(target_ids) != TARGET_COUNT:
            raise RuntimeError(f"Guard clause failed: expected {TARGET_COUNT} rows, found {len(target_ids)}.")

        delete_result = await execute_deletion()
        post_delete = await verify_post_delete(delete_result["target_ids"])

        if post_delete["remaining_count"] != 3:
            raise RuntimeError(f"Post-delete verification failed: expected 3 rows remaining, found {post_delete['remaining_count']}.")

        if post_delete["user_sessions_after"] != 0 or post_delete["refresh_tokens_after"] != 0:
            raise RuntimeError(f"Session/token verification failed: user_sessions={post_delete['user_sessions_after']}; refresh_tokens={post_delete['refresh_tokens_after']}.")

        if post_delete["team_member_count"] != 34:
            raise RuntimeError(f"Team member count mismatch: expected 34 after delete, found {post_delete['team_member_count']}.")

        for email in delete_result["target_emails"]:
            lines.append(f"[{datetime.now(timezone.utc).isoformat()}] {email} -> deleted")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] total_deleted={len(delete_result['target_emails'])}")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] remaining_users={post_delete['remaining_count']}")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] remaining_emails={','.join(post_delete['remaining_emails'])}")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] user_sessions_after={post_delete['user_sessions_after']}")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] refresh_tokens_after={post_delete['refresh_tokens_after']}")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] team_member_count={post_delete['team_member_count']}")
        lines.append(f"[{datetime.now(timezone.utc).isoformat()}] before_counts={json.dumps(before_counts, sort_keys=True)}")

        now = datetime.now(timezone.utc).isoformat()
        lines.insert(0, f"[{now}] backup_log_path={log_path}")
        with open(log_path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")

        print("PHASE_1_DELETE_OK")
        print(f"deleted_count={len(delete_result['target_emails'])}")
        print(f"remaining_count={post_delete['remaining_count']}")
        print(f"remaining_emails={','.join(post_delete['remaining_emails'])}")
        print(f"user_sessions_after={post_delete['user_sessions_after']}")
        print(f"refresh_tokens_after={post_delete['refresh_tokens_after']}")
        print(f"team_member_count={post_delete['team_member_count']}")
        print(f"log_path={log_path}")
        print("RESTRICT_VIOLATIONS=" + json.dumps(post_delete["restrict_violations"], sort_keys=True))

    except Exception as exc:  # pragma: no cover - runtime safety path
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(f"[{datetime.now(timezone.utc).isoformat()}] ERROR {exc}\n")
        print(f"ERROR: {exc}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
