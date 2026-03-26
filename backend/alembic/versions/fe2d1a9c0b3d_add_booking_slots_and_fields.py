"""Add booking slots and fields

Revision ID: fe2d1a9c0b3d
Revises: f2a1c0b9d7e8
Create Date: 2026-03-24 07:34:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "fe2d1a9c0b3d"
down_revision = "f2a1c0b9d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("original_booking_time", sa.DateTime(), nullable=True))
    op.add_column("bookings", sa.Column("buyer_notes", sa.String(), nullable=True))
    op.add_column("bookings", sa.Column("seller_notes", sa.String(), nullable=True))
    op.add_column("bookings", sa.Column("reschedule_requested", sa.Integer(), nullable=True, server_default="0"))

    op.create_table(
        "booking_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=True),
        sa.Column("listing_id", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("booking_slots")
    op.drop_column("bookings", "reschedule_requested")
    op.drop_column("bookings", "seller_notes")
    op.drop_column("bookings", "buyer_notes")
    op.drop_column("bookings", "original_booking_time")