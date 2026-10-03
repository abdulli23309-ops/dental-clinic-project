from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_storage_service, require_admin
from app.domain.services.storage_service import StorageService

router = APIRouter(prefix="/admin/media", tags=["Admin Media"], dependencies=[Depends(require_admin)])


@router.post("/upload")
async def upload_media_file(
    file: UploadFile = File(...),
    storage_service: StorageService = Depends(get_storage_service),
) -> dict:
    """
    Accepts an image file upload from the admin dashboard and persists it
    via the configured storage backend (local filesystem in development).
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload payload.",
        )

    file_bytes = await file.read()
    content_type = file.content_type or "application/octet-stream"

    url = await storage_service.upload(
        file_bytes=file_bytes,
        original_filename=file.filename,
        content_type=content_type,
    )

    return {
        "success": True,
        "url": url,
        "filename": file.filename,
    }
