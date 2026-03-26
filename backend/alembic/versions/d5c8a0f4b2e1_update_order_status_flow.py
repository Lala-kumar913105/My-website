"""Update order status flow

Revision ID: d5c8a0f4b2e1
Revises: b3f8a9c2d1e4
Create Date: 2026-03-24 06:33:30.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d5c8a0f4b2e1"
down_revision = "b3f8a9c2d1e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE orders SET status = 'confirmed' WHERE status = 'accepted'")
    op.execute("UPDATE orders SET status = 'out_for_delivery' WHERE status = 'shipped'")


def downgrade() -> None:
    op.execute("UPDATE orders SET status = 'accepted' WHERE status = 'confirmed'")
    op.execute("UPDATE orders SET status = 'shipped' WHERE status = 'out_for_delivery'")