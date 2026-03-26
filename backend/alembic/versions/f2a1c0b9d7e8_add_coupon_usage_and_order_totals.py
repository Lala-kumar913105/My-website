"""Add coupon usage and order totals

Revision ID: f2a1c0b9d7e8
Revises: d5c8a0f4b2e1
Create Date: 2026-03-24 07:01:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f2a1c0b9d7e8"
down_revision = "d5c8a0f4b2e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("coupons", sa.Column("usage_limit", sa.Integer(), nullable=True))
    op.add_column("coupons", sa.Column("usage_count", sa.Integer(), nullable=True, server_default="0"))
    op.add_column("orders", sa.Column("discount_amount", sa.Float(), nullable=True, server_default="0"))
    op.add_column("orders", sa.Column("final_amount", sa.Float(), nullable=True, server_default="0"))
    op.add_column("orders", sa.Column("coupon_code", sa.String(), nullable=True))

    op.execute("UPDATE coupons SET usage_limit = 0 WHERE usage_limit IS NULL")
    op.execute("UPDATE coupons SET usage_count = 0 WHERE usage_count IS NULL")
    op.execute("UPDATE orders SET discount_amount = 0 WHERE discount_amount IS NULL")
    op.execute("UPDATE orders SET final_amount = total_amount WHERE final_amount IS NULL")


def downgrade() -> None:
    op.drop_column("orders", "coupon_code")
    op.drop_column("orders", "final_amount")
    op.drop_column("orders", "discount_amount")
    op.drop_column("coupons", "usage_count")
    op.drop_column("coupons", "usage_limit")