from typing import Optional, List
from sqlalchemy.orm import Session
from src.models.user import User
from src.schemas.user import UserCreate
from src.core.security import get_password_hash

class UserRepository:
    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_by_email_or_username(self, db: Session, email: str, username: str) -> Optional[User]:
        return db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    def search_by_prefix(self, db: Session, prefix: str, current_user_id: int, limit: int = 20) -> List[User]:
        return db.query(User).filter(
            (User.username.ilike(f"{prefix}%")) | (User.email.ilike(f"{prefix}%"))
        ).filter(
            User.id != current_user_id
        ).limit(limit).all()

    def create(self, db: Session, obj_in: UserCreate) -> User:
        db_obj = User(
            username=obj_in.username,
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password)
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

user_repo = UserRepository()
