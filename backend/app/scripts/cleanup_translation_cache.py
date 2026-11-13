"""One-time safe cleanup script for corrupt translation_cache entries.

Scans for fused-script corruption patterns (e.g. 'Cusتمm') where Latin and Urdu
characters appear fused within a single token, while preserving reviewed translations
and unchanged source texts.

Usage:
    python -m app.scripts.cleanup_translation_cache           # Dry run (default)
    python -m app.scripts.cleanup_translation_cache --execute # Perform actual deletion
    python -m app.scripts.cleanup_translation_cache --execute --force # Force re-run if already applied
"""

import argparse
import asyncio
import re
import sys
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.core.database import get_session_factory
from app.core.logging import logger
from app.infrastructure.database.orm_models import SchemaMetaORM, TranslationCacheORM

# Regex signature: Latin letter adjacent to Arabic/Urdu alphabet character
# (e.g., Cusتمm, Dr.احمد without space, treatمنٹ).
# Excludes standard punctuation marks like Arabic comma (، \u060C) or question mark (؟ \u061F).
URDU_LETTERS = r"[\u0620-\u064A\u0671-\u06D3\u06FA-\u06FC]"
CORRUPTION_REGEX = re.compile(rf"[A-Za-z]+{URDU_LETTERS}|{URDU_LETTERS}+[A-Za-z]")

META_KEY = "corrupt_cache_cleanup_v1"


def is_corrupted(source: str, translated: str, status: str) -> bool:
    """Return True if translated string contains script fusion or legacy unvetted auto status."""
    # Rule 1: Never touch reviewed translations
    if status == "reviewed":
        return False
    # Never delete entries where translated text equals source text
    if source == translated:
        return False
    # Check for legacy unvetted auto translations or script fusion corruption
    return status == "auto" or bool(CORRUPTION_REGEX.search(translated))


async def run_cleanup(execute: bool = False, force: bool = False) -> int:
    session_factory = get_session_factory()

    async with session_factory() as session:
        # Check if already executed
        if execute and not force:
            meta_res = await session.execute(
                select(SchemaMetaORM).where(SchemaMetaORM.key == META_KEY)
            )
            existing_meta = meta_res.scalar_one_or_none()
            if existing_meta:
                print(
                    f"[NOTICE] Cache cleanup '{META_KEY}' was already applied at "
                    f"{existing_meta.applied_at}. Use --force to run again."
                )
                return 0

        # Query all cache entries
        result = await session.execute(select(TranslationCacheORM))
        all_entries = result.scalars().all()
        total_count = len(all_entries)

        corrupt_entries = [
            e for e in all_entries
            if is_corrupted(e.source_text, e.translated_text, e.status)
        ]
        corrupt_count = len(corrupt_entries)

        print("=" * 60)
        print("TRANSLATION CACHE CORRUPTION AUDIT")
        print("=" * 60)
        print(f"Total entries in cache: {total_count}")
        print(f"Corrupt entries detected: {corrupt_count}")
        print("-" * 60)

        if corrupt_count > 0:
            print("Sample corrupt entries (up to 20):")
            for idx, entry in enumerate(corrupt_entries[:20], 1):
                clean_src = (entry.source_text[:40] + "...") if len(entry.source_text) > 40 else entry.source_text
                clean_tr = (entry.translated_text[:40] + "...") if len(entry.translated_text) > 40 else entry.translated_text
                print(f"  {idx:2d}. [hash: {entry.hash_key[:8]}] '{clean_src}' -> '{clean_tr}' (status: {entry.status})")

        if not execute:
            print("-" * 60)
            print("[DRY-RUN] No changes were made. Run with --execute to remove corrupt rows.")
            print("=" * 60)
            return corrupt_count

        # Execute deletion
        if corrupt_count > 0:
            corrupt_hashes = [e.hash_key for e in corrupt_entries]
            await session.execute(
                delete(TranslationCacheORM).where(TranslationCacheORM.hash_key.in_(corrupt_hashes))
            )

        # Record in schema_meta
        meta_entry = await session.get(SchemaMetaORM, META_KEY)
        if meta_entry:
            meta_entry.value = f"Purged {corrupt_count} corrupt entries on {datetime.now(timezone.utc).isoformat()}"
            meta_entry.applied_at = datetime.now(timezone.utc)
        else:
            session.add(
                SchemaMetaORM(
                    key=META_KEY,
                    value=f"Purged {corrupt_count} corrupt entries on {datetime.now(timezone.utc).isoformat()}",
                )
            )

        await session.commit()
        print("-" * 60)
        print(f"[SUCCESS] Successfully purged {corrupt_count} corrupt rows from translation_cache.")
        print(f"[SUCCESS] Recorded completion under '{META_KEY}' in schema_meta table.")
        print("=" * 60)
        return corrupt_count


def main():
    parser = argparse.ArgumentParser(description="Audit and clean corrupt translation_cache rows.")
    parser.add_argument("--execute", action="store_true", help="Perform the actual deletion.")
    parser.add_argument("--force", action="store_true", help="Force run even if already recorded in schema_meta.")
    args = parser.parse_args()

    asyncio.run(run_cleanup(execute=args.execute, force=args.force))


if __name__ == "__main__":
    main()
