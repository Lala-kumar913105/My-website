"""add location fields to services and listings

Revision ID: f7c9d4a8b2c1
Revises: ce12ab34ef78
Create Date: 2026-04-21 02:33:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f7c9d4a8b2c1"
down_revision = "ce12ab34ef78"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.add_column(sa.Column("latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("address", sa.String(length=300), nullable=True))

    with op.batch_alter_table("listings") as batch_op:
        batch_op.add_column(sa.Column("latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("address", sa.String(length=300), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("listings") as batch_op:
        batch_op.drop_column("address")
        batch_op.drop_column("longitude")
        batch_op.drop_column("latitude")

    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_column("address")
        batch_op.drop_column("longitude")
        batch_op.drop_column("latitude")
