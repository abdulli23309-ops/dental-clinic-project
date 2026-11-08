"""dynamic roles management

Revision ID: f6a7b8c9d0eb
Revises: f5a6b7c8d9ea
Create Date: 2026-10-26 23:45:00.000000
"""

from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0eb'
down_revision: Union[str, None] = 'f5a6b7c8d9ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_ROLES = [
    ("Dentist", "Dentist", "General dental care and oral health", 1),
    ("Orthodontist", "Orthodontist", "Alignment of teeth and jaws", 2),
    ("Endodontist", "Endodontist", "Root canals and dental pulp therapy", 3),
    ("Periodontist", "Periodontist", "Gum diseases and dental implants", 4),
    ("Prosthodontist", "Prosthodontist", "Restoration and replacement of teeth", 5),
    ("Pediatric Dentist", "Pediatric Dentist", "Dental care for children and adolescents", 6),
    ("Oral Surgeon", "Oral Surgeon", "Surgical treatment of oral cavity and jaw", 7),
    ("Implantologist", "Implantologist", "Dental implants and bone augmentation", 8),
    ("Cosmetic Dentist", "Cosmetic Dentist", "Aesthetic and smile enhancement", 9),
    ("Hygienist", "Hygienist", "Preventative cleanings and periodontal hygiene", 10),
    ("Dental Assistant", "Dental Assistant", "Chairside clinical assisting and sterilization", 11),
    ("Receptionist", "Receptionist", "Front desk reception and patient coordination", 12),
    ("Practice Manager", "Practice Manager", "Clinic administration and operations management", 13),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Ensure 'roles' table exists
    tables = inspector.get_table_names()
    if 'roles' not in tables:
        op.create_table(
            'roles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column('name', sa.String(50), nullable=False, unique=True),
            sa.Column('display_name', sa.String(100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
            sa.Column('display_order', sa.Integer(), server_default=sa.text('0'), nullable=False),
            sa.Column('is_system', sa.Boolean(), server_default=sa.text('false'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        )
    else:
        columns = [c['name'] for c in inspector.get_columns('roles')]
        if 'display_name' not in columns:
            op.add_column('roles', sa.Column('display_name', sa.String(100), nullable=True))
        if 'is_active' not in columns:
            op.add_column('roles', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False))
        if 'display_order' not in columns:
            op.add_column('roles', sa.Column('display_order', sa.Integer(), server_default=sa.text('0'), nullable=False))

    # 2. Seed default roles
    existing_roles_res = conn.execute(sa.text("SELECT lower(name) FROM roles")).fetchall()
    existing_role_names = {r[0] for r in existing_roles_res}

    for name, display_name, description, order in DEFAULT_ROLES:
        if name.lower() not in existing_role_names:
            role_id = str(uuid.uuid4())
            conn.execute(
                sa.text(
                    "INSERT INTO roles (id, name, display_name, description, is_active, display_order, is_system, created_at, updated_at) "
                    "VALUES (:id, :name, :display_name, :description, true, :display_order, false, NOW(), NOW())"
                ),
                {
                    "id": role_id,
                    "name": name,
                    "display_name": display_name,
                    "description": description,
                    "display_order": order,
                }
            )
            existing_role_names.add(name.lower())

    # 3. Auto-create any existing roles from team_members if not present in roles table
    if 'team_members' in tables:
        team_roles_res = conn.execute(sa.text("SELECT DISTINCT role FROM team_members WHERE role IS NOT NULL")).fetchall()
        max_order = len(DEFAULT_ROLES)
        for (tm_role,) in team_roles_res:
            tm_role_clean = str(tm_role).strip()
            if tm_role_clean and tm_role_clean.lower() not in existing_role_names:
                max_order += 1
                role_id = str(uuid.uuid4())
                display_name = tm_role_clean.title()
                conn.execute(
                    sa.text(
                        "INSERT INTO roles (id, name, display_name, description, is_active, display_order, is_system, created_at, updated_at) "
                        "VALUES (:id, :name, :display_name, :description, true, :display_order, false, NOW(), NOW())"
                    ),
                    {
                        "id": role_id,
                        "name": tm_role_clean,
                        "display_name": display_name,
                        "description": f"Role auto-migrated from existing team member records",
                        "display_order": max_order,
                    }
                )
                existing_role_names.add(tm_role_clean.lower())

    # 4. Ensure display_name is not null for any existing rows
    conn.execute(sa.text("UPDATE roles SET display_name = initcap(name) WHERE display_name IS NULL"))
    op.alter_column('roles', 'display_name', nullable=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('roles')]
    if 'display_order' in columns:
        op.drop_column('roles', 'display_order')
    if 'is_active' in columns:
        op.drop_column('roles', 'is_active')
    if 'display_name' in columns:
        op.drop_column('roles', 'display_name')
