"""Add notes to bookings

Revision ID: b3f8a9c2d1e4
Revises: 6f2c7d1b9a4e
Create Date: 2026-03-24 06:18:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b3f8a9c2d1e4"
down_revision = "6f2c7d1b9a4e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("notes", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "notes")