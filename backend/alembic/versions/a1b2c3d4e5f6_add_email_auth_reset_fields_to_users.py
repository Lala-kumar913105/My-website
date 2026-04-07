"""add email auth reset fields to users

Revision ID: a1b2c3d4e5f6
Revises: 9dbde10ce09f
Create Date: 2026-04-07 12:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "9dbde10ce09f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("hashed_password", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("reset_password_token_hash", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("reset_password_expires_at", sa.DateTime(), nullable=True))
        batch_op.create_index("ix_users_reset_password_token_hash", ["reset_password_token_hash"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index("ix_users_reset_password_token_hash")
        batch_op.drop_column("reset_password_expires_at")
        batch_op.drop_column("reset_password_token_hash")
        batch_op.drop_column("hashed_password")
