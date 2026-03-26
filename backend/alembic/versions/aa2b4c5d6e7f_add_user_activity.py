"""Add user activity table

Revision ID: aa2b4c5d6e7f
Revises: 8f1a3c2d4e5f
Create Date: 2026-03-24 08:19:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "aa2b4c5d6e7f"
down_revision = "8f1a3c2d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_activity",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("activity_type", sa.String(), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("user_activity")