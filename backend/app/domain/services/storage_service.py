from abc import ABC, abstractmethod


class StorageService(ABC):
    """
    Abstract interface for storing uploaded media assets (images, logos, headshots).
    Decouples domain workflows from specific storage backends (Local disk, S3, Cloudinary).
    """

    @abstractmethod
    async def upload(self, file_bytes: bytes, original_filename: str, content_type: str) -> str:
        """
        Stores the file and returns its public URL or path reference.
        """
        pass

    @abstractmethod
    async def delete(self, file_path_or_url: str) -> bool:
        """
        Removes the stored asset if it exists.
        """
        pass
