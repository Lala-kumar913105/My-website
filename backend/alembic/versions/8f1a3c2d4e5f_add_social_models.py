"""Add social models

Revision ID: 8f1a3c2d4e5f
Revises: fe2d1a9c0b3d
Create Date: 2026-03-24 07:53:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "8f1a3c2d4e5f"
down_revision = "fe2d1a9c0b3d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("media_url", sa.String(), nullable=False),
        sa.Column("media_type", sa.String(), nullable=False, server_default="image"),
        sa.Column("hashtags", sa.Text(), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "post_products",
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "likes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "stories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_url", sa.String(), nullable=False),
        sa.Column("media_type", sa.String(), nullable=False, server_default="image"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("stories")
    op.drop_table("likes")
    op.drop_table("comments")
    op.drop_table("post_products")
    op.drop_table("posts")