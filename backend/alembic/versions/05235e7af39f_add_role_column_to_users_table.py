"""Add role column to users table

Revision ID: 05235e7af39f
Revises: e29b4ec8cf9f
Create Date: 2026-02-03 19:29:54.617548

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '05235e7af39f'
down_revision = 'e29b4ec8cf9f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch mode for SQLite
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_payments_coupons', 'coupons', ['coupon_id'], ['id'])
    
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.Enum('ADMIN', 'SELLER', 'USER', 'DELIVERY_PARTNER', name='roleenum'), nullable=False, server_default='USER'))
        batch_op.drop_column('is_admin')


def downgrade() -> None:
    # Use batch mode for SQLite
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_admin', sa.BOOLEAN(), nullable=True))
        batch_op.drop_column('role')
    
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_payments_coupons', type_='foreignkey')
