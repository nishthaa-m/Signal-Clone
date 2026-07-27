"""API endpoint handling file and image uploads for chat attachments."""

import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from app.core.security import get_current_user
from app.db.models import User

router = APIRouter(prefix="/upload", tags=["uploads"])

# Local uploads directory
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/public/uploads"))
os.makedirs(UPLOADS_DIR, exist_ok=True)


@router.post("", response_model=dict)
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload an image or document attachment and return access URL and file type."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    ext = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOADS_DIR, unique_filename)

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    attachment_type = "image" if ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"] else "file"
    file_url = f"/uploads/{unique_filename}"

    return {
        "url": file_url,
        "attachment_type": attachment_type,
        "filename": file.filename,
    }
