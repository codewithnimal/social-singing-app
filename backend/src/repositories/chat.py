from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.models.chat import Conversation, Message, ConversationParticipant

class ConversationRepository:
    def get_by_users(self, db: Session, user1_id: int, user2_id: int) -> Optional[Conversation]:
        conv_ids_user1 = db.query(ConversationParticipant.conversation_id).filter(ConversationParticipant.user_id == user1_id)
        participant2 = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id.in_(conv_ids_user1),
            ConversationParticipant.user_id == user2_id
        ).first()
        
        if participant2:
            return db.query(Conversation).filter(Conversation.id == participant2.conversation_id).first()
        return None

    def get_by_id(self, db: Session, conv_id: int) -> Optional[Conversation]:
        return db.query(Conversation).filter(Conversation.id == conv_id).first()

    def create(self, db: Session, user1_id: int, user2_id: int) -> Conversation:
        conv = Conversation()
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
        p1 = ConversationParticipant(conversation_id=conv.id, user_id=user1_id)
        p2 = ConversationParticipant(conversation_id=conv.id, user_id=user2_id)
        db.add_all([p1, p2])
        db.commit()
        db.refresh(conv)
        return conv

    def is_participant(self, db: Session, conv_id: int, user_id: int) -> bool:
        return db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == user_id
        ).first() is not None

class MessageRepository:
    def get_by_client_msg_id(self, db: Session, client_msg_id: str) -> Optional[Message]:
        return db.query(Message).filter(Message.client_msg_id == client_msg_id).first()

    def get_by_audio_url(self, db: Session, audio_url: str) -> Optional[Message]:
        return db.query(Message).filter(Message.audio_url == audio_url).first()

    def create(self, db: Session, conversation_id: int, sender_id: int, content: Optional[str] = None, client_msg_id: Optional[str] = None, audio_url: Optional[str] = None, audio_duration_ms: Optional[int] = None) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            client_msg_id=client_msg_id,
            audio_url=audio_url,
            audio_duration_ms=audio_duration_ms
        )
        db.add(msg)
        return msg
        # Commit should be handled by the caller, especially for audio where we might need to rollback storage, 
        # but to keep it consistent we can let the repo do add() and caller do commit(). 
        # Actually, let's keep commit in the caller for complex tx, or provide a flag.
        
    def add_commit_refresh(self, db: Session, msg: Message) -> Message:
        db.commit()
        db.refresh(msg)
        return msg
        
    def increment_play_count(self, db: Session, msg: Message) -> Message:
        msg.play_count += 1
        db.commit()
        return msg

    def get_history(self, db: Session, conversation_id: int, page: int, size: int) -> Tuple[List[Message], int]:
        query = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(desc(Message.created_at))
        total = query.count()
        offset = (page - 1) * size
        messages = query.offset(offset).limit(size).all()
        return messages, total

conversation_repo = ConversationRepository()
message_repo = MessageRepository()
