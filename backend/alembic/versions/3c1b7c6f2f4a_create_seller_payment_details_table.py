"""Create seller_payment_details table

Revision ID: 3c1b7c6f2f4a
Revises: a9907d43b5eb
Create Date: 2026-02-10 22:24:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "3c1b7c6f2f4a"
down_revision = "a9907d43b5eb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seller_payment_details",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("seller_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("upi_id", sa.String(length=100), nullable=False),
        sa.Column("account_name", sa.String(length=150), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["seller_id"], ["sellers.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_seller_payment_details_id", "seller_payment_details", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_seller_payment_details_id", table_name="seller_payment_details")
    op.drop_table("seller_payment_details")