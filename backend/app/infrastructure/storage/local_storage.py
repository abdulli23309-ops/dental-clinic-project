import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import settings
from app.domain.services.storage_service import StorageService

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/gif": ".gif",
}


class LocalStorageService(StorageService):
    """
    Local filesystem implementation of StorageService.
    Suitable for local development and non-distributed deployments.
    """

    def __init__(self, upload_dir: Optional[str] = None):
        self.upload_dir = Path(upload_dir or settings.UPLOAD_DIR).resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def upload(self, file_bytes: bytes, original_filename: str, content_type: str) -> str:
        clean_content_type = content_type.lower().split(";")[0].strip()
        if clean_content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{content_type}'. Allowed types: JPG, PNG, WEBP, SVG, GIF.",
            )

        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_mb}MB.",
            )

        ext = ALLOWED_CONTENT_TYPES[clean_content_type]
        unique_filename = f"{uuid4().hex}{ext}"
        destination = self.upload_dir / unique_filename

        with open(destination, "wb") as f:
            f.write(file_bytes)

        return f"/media/{unique_filename}"

    async def delete(self, file_path_or_url: str) -> bool:
        filename = os.path.basename(file_path_or_url)
        target = (self.upload_dir / filename).resolve()
        # Prevent directory traversal
        if not str(target).startswith(str(self.upload_dir)):
            return False
        if target.exists() and target.is_file():
            target.unlink()
            return True
        return False
