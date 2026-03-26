"""add indexes for listings and booking slots

Revision ID: ce12ab34ef78
Revises: fe2d1a9c0b3d
Create Date: 2026-03-25 10:33:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "ce12ab34ef78"
down_revision = "fe2d1a9c0b3d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_listings_type", "listings", ["type"])
    op.create_index("ix_listings_seller_id", "listings", ["seller_id"])
    op.create_index("ix_booking_slots_listing_id", "booking_slots", ["listing_id"])


def downgrade() -> None:
    op.drop_index("ix_booking_slots_listing_id", table_name="booking_slots")
    op.drop_index("ix_listings_seller_id", table_name="listings")
    op.drop_index("ix_listings_type", table_name="listings")