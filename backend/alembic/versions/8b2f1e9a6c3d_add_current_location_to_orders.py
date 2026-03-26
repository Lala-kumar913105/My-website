"""Add current location to orders

Revision ID: 8b2f1e9a6c3d
Revises: 1f4a8b6c2d9e
Create Date: 2026-02-11 22:01:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "8b2f1e9a6c3d"
down_revision = "1f4a8b6c2d9e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("current_latitude", sa.Float(), nullable=True))
    op.add_column("orders", sa.Column("current_longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "current_longitude")
    op.drop_column("orders", "current_latitude")