"""Add seller_id and status to orders

Revision ID: 9d1c8f7a4b2e
Revises: 3c1b7c6f2f4a
Create Date: 2026-02-11 18:03:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "9d1c8f7a4b2e"
down_revision = "3c1b7c6f2f4a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("seller_id", sa.Integer(), nullable=True))
    op.add_column(
        "orders",
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
    )
    op.create_foreign_key(
        "fk_orders_seller_id",
        "orders",
        "sellers",
        ["seller_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_orders_seller_id", "orders", type_="foreignkey")
    op.drop_column("orders", "status")
    op.drop_column("orders", "seller_id")