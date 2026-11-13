"""Idempotent seed script for clinic FAQ items.

Seeds standard dental clinic FAQs into the faq_items table if not already present.
Does NOT run automatically on startup (Rule 3).

Usage:
    python -m app.scripts.seed_faqs           # Seed missing FAQs (idempotent)
    python -m app.scripts.seed_faqs --dry-run # Preview what would be seeded
"""

import argparse
import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select

from app.core.database import get_session_factory
from app.infrastructure.database.orm_models import FaqItemORM

DEFAULT_FAQS = [
    {
        "category": "general",
        "question": "How often should I visit the dentist for a routine checkup and cleaning?",
        "answer": "We recommend scheduling a comprehensive dental examination and professional cleaning every six months to maintain optimal oral health.",
        "display_order": 1,
    },
    {
        "category": "treatments",
        "question": "Are dental implants painful during the procedure?",
        "answer": "Dental implant procedures are performed under gentle local anesthesia to ensure complete patient comfort and anxiety-free treatment.",
        "display_order": 2,
    },
    {
        "category": "emergency",
        "question": "What should I do in case of a dental emergency?",
        "answer": "Contact our emergency triage line immediately. We offer same-day emergency appointments for severe toothaches, knocked-out teeth, and acute dental trauma.",
        "display_order": 3,
    },
    {
        "category": "treatments",
        "question": "How do Invisalign clear aligners compare to traditional metal braces?",
        "answer": "Invisalign aligners are virtually invisible, removable for eating and brushing, and engineered with SmartTrack material for faster, more comfortable orthodontic alignment.",
        "display_order": 4,
    },
    {
        "category": "pricing",
        "question": "Do you offer consultations and flexible payment options?",
        "answer": "Yes, we provide transparent treatment plans with detailed cost breakdowns before any procedure begins, along with flexible installment options.",
        "display_order": 5,
    },
    {
        "category": "appointments",
        "question": "How can I book or reschedule an appointment?",
        "answer": "You can book instantly online through our 24/7 appointment portal, or call our clinic reception desk. Rescheduling is complimentary up to 24 hours prior to your visit.",
        "display_order": 6,
    },
]


async def seed_faqs(dry_run: bool = False) -> int:
    session_factory = get_session_factory()
    created_count = 0

    async with session_factory() as session:
        # Fetch existing questions
        result = await session.execute(select(FaqItemORM.question))
        existing_questions = set(result.scalars().all())

        to_insert = [faq for faq in DEFAULT_FAQS if faq["question"] not in existing_questions]

        print("=" * 60)
        print("CLINIC FAQ SEED UTILITY")
        print("=" * 60)
        print(f"Existing FAQs in database: {len(existing_questions)}")
        print(f"New FAQs to seed: {len(to_insert)}")
        print("-" * 60)

        for faq in to_insert:
            print(f"  + [{faq['category']}] {faq['question']}")

        if dry_run:
            print("-" * 60)
            print("[DRY-RUN] No changes were made. Run without --dry-run to seed FAQs.")
            print("=" * 60)
            return len(to_insert)

        now = datetime.now(timezone.utc)
        for faq in to_insert:
            new_item = FaqItemORM(
                id=uuid4(),
                category=faq["category"],
                question=faq["question"],
                answer=faq["answer"],
                display_order=faq["display_order"],
                is_active=True,
                is_draft=False,
                published_at=now,
                created_at=now,
                updated_at=now,
            )
            session.add(new_item)
            created_count += 1

        if created_count > 0:
            await session.commit()
            print("-" * 60)
            print(f"[SUCCESS] Successfully seeded {created_count} FAQ items.")
        else:
            print("-" * 60)
            print("[INFO] All default FAQ items are already present. No mutations performed.")

        print("=" * 60)
        return created_count


def main():
    parser = argparse.ArgumentParser(description="Seed standard dental clinic FAQ items idempotently.")
    parser.add_argument("--dry-run", action="store_true", help="Preview FAQs to be seeded without inserting.")
    args = parser.parse_args()

    asyncio.run(seed_faqs(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
