"""chamados de suporte

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-11 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('chamados',
    sa.Column('id_chamado', sa.Integer(), nullable=False),
    sa.Column('id_entrega', sa.Integer(), nullable=False),
    sa.Column('nome', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('assunto', sa.String(), nullable=False),
    sa.Column('mensagem', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('resposta', sa.String(), nullable=True),
    sa.Column('data_abertura', sa.DateTime(timezone=True), nullable=False),
    sa.Column('data_resposta', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['id_entrega'], ['entregas.id_entrega'], name=op.f('fk_chamados_id_entrega_entregas')),
    sa.PrimaryKeyConstraint('id_chamado', name=op.f('pk_chamados'))
    )
    op.create_index(op.f('ix_chamados_email'), 'chamados', ['email'], unique=False)
    op.create_index(op.f('ix_chamados_id_entrega'), 'chamados', ['id_entrega'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chamados_id_entrega'), table_name='chamados')
    op.drop_index(op.f('ix_chamados_email'), table_name='chamados')
    op.drop_table('chamados')
