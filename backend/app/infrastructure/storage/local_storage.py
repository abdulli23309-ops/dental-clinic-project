import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

try:
    import magic
except ImportError:  # pragma: no cover - handled at runtime with a clear error message
    magic = None

from fastapi import HTTPException, status

from app.core.config import settings
from app.domain.services.storage_service import StorageService

ALLOWED_MIME_SIGNATURES = {
    b"\xff\xd8\xff": ("image/jpeg", ".jpg"),
    b"\x89PNG\r\n\x1a\n": ("image/png", ".png"),
    b"RIFF": ("image/webp", ".webp"),
    b"GIF8": ("image/gif", ".gif"),
    b"%PDF-": ("application/pdf", ".pdf"),
}

# SVG is NOT allowed - it can contain script injection vectors
ALLOWED_EXTENSIONS = {".jpg", ".png", ".webp", ".gif"}


class LocalStorageService(StorageService):
    """
    Local filesystem implementation of StorageService.
    Suitable for local development and non-distributed deployments.
    """

    def __init__(self, upload_dir: Optional[str] = None):
        self.upload_dir = Path(upload_dir or settings.UPLOAD_DIR).resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self._magic = magic

    async def upload(self, file_bytes: bytes, original_filename: str, content_type: str) -> str:
        if self._magic is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Media validation backend is unavailable. Install libmagic/python-magic (or python-magic-bin on Windows).",
            )

        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_mb}MB.",
            )

        detected_mime = self._magic.from_buffer(file_bytes, mime=True)
        detected_ext = None
        for sig_bytes, (mime, ext) in ALLOWED_MIME_SIGNATURES.items():
            if file_bytes.startswith(sig_bytes):
                detected_mime = mime
                detected_ext = ext
                break

        if detected_mime is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match any allowed media type; uploading may be a phishing or malware attempt.",
            )

        if detected_mime != content_type.lower().split(";")[0].strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File content type mismatch: expected {detected_mime}, got {content_type}. File may be a spoofed MIME type.",
            )

        ext = detected_ext
        unique_filename = f"{uuid4().hex}{ext}"
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
