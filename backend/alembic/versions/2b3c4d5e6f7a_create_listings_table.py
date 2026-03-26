"""create listings table

Revision ID: 2b3c4d5e6f7a
Revises: 1a2b3c4d5e6f
Create Date: 2026-03-25 08:47:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "2b3c4d5e6f7a"
down_revision = "1a2b3c4d5e6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("sellers.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(), nullable=True),
    )

    conn = op.get_bind()

    conn.execute(
        sa.text(
            """
            INSERT INTO listings (seller_id, title, description, price, type, stock, source_id, source_type)
            SELECT seller_id, name, description, price, 'product', stock, id, 'product'
            FROM products
            """
        )
    )

    conn.execute(
        sa.text(
            """
            INSERT INTO listings (seller_id, title, description, price, type, duration_minutes, source_id, source_type)
            SELECT seller_id, name, description, price, 'service', duration_minutes, id, 'service'
            FROM services
            """
        )
    )

    conn.execute(
        sa.text(
            """
            UPDATE booking_slots
            SET listing_id = (
                SELECT listings.id
                FROM listings
                WHERE listings.source_id = booking_slots.service_id
                  AND listings.source_type = 'service'
                LIMIT 1
            )
            WHERE booking_slots.service_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_table("listings")