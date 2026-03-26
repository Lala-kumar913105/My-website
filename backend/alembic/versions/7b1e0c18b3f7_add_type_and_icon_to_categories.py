"""Add type and icon columns to categories

Revision ID: 7b1e0c18b3f7
Revises: c5350922bb29
Create Date: 2026-02-08 21:11:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7b1e0c18b3f7'
down_revision = 'c5350922bb29'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('categories') as batch_op:
        batch_op.add_column(sa.Column('type', sa.String(), nullable=False, server_default='product'))
        batch_op.add_column(sa.Column('icon', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('categories') as batch_op:
        batch_op.drop_column('icon')
        batch_op.drop_column('type')