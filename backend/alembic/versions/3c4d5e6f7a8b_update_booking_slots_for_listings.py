"""update booking slots for listings

Revision ID: 3c4d5e6f7a8b
Revises: 2b3c4d5e6f7a
Create Date: 2026-03-25 09:08:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "3c4d5e6f7a8b"
down_revision = "2b3c4d5e6f7a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("booking_slots") as batch_op:
        batch_op.add_column(sa.Column("listing_id", sa.Integer(), nullable=True))
        batch_op.alter_column("service_id", existing_type=sa.Integer(), nullable=True)
        batch_op.create_foreign_key("booking_slots_listing_id_fkey", "listings", ["listing_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("booking_slots") as batch_op:
        batch_op.drop_constraint("booking_slots_listing_id_fkey", type_="foreignkey")
        batch_op.drop_column("listing_id")
        batch_op.alter_column("service_id", existing_type=sa.Integer(), nullable=False)