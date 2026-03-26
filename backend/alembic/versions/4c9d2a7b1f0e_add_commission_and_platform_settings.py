"""Add commission fields and platform settings

Revision ID: 4c9d2a7b1f0e
Revises: 6f2c7d1b9a4e
Create Date: 2026-02-12 19:18:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "4c9d2a7b1f0e"
down_revision = "6f2c7d1b9a4e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("commission_amount", sa.Float(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("seller_earning", sa.Float(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("platform_earning", sa.Float(), nullable=False, server_default="0"))

    op.add_column("users", sa.Column("coins_balance", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("last_login_bonus_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("preferred_language", sa.String(length=10), nullable=False, server_default="en"))
    op.add_column("users", sa.Column("preferred_currency", sa.String(length=10), nullable=False, server_default="INR"))

    op.create_table(
        "platform_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("commission_percent", sa.Float(), nullable=False, server_default="5"),
        sa.Column("distance_weight", sa.Float(), nullable=False, server_default="0.4"),
        sa.Column("rating_weight", sa.Float(), nullable=False, server_default="0.2"),
        sa.Column("trust_weight", sa.Float(), nullable=False, server_default="0.15"),
        sa.Column("trending_weight", sa.Float(), nullable=False, server_default="0.15"),
        sa.Column("new_seller_weight", sa.Float(), nullable=False, server_default="0.1"),
        sa.Column("coin_reward_percent", sa.Float(), nullable=False, server_default="5"),
        sa.Column("daily_login_bonus", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("coin_value_in_rupees", sa.Float(), nullable=False, server_default="1"),
        sa.Column("default_currency", sa.String(length=10), nullable=False, server_default="INR"),
        sa.Column("exchange_rate_usd", sa.Float(), nullable=False, server_default="83"),
        sa.Column("exchange_rate_inr", sa.Float(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    op.execute(
        "INSERT INTO platform_settings (commission_percent, distance_weight, rating_weight, trust_weight, trending_weight, new_seller_weight, coin_reward_percent, daily_login_bonus, coin_value_in_rupees, default_currency, exchange_rate_usd, exchange_rate_inr) "
        "VALUES (5, 0.4, 0.2, 0.15, 0.15, 0.1, 5, 2, 1, 'INR', 83, 1)"
    )


def downgrade() -> None:
    op.drop_table("platform_settings")
    op.drop_column("orders", "platform_earning")
    op.drop_column("orders", "seller_earning")
    op.drop_column("orders", "commission_amount")
    op.drop_column("users", "last_login_bonus_date")
    op.drop_column("users", "coins_balance")
    op.drop_column("users", "preferred_currency")
    op.drop_column("users", "preferred_language")