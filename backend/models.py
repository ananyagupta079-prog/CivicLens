from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)            # 'citizen' | 'politician'
    ward = Column(String, index=True)
    phone = Column(String)
    address = Column(String)
    party_id = Column(String)                        # 'a' | 'b' | 'ind'
    eci_id = Column(String, unique=True)
    verified = Column(Boolean, default=False)
    monthly = Column(JSON, default=list)             # verified projects May..Oct (historic baseline)
    focus = Column(JSON, default=dict)               # {"Roads": 30, ...}
    created_at = Column(DateTime, default=now)


class Post(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True)
    author_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    caption = Column(Text, nullable=False)           # Text, not String(100): the limit is 100 WORDS
    ward = Column(String, index=True)
    lat = Column(Float)
    lng = Column(Float)
    category = Column(String, index=True)
    ai_cost = Column(String)
    ai_date = Column(String)
    base_support = Column(Integer, default=0)        # seeded legacy counts
    base_scrutinize = Column(Integer, default=0)
    is_new = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now, index=True)

    author = relationship("User")
    images = relationship("PostImage", cascade="all, delete-orphan")
    votes = relationship("Vote", cascade="all, delete-orphan")
    comments = relationship("Comment", cascade="all, delete-orphan", order_by="Comment.created_at")
    edits = relationship("PostEditHistory", cascade="all, delete-orphan")


class PostImage(Base):
    __tablename__ = "post_images"
    id = Column(Integer, primary_key=True)
    post_id = Column(String, ForeignKey("posts.id"), index=True)
    url = Column(Text, nullable=False)
    lat = Column(Float)
    lng = Column(Float)
    sha = Column(String, index=True)                 # fingerprint for duplicate detection


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="one_vote_per_user"),)
    id = Column(Integer, primary_key=True)
    post_id = Column(String, ForeignKey("posts.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"))
    kind = Column(String, nullable=False)            # 'support' | 'scrutinize'


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    post_id = Column(String, ForeignKey("posts.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"))
    text = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=now)
    user = relationship("User")


class PostEditHistory(Base):
    __tablename__ = "post_edit_history"
    id = Column(Integer, primary_key=True)
    post_id = Column(String, ForeignKey("posts.id"), index=True)
    old_caption = Column(Text)
    edited_at = Column(DateTime, default=now)
