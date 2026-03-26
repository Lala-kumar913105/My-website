"""Extend reviews with order and seller

Revision ID: 6f2c7d1b9a4e
Revises: 8b2f1e9a6c3d
Create Date: 2026-02-12 19:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "6f2c7d1b9a4e"
down_revision = "8b2f1e9a6c3d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("order_id", sa.Integer(), nullable=True))
    op.add_column("reviews", sa.Column("seller_id", sa.Integer(), nullable=True))
    op.add_column("reviews", sa.Column("review_text", sa.Text(), nullable=True))

    op.execute("UPDATE reviews SET review_text = comment")

    op.create_foreign_key(
        "fk_reviews_order_id",
        "reviews",
        "orders",
        ["order_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_reviews_seller_id",
        "reviews",
        "sellers",
        ["seller_id"],
        ["id"],
    )

    op.drop_column("reviews", "comment")
    op.drop_column("reviews", "service_id")

    op.alter_column("reviews", "order_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.add_column("reviews", sa.Column("comment", sa.Text(), nullable=True))
    op.add_column("reviews", sa.Column("service_id", sa.Integer(), nullable=True))

    op.execute("UPDATE reviews SET comment = review_text")

    op.drop_constraint("fk_reviews_seller_id", "reviews", type_="foreignkey")
    op.drop_constraint("fk_reviews_order_id", "reviews", type_="foreignkey")

    op.drop_column("reviews", "review_text")
    op.drop_column("reviews", "seller_id")
    op.drop_column("reviews", "order_id")