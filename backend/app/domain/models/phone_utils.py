import re
from typing import Optional


def normalize_pakistan_phone(phone: Optional[str]) -> str:
    """
    Normalises phone number to international Pakistan format 92...
    Rule:
    - Strips all non-digit characters.
    - 0092... -> 92...
    - 03XX... -> 923XX...
    - 3XX... (10 digits) -> 923XX...
    - Local or un-prefixed digits >= 7 -> 92...
    - Preserves existing 92... prefixes.
    """
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return ""
    if digits.startswith("0092"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = "92" + digits[1:]
    elif digits.startswith("3") and len(digits) == 10:
        digits = "92" + digits
    elif not digits.startswith("92") and len(digits) >= 7:
        digits = "92" + digits
    return digits


async def is_held(phone: str, session: Optional[object] = None) -> bool:
    """
    Convenience wrapper checking if an active contact hold exists on the phone number.
    Blocks only lead-recovery messages; confirmations and reminders are never blocked.
    """
    from app.application.services.call_desk_service import is_held as _is_held
    return await _is_held(phone, session=session)
