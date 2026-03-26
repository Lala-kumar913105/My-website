from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app import models, crud, schemas
from app.core.security import get_current_active_user

router = APIRouter()


@router.post("/daily-login-bonus", response_model=dict)
def daily_login_bonus(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Grant daily login bonus coins (once per day)."""
    settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    bonus = settings.daily_login_bonus if settings else 0
    wallet, earned = crud.apply_daily_bonus(db, user_id=current_user.id, base_bonus=bonus)
    crud.coin.apply_badge_label(wallet)

    return {
        "message": "Daily bonus applied" if earned else "Daily bonus already claimed",
        "coins_added": earned,
        "coins_balance": wallet.balance,
        "streak_count": wallet.streak_count,
        "badge_level": wallet.badge_level,
        "badge_label": wallet.badge_label,
    }


@router.get("/balance", response_model=schemas.UserCoins)
def get_user_coins(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user coin balance and rupee equivalent."""
    wallet = crud.get_or_create_wallet(db, user_id=current_user.id)
    wallet.badge_label = crud.coin.badge_label(wallet.badge_level)
    return wallet


@router.get("/history", response_model=list[schemas.CoinTransaction])
def coin_history(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.CoinTransaction)
        .filter(models.CoinTransaction.user_id == current_user.id)
        .order_by(models.CoinTransaction.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/earn", response_model=schemas.UserCoins)
def earn_coins(
    payload: schemas.CoinEarnRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    if payload.amount > 200:
        raise HTTPException(status_code=400, detail="Amount exceeds limit")

    wallet = crud.get_or_create_wallet(db, user_id=current_user.id)
    wallet.balance += payload.amount
    wallet.total_earned += payload.amount
    wallet.badge_level = crud.coin._calculate_badge(wallet.total_earned)
    wallet.badge_label = crud.coin.badge_label(wallet.badge_level)
    db.commit()
    db.refresh(wallet)
    crud.add_transaction(db, current_user.id, payload.amount, "earn", payload.reason)
    return wallet


@router.post("/redeem", response_model=schemas.UserCoins)
def redeem_coins(
    payload: schemas.CoinRedeemRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if payload.coins_to_redeem <= 0:
        raise HTTPException(status_code=400, detail="Invalid coin amount")

    reward_type = payload.reward_type
    if reward_type not in {"discount", "free_delivery"}:
        raise HTTPException(status_code=400, detail="Invalid reward type")

    wallet = crud.spend_coins(db, current_user.id, payload.coins_to_redeem, reward_type)
    wallet.badge_label = crud.coin.badge_label(wallet.badge_level)
    return wallet