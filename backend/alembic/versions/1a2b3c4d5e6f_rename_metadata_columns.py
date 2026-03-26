"""rename metadata columns

Revision ID: 1a2b3c4d5e6f
Revises: ab12cd34ef56
Create Date: 2026-03-25 07:46:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "1a2b3c4d5e6f"
down_revision = "ab12cd34ef56"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("user_activity") as batch_op:
        batch_op.alter_column("metadata", new_column_name="activity_metadata")

    with op.batch_alter_table("coin_transactions") as batch_op:
        batch_op.alter_column("metadata", new_column_name="activity_metadata")


def downgrade() -> None:
    with op.batch_alter_table("user_activity") as batch_op:
        batch_op.alter_column("activity_metadata", new_column_name="metadata")

    with op.batch_alter_table("coin_transactions") as batch_op:
        batch_op.alter_column("activity_metadata", new_column_name="metadata")