"""avaliacoes de entrega

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-11 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, Sequence[str], None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('avaliacoes',
    sa.Column('id_avaliacao', sa.Integer(), nullable=False),
    sa.Column('id_entrega', sa.Integer(), nullable=False),
    sa.Column('nota', sa.Integer(), nullable=False),
    sa.Column('comentario', sa.String(), nullable=True),
    sa.Column('data_avaliacao', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['id_entrega'], ['entregas.id_entrega'], name=op.f('fk_avaliacoes_id_entrega_entregas')),
    sa.PrimaryKeyConstraint('id_avaliacao', name=op.f('pk_avaliacoes')),
    sa.UniqueConstraint('id_entrega', name=op.f('uq_avaliacoes_id_entrega'))
    )


def downgrade() -> None:
    op.drop_table('avaliacoes')
