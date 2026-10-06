import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
import uuid
import os
import shutil
from src.core.config import settings
from abc import ABC, abstractmethod

class BaseStorageService(ABC):
    async def validate_audio_file(self, file: UploadFile, max_size_mb: int = 10):
        # Check file extension
        if not file.filename.lower().endswith(('.wav', '.m4a', '.mp3', '.aac')):
            raise HTTPException(status_code=400, detail="Unsupported file extension")

        # Check content type header
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Invalid content type")

        # Check file size
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > max_size_mb * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File size exceeds {max_size_mb}MB limit")

    @abstractmethod
    async def upload_audio(self, file: UploadFile, user_id: int, conversation_id: int) -> str:
        pass

    @abstractmethod
    def get_presigned_url(self, object_name: str, expiration=3600) -> str:
        pass
        
    @abstractmethod
    def delete_audio(self, object_name: str):
        pass


class LocalStorageService(BaseStorageService):
    def __init__(self):
        self.base_dir = settings.LOCAL_STORAGE_DIR
        os.makedirs(self.base_dir, exist_ok=True)
        
    async def upload_audio(self, file: UploadFile, user_id: int, conversation_id: int) -> str:
        await self.validate_audio_file(file)
        
        ext = file.filename.split('.')[-1]
        object_name = f"chat_audio/{conversation_id}/{user_id}_{uuid.uuid4().hex}.{ext}"
        
        full_path = os.path.join(self.base_dir, object_name)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        try:
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            return object_name
        except Exception as e:
            print(f"Local storage upload error: {e}")
            raise HTTPException(status_code=500, detail="Storage failure")

    def get_presigned_url(self, object_name: str, expiration=3600) -> str:
        # For local storage, we can't generate a real presigned URL.
        # We will return a special local URL format that our FastAPI app will serve.
        # For security, we could append a JWT token, but since this is abstract,
        # we'll just return the endpoint path. The actual auth should be done at the endpoint.
        # Note: the history endpoint will return this, and the client will use it.
        return f"{settings.API_V1_STR}/chat/audio/serve/{object_name}"

    def delete_audio(self, object_name: str):
        full_path = os.path.join(self.base_dir, object_name)
        if os.path.exists(full_path):
            os.remove(full_path)


class S3StorageService(BaseStorageService):
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION_NAME
        )
        self.bucket = settings.S3_BUCKET_NAME
        self.ensure_bucket_exists()

    def ensure_bucket_exists(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket)
                except ClientError as ce:
                    print(f"Error creating bucket: {ce}")
            else:
                print(f"Error checking bucket: {e}")

    async def upload_audio(self, file: UploadFile, user_id: int, conversation_id: int) -> str:
        await self.validate_audio_file(file)

        ext = file.filename.split('.')[-1]
        object_name = f"chat_audio/{conversation_id}/{user_id}_{uuid.uuid4().hex}.{ext}"

        try:
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket,
                object_name,
                ExtraArgs={'ContentType': file.content_type}
            )
            return object_name
        except ClientError as e:
            print(f"S3 upload error: {e}")
            raise HTTPException(status_code=500, detail="Storage failure")

    def get_presigned_url(self, object_name: str, expiration=3600) -> str:
        try:
            response = self.s3_client.generate_presigned_url('get_object',
                                                            Params={'Bucket': self.bucket,
                                                                    'Key': object_name},
                                                            ExpiresIn=expiration)
            return response
        except ClientError as e:
            print(e)
            return None

    def delete_audio(self, object_name: str):
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=object_name)
        except ClientError as e:
            print(f"Error deleting from S3: {e}")

if settings.STORAGE_BACKEND == "local":
    storage_service = LocalStorageService()
else:
    storage_service = S3StorageService()
