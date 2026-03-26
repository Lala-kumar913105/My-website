"""Add payment fields to orders

Revision ID: 1f4a8b6c2d9e
Revises: 9d1c8f7a4b2e
Create Date: 2026-02-11 21:31:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "1f4a8b6c2d9e"
down_revision = "9d1c8f7a4b2e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("payment_method", sa.String(length=20), nullable=True))
    op.add_column(
        "orders",
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="pending"),
    )


def downgrade() -> None:
    op.drop_column("orders", "payment_status")
    op.drop_column("orders", "payment_method")