"""
Translation Service - Layer 2 & Layer 3 of the Live English->Urdu Translation Architecture.
"""

import hashlib
import re
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.orm_models import TranslationCacheORM
from app.core.logging import logger

CREDENTIALS = ["BDS", "MDS", "FCPS", "RDS", "DDS", "MSc", "MCPS", "MS"]
LICENSE_RE = re.compile(r"#PMDC-[A-Za-z0-9-]+", re.IGNORECASE)
PHONE_RE = re.compile(r"\+?\d[\d\s\-()]{7,}\d")
PRICE_RE = re.compile(r"Rs[\.\s]?\d[\d,\.]*")
TIME_RE = re.compile(r"\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?")
DR_TITLE_RE = re.compile(r"\bDr\.?\b", re.IGNORECASE)

CLINICAL_URDU_DICT: Dict[str, str] = {
    "Dr.": "ڈاکٹر",
    "Doctor": "ڈاکٹر",
    "Founder & Lead Dentist": "بانی اور چیف ڈینٹسٹ",
    "Associate Dental Surgeon": "ایسوسی ایٹ ڈینٹل سرجن",
    "Consultant Orthodontist": "کنسلٹنٹ آرتھوڈانٹسٹ",
    "General Dentistry": "جنرل ڈینٹسٹری",
    "Cosmetic Dentistry": "کاسمیٹک ڈینٹسٹری",
    "Restorative Care": "بحالی دندان",
    "Endodontics": "روٹ کینال / اینڈوڈانٹکس",
    "Preventive": "احتیاطی علاج",
    "Restorative": "بحالی علاج",
    "Cosmetic": "کاسمیٹک",
    "Emergency": "ہنگامی علاج",
    "Orthodontics": "آرتھوڈانٹکس",
    "Oral Surgery": "اورل سرجری",
    "Pediatric": "بچوں کا علاج",
    "Verified Care": "مصدقہ طبی معیار",
    "Verified Visit": "مصدقہ مریض",
    "Book Appointment": "اپائنٹمنٹ بک کریں",
    "Book an Appointment": "اپائنٹمنٹ بک کریں",
    "Book Consultation": "مشاورت بک کریں",
    "Book": "بک کریں",
    "Call": "کال",
    "Services": "خدمات",
    "Treatments": "علاج",
    "Doctors": "ڈاکٹرز",
    "Clinicians": "ڈاکٹرز",
    "Team": "ٹیم",
    "Home": "ہوم",
    "Open Now": "ابھی کھلا ہے",
    "Closed": "بند ہے",
    "Starting Fee": "ابتدائی فیس",
    "Details": "تفصیلات",
    "Directions": "راستہ",
    "Copy": "کاپی",
    "Copied": "کاپی ہو گیا",
    "minutes": "منٹ",
    "min": "منٹ",
    "Mon - Sat": "پیر تا ہفتہ",
    "Sunday": "اتوار",
    "Islamabad": "اسلام آباد",
    "Lahore": "لاہور",
    "Karachi": "کراچی",
    "Rawalpindi": "راولپنڈی",
    "Gulberg": "گلبرگ",
    "F-7 Markaz": "ایف-7 مرکز",
    "Clifton": "کلفٹن",
    "Main": "مین برانچ",
    "Central Flagship": "مرکزی برانچ",
    "DHDC Specialist Center": "ڈی ایچ ڈی سی اسپیشلٹی سینٹر",
    "Rs": "روپے",
    "Cleanings & Comprehensive Exam": "دانتوں کی صفائی اور جامع معائنہ",
    "Complete oral health evaluation and ultrasonic scaling.": "مکمل دانتوں کا معائنہ اور جدید الٹراسونک اسکیلنگ۔",
    "Root Canal Therapy": "روٹ کینال تھراپی",
    "Gentle, microscopic endodontic treatment to save natural teeth.": "قدرتی دانت کو بچانے کے لیے جدید روٹ کینال علاج۔",
    "Professional Teeth Whitening": "پیشہ ورانہ دانتوں کی سفیدی",
    "In-office laser whitening for immediate brightness.": "فوری چمک کے لیے جدید لیزر وائٹننگ۔",
    "Dental Implants": "ڈینٹل امپلانٹس",
    "Permanent tooth replacement with premium biocompatible titanium.": "اعلیٰ معیار کے بائیوکمپیٹیبل ٹائٹینیم سے مستقل دانت لگانا۔",
    "Porcelain Veneers": "پورسلین وینیرز",
    "Custom porcelain facings for a flawless, natural aesthetic.": "خوبصورت اور قدرتی مسکراہٹ کے لیے کسٹم پورسلین وینیرز۔",
    "Emergency Dental Care": "ہنگامی ڈینٹل کیئر",
    "Rapid pain relief, trauma management, and urgent tooth repairs.": "فوری درد سے نجات، چوٹ کا علاج اور ہنگامی دیکھ بھال۔",
    "Invisalign Clear Aligners": "انویزلائن کلیئر الائنرز",
    "Invisalign": "انویزلائن",
    "Clear Aligners": "کلیئر الائنرز",
    "DHDC": "ڈی ایچ ڈی سی",
    "DHDC Lahore – Gulberg": "ڈی ایچ ڈی سی لاہور – گلبرگ",
    "DHDC Lahore - Gulberg": "ڈی ایچ ڈی سی لاہور – گلبرگ",
    "DHDC Islamabad Central Flagship": "ڈی ایچ ڈی سی اسلام آباد سینٹرل فلیگ شپ",
    "DHDC Islamabad – F-7 Markaz": "ڈی ایچ ڈی سی اسلام آباد – ایف-7 مرکز",
    "DHDC Islamabad - F-7 Markaz": "ڈی ایچ ڈی سی اسلام آباد – ایف-7 مرکز",
    "DHDC Karachi – Clifton": "ڈی ایچ ڈی سی کراچی – کلفٹن",
    "DHDC Karachi - Clifton": "ڈی ایچ ڈی سی کراچی – کلفٹن",
    "DHDC Downtown Studio": "ڈی ایچ ڈی سی ڈاؤن ٹاؤن اسٹوڈیو",
    "DHDC Main Clinic": "ڈی ایچ ڈی سی مین کلینک",
    "Closed Today": "آج بند ہے",
    "Open Today": "آج کھلا ہے",
    "Open Now": "ابھی کھلا ہے",
    "From Rs": "شروع از Rs",
    "From": "شروع از",
}

DOCTOR_NAME_MAP: Dict[str, str] = {
    "Dr. Hira Saleem": "ڈاکٹر حرا سلیم",
    "Dr. Malaika Saleem": "ڈاکٹر ملائکہ سلیم",
    "Dr. Yaser Rasheed": "ڈاکٹر یاسر رشید",
    "Dr. Hira Saleem, BDS": "ڈاکٹر حرا سلیم (BDS)",
    "Dr. Malaika Saleem, BDS": "ڈاکٹر ملائکہ سلیم (BDS)",
    "Dr. Yaser Rasheed, BDS": "ڈاکٹر یاسر رشید (BDS)",
    "Hira Saleem": "حرا سلیم",
    "Malaika Saleem": "ملائکہ سلیم",
    "Yaser Rasheed": "یاسر رشید",
}

def compute_hash(source_lang: str, target_lang: str, source_text: str) -> str:
    raw = f"{source_lang}:{target_lang}:{source_text.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def mask_entities(text: str) -> Tuple[str, List[Tuple[str, str]]]:
    tokens: List[Tuple[str, str]] = []
    counter = [0]

    def replace(match: re.Match) -> str:
        token = f"__TOKEN_{counter[0]}__"
        counter[0] += 1
        tokens.append((token, match.group(0)))
        return token

    masked = text
    for pattern in [LICENSE_RE, PHONE_RE, PRICE_RE, TIME_RE, DR_TITLE_RE]:
        masked = pattern.sub(replace, masked)
    for cred in CREDENTIALS:
        masked = re.sub(rf"\b{re.escape(cred)}\b", replace, masked)

    return masked, tokens


def restore_entities(text: str, tokens: List[Tuple[str, str]], target_lang: str = "ur") -> str:
    result = text
    for token, original in tokens:
        replacement = original
        if target_lang == "ur" and re.match(r"^Dr\.?$", original.strip(), re.IGNORECASE):
            replacement = "ڈاکٹر"
        result = result.replace(token, replacement)
        token_num = token.strip("_").split("_")[-1]
        result = re.sub(rf"__\s*token_{token_num}\s*__", replacement, result, flags=re.IGNORECASE)
    return result


def transliterate_doctor_name(name: str, target_lang: str = "ur") -> str:
    if target_lang != "ur":
        return name
    if name in DOCTOR_NAME_MAP:
        return DOCTOR_NAME_MAP[name]
    for eng_name, ur_name in DOCTOR_NAME_MAP.items():
        if eng_name in name:
            return name.replace(eng_name, ur_name)
    return name


def translate_clinical_term(text: str, target_lang: str = "ur") -> str:
    if target_lang != "ur":
        return text
    if text in CLINICAL_URDU_DICT:
        return CLINICAL_URDU_DICT[text]
    result = text
    sorted_dict = sorted(CLINICAL_URDU_DICT.items(), key=lambda x: len(x[0]), reverse=True)
    for eng, ur in sorted_dict:
        pattern = rf"\b{re.escape(eng)}\b"
        result = re.sub(pattern, ur, result, flags=re.IGNORECASE)
    return result


class TranslationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self._cache: Dict[str, str] = {}
        self._api_key: Optional[str] = None

    async def _lookup_cache(self, hash_key: str) -> Optional[str]:
        if hash_key in self._cache:
            return self._cache[hash_key]
        stmt = select(TranslationCacheORM.translated_text).where(
            TranslationCacheORM.hash_key == hash_key
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            self._cache[hash_key] = row
        return row

    async def _store_cache(
        self, hash_key: str, source_lang: str, target_lang: str,
        source_text: str, translated_text: str, status: str = "auto",
    ) -> None:
        stmt = select(TranslationCacheORM).where(
            TranslationCacheORM.hash_key == hash_key
        )
        result = await self.session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.translated_text = translated_text
            existing.status = status
            existing.updated_at = datetime.now(timezone.utc)
        else:
            entry = TranslationCacheORM(
                hash_key=hash_key, source_lang=source_lang, target_lang=target_lang,
                source_text=source_text, translated_text=translated_text, status=status,
            )
            self.session.add(entry)
        self._cache[hash_key] = translated_text

    async def _neural_translate(self, text: str, target_lang: str = "ur") -> str:
        """
        Step 3 & 4 of cascade:
        1. Check in-memory clinical dictionary & doctor names (case-insensitive)
        2. Mask protected clinical tokens
        3. Fast neural translation: Google Translate GTX JSON API (timeout=3.0s)
        4. Fallback neural translation: MyMemory API (timeout=2.0s)
        5. Offline word/phrase glossary substitution fallback
        """
        if target_lang != "ur":
            return text
        if not text or not text.strip():
            return text

        # Step 1: In-memory exact & case-insensitive glossary lookup (0ms)
        if text in DOCTOR_NAME_MAP:
            return DOCTOR_NAME_MAP[text]
        if text in CLINICAL_URDU_DICT:
            return CLINICAL_URDU_DICT[text]

        lower_text = text.strip().lower()
        for eng_term, ur_term in CLINICAL_URDU_DICT.items():
            if lower_text == eng_term.lower():
                return ur_term
        for eng_name, ur_name in DOCTOR_NAME_MAP.items():
            if lower_text == eng_name.lower():
                return ur_name

        # Mask protected clinical entities
        masked_text, tokens = mask_entities(text)

        # Step 3a: Google Translate GTX API
        try:
            import httpx
            import urllib.parse
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={urllib.parse.quote(masked_text)}"
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                        chunks = [c[0] for c in data[0] if c and len(c) > 0 and c[0]]
                        if chunks:
                            res = "".join(chunks).strip()
                            if tokens:
                                res = restore_entities(res, tokens, target_lang)
                            if target_lang == "ur":
                                res = re.sub(r"\bDr\.?\s+", "ڈاکٹر ", res)
                            return res
        except Exception as e:
            logger.warning(f"Google Translate GTX API request failed: {e}")

        # Step 3b: MyMemory API Fallback
        try:
            import httpx
            import urllib.parse
            mm_url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(masked_text)}&langpair=en|{target_lang}"
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(mm_url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    translated_str = data.get("responseData", {}).get("translatedText")
                    if translated_str and translated_str.strip():
                        res = translated_str.strip()
                        if tokens:
                            res = restore_entities(res, tokens, target_lang)
                        if target_lang == "ur":
                            res = re.sub(r"\bDr\.?\s+", "ڈاکٹر ", res)
                        return res
        except Exception as e:
            logger.warning(f"MyMemory fallback request failed: {e}")

        # Step 4: Offline word-by-word / phrase substitution
        fallback_res = transliterate_doctor_name(translate_clinical_term(masked_text, "ur"), "ur")
        if tokens:
            fallback_res = restore_entities(fallback_res, tokens, target_lang)
        if target_lang == "ur":
            fallback_res = re.sub(r"\bDr\.?\s+", "ڈاکٹر ", fallback_res)
        return fallback_res

    async def translate(
        self, text: str, source_lang: str = "en", target_lang: str = "ur",
    ) -> str:
        if source_lang == target_lang:
            return text
        if not text or not text.strip():
            return text

        # Step 1: Dictionary lookup (0ms)
        if target_lang == "ur":
            if text in DOCTOR_NAME_MAP:
                return DOCTOR_NAME_MAP[text]
            if text in CLINICAL_URDU_DICT:
                return CLINICAL_URDU_DICT[text]

        # Step 2: Postgres Cache lookup (1ms)
        hash_key = compute_hash(source_lang, target_lang, text)
        cached = await self._lookup_cache(hash_key)
        if cached is not None:
            return cached

        # Step 3 & 4: Neural Translation with offline fallback
        translated = await self._neural_translate(text, target_lang)

        # Store in PostgreSQL translation_cache
        await self._store_cache(hash_key, source_lang, target_lang, text, translated, status="neural")
        return translated

    async def batch_translate(
        self, texts: List[str], source_lang: str = "en", target_lang: str = "ur",
    ) -> Dict[str, str]:
        unique_texts = list(dict.fromkeys(texts))
        results: Dict[str, str] = {}
        uncached: List[str] = []

        for text in unique_texts:
            if not text or not text.strip():
                results[text] = text
                continue

            # Step 1: In-memory dictionary lookup (0ms)
            if target_lang == "ur":
                if text in DOCTOR_NAME_MAP:
                    results[text] = DOCTOR_NAME_MAP[text]
                    continue
                if text in CLINICAL_URDU_DICT:
                    results[text] = CLINICAL_URDU_DICT[text]
                    continue

            # Step 2: Postgres Cache lookup (1ms)
            hash_key = compute_hash(source_lang, target_lang, text)
            cached = await self._lookup_cache(hash_key)
            if cached is not None:
                results[text] = cached
            else:
                uncached.append(text)

        # Step 3 & 4: Live Neural Translate remaining misses & persist to PostgreSQL
        if uncached:
            for text in uncached:
                translated = await self._neural_translate(text, target_lang)
                hash_key = compute_hash(source_lang, target_lang, text)
                await self._store_cache(hash_key, source_lang, target_lang, text, translated, status="neural")
                results[text] = translated

        return results

    async def backfill_existing_data(self, session: AsyncSession) -> int:
        """Pre-warm translation cache for active database entities."""
        from app.infrastructure.database.orm_models import (
            ServiceORM,
            TeamMemberORM,
            LocationORM,
            AnnouncementORM,
            ReviewORM,
            FaqItemORM,
        )

        texts_to_warm: List[str] = []

        try:
            # Services
            services = (await session.execute(select(ServiceORM))).scalars().all()
            for s in services:
                if s.title: texts_to_warm.append(s.title)
                if s.short_desc: texts_to_warm.append(s.short_desc)
                if s.category: texts_to_warm.append(s.category)

            # Team members
            team = (await session.execute(select(TeamMemberORM))).scalars().all()
            for m in team:
                if m.display_name: texts_to_warm.append(m.display_name)
                if m.professional_title: texts_to_warm.append(m.professional_title)
                if m.role: texts_to_warm.append(m.role)
                if m.biography: texts_to_warm.append(m.biography)

            # Locations
            locs = (await session.execute(select(LocationORM))).scalars().all()
            for loc in locs:
                if loc.name: texts_to_warm.append(loc.name)
                if loc.city: texts_to_warm.append(loc.city)
                if loc.address_line1: texts_to_warm.append(loc.address_line1)
                if loc.address_line2: texts_to_warm.append(loc.address_line2)

            # Announcements
            announcements = (await session.execute(select(AnnouncementORM))).scalars().all()
            for a in announcements:
                if a.content: texts_to_warm.append(a.content)

            # FAQs
            faqs = (await session.execute(select(FaqItemORM))).scalars().all()
            for f in faqs:
                if f.question: texts_to_warm.append(f.question)
                if f.answer: texts_to_warm.append(f.answer)

            # Reviews
            reviews = (await session.execute(select(ReviewORM))).scalars().all()
            for r in reviews:
                if r.review_text: texts_to_warm.append(r.review_text)

            warmed = await self.batch_translate(texts_to_warm, source_lang="en", target_lang="ur")
            return len(warmed)
        except Exception as e:
            logger.warning("Error during translation backfill: %s", e)
            return 0
