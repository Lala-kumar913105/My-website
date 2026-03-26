"""Add category_id to services

Revision ID: 2f2c2b5b6b8c
Revises: 7b1e0c18b3f7
Create Date: 2026-02-08 21:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2f2c2b5b6b8c'
down_revision = '7b1e0c18b3f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('services') as batch_op:
        batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_services_category_id', 'categories', ['category_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('services') as batch_op:
        batch_op.drop_constraint('fk_services_category_id', type_='foreignkey')
        batch_op.drop_column('category_id')