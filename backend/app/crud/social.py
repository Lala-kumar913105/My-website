from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app import models, schemas


def create_post(db: Session, seller_id: int, payload: schemas.PostCreate):
    db_post = models.Post(
        seller_id=seller_id,
        caption=payload.caption,
        media_url=payload.media_url,
        media_type=payload.media_type,
        hashtags=payload.hashtags,
    )
    if payload.product_ids:
        products = db.query(models.Product).filter(models.Product.id.in_(payload.product_ids)).all()
        db_post.products = products
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def list_posts(db: Session, skip: int = 0, limit: int = 20):
    return db.query(models.Post).order_by(models.Post.created_at.desc()).offset(skip).limit(limit).all()


def list_followed_posts(db: Session, follower_id: int, skip: int = 0, limit: int = 20):
    following_ids = (
        db.query(models.Follow.following_id)
        .filter(models.Follow.follower_id == follower_id)
        .subquery()
    )
    return (
        db.query(models.Post)
        .join(models.Seller, models.Seller.id == models.Post.seller_id)
        .filter(models.Seller.user_id.in_(following_ids))
        .order_by(models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_trending_posts(db: Session, skip: int = 0, limit: int = 20):
    return (
        db.query(models.Post)
        .order_by(models.Post.like_count.desc(), models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def add_comment(db: Session, post_id: int, user_id: int, payload: schemas.CommentCreate):
    db_comment = models.Comment(post_id=post_id, user_id=user_id, content=payload.content)
    db.add(db_comment)
    db.query(models.Post).filter(models.Post.id == post_id).update({
        "comment_count": models.Post.comment_count + 1
    })
    db.commit()
    db.refresh(db_comment)
    return db_comment


def toggle_like(db: Session, post_id: int, user_id: int):
    existing = (
        db.query(models.Like)
        .filter(models.Like.post_id == post_id, models.Like.user_id == user_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.query(models.Post).filter(models.Post.id == post_id).update({
            "like_count": func.max(models.Post.like_count - 1, 0)
        })
        db.commit()
        return False
    db_like = models.Like(post_id=post_id, user_id=user_id)
    db.add(db_like)
    db.query(models.Post).filter(models.Post.id == post_id).update({
        "like_count": models.Post.like_count + 1
    })
    db.commit()
    return True


def list_comments(db: Session, post_id: int, skip: int = 0, limit: int = 20):
    return (
        db.query(models.Comment)
        .filter(models.Comment.post_id == post_id)
        .order_by(models.Comment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_story(db: Session, seller_id: int, payload: schemas.StoryCreate):
    db_story = models.Story(
        seller_id=seller_id,
        media_url=payload.media_url,
        media_type=payload.media_type,
        expires_at=payload.expires_at,
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story


def list_active_stories(db: Session, seller_ids: list[int] | None = None):
    query = db.query(models.Story).filter(models.Story.expires_at >= datetime.utcnow())
    if seller_ids:
        query = query.filter(models.Story.seller_id.in_(seller_ids))
    return query.order_by(models.Story.created_at.desc()).all()


def create_message(db: Session, sender_id: int, payload: schemas.ChatMessageCreate):
    db_message = models.ChatMessage(
        sender_id=sender_id,
        recipient_id=payload.recipient_id,
        message=payload.message,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def list_conversations(db: Session, user_id: int):
    return (
        db.query(models.ChatMessage)
        .filter(
            (models.ChatMessage.sender_id == user_id)
            | (models.ChatMessage.recipient_id == user_id)
        )
        .order_by(models.ChatMessage.created_at.desc())
        .all()
    )


def list_messages(db: Session, user_id: int, other_id: int, skip: int = 0, limit: int = 50):
    return (
        db.query(models.ChatMessage)
        .filter(
            ((models.ChatMessage.sender_id == user_id) & (models.ChatMessage.recipient_id == other_id))
            | ((models.ChatMessage.sender_id == other_id) & (models.ChatMessage.recipient_id == user_id))
        )
        .order_by(models.ChatMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )