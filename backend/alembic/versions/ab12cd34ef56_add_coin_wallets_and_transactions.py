"""add coin wallets and transactions

Revision ID: ab12cd34ef56
Revises: aa2b4c5d6e7f
Create Date: 2026-03-24 08:56:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "ab12cd34ef56"
down_revision = "aa2b4c5d6e7f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_coins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_spent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("streak_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_login_date", sa.Date(), nullable=True),
        sa.Column("badge_level", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "coin_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("transaction_type", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("metadata", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("coin_transactions")
    op.drop_table("user_coins")