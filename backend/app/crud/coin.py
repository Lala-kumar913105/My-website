from sqlalchemy.orm import Session
from datetime import date
from app import models


def get_or_create_wallet(db: Session, user_id: int):
    wallet = db.query(models.UserCoins).filter(models.UserCoins.user_id == user_id).first()
    if wallet:
        return wallet
    user = db.query(models.User).filter(models.User.id == user_id).first()
    initial_balance = user.coins_balance if user else 0
    wallet = models.UserCoins(
        user_id=user_id,
        balance=initial_balance,
        total_earned=initial_balance,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def add_transaction(
    db: Session,
    user_id: int,
    amount: int,
    transaction_type: str,
    reason: str,
    activity_metadata: str | None = None,
):
    transaction = models.CoinTransaction(
        user_id=user_id,
        amount=amount,
        transaction_type=transaction_type,
        reason=reason,
        activity_metadata=activity_metadata,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def apply_daily_bonus(db: Session, user_id: int, base_bonus: int):
    wallet = get_or_create_wallet(db, user_id)
    today = date.today()
    if wallet.last_login_date == today:
        return wallet, 0

    if wallet.last_login_date and (today - wallet.last_login_date).days == 1:
        wallet.streak_count += 1
    else:
        wallet.streak_count = 1

    bonus = base_bonus + min(wallet.streak_count - 1, 5)
    wallet.balance += bonus
    wallet.total_earned += bonus
    wallet.last_login_date = today
    wallet.badge_level = _calculate_badge(wallet.total_earned)
    db.commit()
    db.refresh(wallet)

    add_transaction(db, user_id, bonus, "earn", "daily_login")
    return wallet, bonus


def spend_coins(db: Session, user_id: int, amount: int, reason: str, activity_metadata: str | None = None):
    wallet = get_or_create_wallet(db, user_id)
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if wallet.balance < amount:
        raise ValueError("Insufficient coins")
    wallet.balance -= amount
    wallet.total_spent += amount
    db.commit()
    db.refresh(wallet)
    add_transaction(db, user_id, -amount, "spend", reason, activity_metadata)
    return wallet


def apply_badge_label(wallet: models.UserCoins):
    wallet.badge_label = badge_label(wallet.badge_level)
    return wallet


def reward_for_order(db: Session, user_id: int, reward_coins: int):
    wallet = get_or_create_wallet(db, user_id)
    wallet.balance += reward_coins
    wallet.total_earned += reward_coins
    wallet.badge_level = _calculate_badge(wallet.total_earned)
    db.commit()
    db.refresh(wallet)
    add_transaction(db, user_id, reward_coins, "earn", "order_reward")
    return wallet


def _calculate_badge(total_earned: int) -> int:
    if total_earned >= 5000:
        return 3
    if total_earned >= 2000:
        return 2
    if total_earned >= 500:
        return 1
    return 0


def badge_label(badge_level: int) -> str:
    return {0: "Bronze", 1: "Silver", 2: "Gold", 3: "Platinum"}.get(badge_level, "Bronze")