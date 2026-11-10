import os
from pathlib import Path
from typing import Optional, Tuple
from uuid import uuid4

try:
    import magic
except (ImportError, Exception):  # pragma: no cover
    magic = None

from fastapi import HTTPException, status

from app.core.config import settings
from app.domain.services.storage_service import StorageService

ALLOWED_MIME_SIGNATURES = {
    b"\xff\xd8\xff": ("image/jpeg", ".jpg"),
    b"\x89PNG\r\n\x1a\n": ("image/png", ".png"),
    b"GIF87a": ("image/gif", ".gif"),
    b"GIF89a": ("image/gif", ".gif"),
    b"%PDF-": ("application/pdf", ".pdf"),
}


def detect_file_signature(file_bytes: bytes) -> Tuple[Optional[str], Optional[str]]:
    """
    Pure-Python magic byte / file-header inspection.
    Validates file formats without requiring the OS libmagic library.
    Returns (mime_type, extension) or (None, None).
    """
    if len(file_bytes) < 4:
        return None, None

    # JPEG
    if file_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"

    # PNG: \x89PNG\r\n\x1a\n
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"

    # WebP: 'RIFF' .... 'WEBP'
    if file_bytes.startswith(b"RIFF") and len(file_bytes) >= 12 and file_bytes[8:12] == b"WEBP":
        return "image/webp", ".webp"

    # GIF
    if file_bytes.startswith(b"GIF87a") or file_bytes.startswith(b"GIF89a"):
        return "image/gif", ".gif"

    # PDF
    if file_bytes.startswith(b"%PDF-"):
        return "application/pdf", ".pdf"

    # SVG: Check for <svg or <?xml ... <svg
    prefix = file_bytes[:512].strip()
    if prefix.startswith(b"<svg") or (prefix.startswith(b"<?xml") and b"<svg" in prefix):
        lower_prefix = file_bytes[:2048].lower()
        if b"<script" not in lower_prefix and b"javascript:" not in lower_prefix:
            return "image/svg+xml", ".svg"

    return None, None


class LocalStorageService(StorageService):
    """
    Local filesystem implementation of StorageService.
    Suitable for local development and container deployments.
    Uses pure-Python file header validation with optional libmagic acceleration.
    """

    def __init__(self, upload_dir: Optional[str] = None):
        self.upload_dir = Path(upload_dir or settings.UPLOAD_DIR).resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self._magic = magic

    async def upload(self, file_bytes: bytes, original_filename: str, content_type: str) -> str:
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_mb}MB.",
            )

        detected_mime, detected_ext = detect_file_signature(file_bytes)

        # Fallback to libmagic if pure-python inspection didn't identify and libmagic is loaded
        if not detected_mime and self._magic is not None:
            try:
                m_mime = self._magic.from_buffer(file_bytes, mime=True)
                if m_mime:
                    detected_mime = m_mime
                    ext_map = {
                        "image/jpeg": ".jpg",
                        "image/png": ".png",
                        "image/webp": ".webp",
                        "image/gif": ".gif",
                        "image/svg+xml": ".svg",
                        "application/pdf": ".pdf",
                    }
                    detected_ext = ext_map.get(m_mime)
            except Exception:
                pass

        if detected_mime is None or detected_ext is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match any allowed media type (JPEG, PNG, WebP, GIF, SVG, PDF).",
            )

        # Normalize client content_type
        client_type = (content_type or "").lower().split(";")[0].strip()
        generic_types = {"application/octet-stream", "binary/octet-stream", ""}

        if client_type and client_type not in generic_types and client_type != detected_mime:
            # Allow common browser MIME aliases (e.g. image/jpg vs image/jpeg, or svg)
            is_compat_image = client_type.startswith("image/") and detected_mime.startswith("image/")
            if not is_compat_image:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File content type mismatch: expected {detected_mime}, got {content_type}.",
                )

        unique_filename = f"{uuid4().hex}{detected_ext}"
        destination = self.upload_dir / unique_filename

        with open(destination, "wb") as f:
            f.write(file_bytes)

        return f"/media/{unique_filename}"

    async def delete(self, file_path_or_url: str) -> bool:
        # Sanitize: extract only the filename from the URL/path
        filename = os.path.basename(str(file_path_or_url).rstrip("/"))
        if not filename or filename in (".", ".."):
            return False

        target = (self.upload_dir / filename).resolve()

        # Path traversal protection: ensure resolved path is within upload_dir
        try:
            target.relative_to(self.upload_dir)
        except ValueError:
            return False

        if target.exists() and target.is_file():
            target.unlink()
            return True
        return False
