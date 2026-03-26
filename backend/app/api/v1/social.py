from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_seller

router = APIRouter()


@router.post("/posts", response_model=schemas.Post)
def create_post(
    payload: schemas.PostCreate,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return crud.create_post(db, seller_id=seller.id, payload=payload)


@router.get("/posts", response_model=list[schemas.Post])
def list_posts(
    skip: int = 0,
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    return crud.list_posts(db, skip=skip, limit=limit)


@router.get("/feed", response_model=list[schemas.Post])
def get_feed(
    skip: int = 0,
    limit: int = Query(20, le=50),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.list_followed_posts(db, follower_id=current_user.id, skip=skip, limit=limit)


@router.get("/trending", response_model=list[schemas.Post])
def get_trending(
    skip: int = 0,
    limit: int = Query(10, le=20),
    db: Session = Depends(get_db),
):
    return crud.list_trending_posts(db, skip=skip, limit=limit)


@router.post("/posts/{post_id}/comments", response_model=schemas.Comment)
def add_comment(
    post_id: int,
    payload: schemas.CommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return crud.add_comment(db, post_id=post_id, user_id=current_user.id, payload=payload)


@router.get("/posts/{post_id}/comments", response_model=list[schemas.Comment])
def list_comments(
    post_id: int,
    skip: int = 0,
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    return crud.list_comments(db, post_id=post_id, skip=skip, limit=limit)


@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    liked = crud.toggle_like(db, post_id=post_id, user_id=current_user.id)
    return {"liked": liked}


@router.post("/stories", response_model=schemas.Story)
def create_story(
    payload: schemas.StoryCreate,
    current_user: models.User = Depends(get_current_active_seller),
    db: Session = Depends(get_db),
):
    seller = crud.get_seller_by_user_id(db, current_user.id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return crud.create_story(db, seller_id=seller.id, payload=payload)


@router.get("/stories", response_model=list[schemas.Story])
def list_stories(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    following_ids = (
        db.query(models.Follow.following_id)
        .filter(models.Follow.follower_id == current_user.id)
        .all()
    )
    seller_ids = [follow[0] for follow in following_ids]
    return crud.list_active_stories(db, seller_ids=seller_ids)


@router.post("/chat", response_model=schemas.ChatMessage)
def send_message(
    payload: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    return crud.create_message(db, sender_id=current_user.id, payload=payload)


@router.get("/chat", response_model=list[schemas.ChatMessage])
def list_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.list_conversations(db, user_id=current_user.id)


@router.get("/chat/{user_id}", response_model=list[schemas.ChatMessage])
def list_messages(
    user_id: int,
    skip: int = 0,
    limit: int = Query(50, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.list_messages(db, user_id=current_user.id, other_id=user_id, skip=skip, limit=limit)