"""Add category_id column to products and create categories table

Revision ID: c5350922bb29
Revises: 
Create Date: 2026-02-02 14:42:31.188922

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5350922bb29'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Now update products table using batch mode for SQLite
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_products_category_id', 'categories', ['category_id'], ['id'])
        batch_op.drop_column('category')


def downgrade() -> None:
    # Drop foreign key first using batch mode
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('category', sa.VARCHAR(), nullable=True))
        batch_op.drop_constraint('fk_products_category_id', type_='foreignkey')
        batch_op.drop_column('category_id')

    op.drop_index(op.f('ix_categories_id'), table_name='categories')
    op.drop_index(op.f('ix_categories_name'), table_name='categories')
    op.drop_table('categories')
