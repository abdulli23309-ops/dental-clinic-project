"""complete scheduling and booking

Revision ID: g1h2i3j4k5l6
Revises: f6a7b8c9d0eb
Create Date: 2026-11-01 19:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'f6a7b8c9d0eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update clinic_working_hours: add is_24_hours and periods_json
    op.add_column('clinic_working_hours', sa.Column('is_24_hours', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('clinic_working_hours', sa.Column('periods_json', sa.Text(), nullable=True))

    # 2. Update clinic_booking_settings: add cancellation_auto_cutoff_hours, booking_horizon_days, inter_branch_travel_buffer_minutes
    op.add_column('clinic_booking_settings', sa.Column('cancellation_auto_cutoff_hours', sa.Integer(), nullable=False, server_default=sa.text('24')))
    op.add_column('clinic_booking_settings', sa.Column('booking_horizon_days', sa.Integer(), nullable=False, server_default=sa.text('15')))
    op.add_column('clinic_booking_settings', sa.Column('inter_branch_travel_buffer_minutes', sa.Integer(), nullable=False, server_default=sa.text('30')))

    # 3. Create team_member_clinics table (Doctor Multi-Branch Assignments)
    op.create_table(
        'team_member_clinics',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('team_member_id', sa.Uuid(as_uuid=True), sa.ForeignKey('team_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('clinic_id', sa.Uuid(as_uuid=True), sa.ForeignKey('clinics.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint('team_member_id', 'clinic_id', name='uq_team_member_clinic'),
    )
    op.create_index('ix_team_member_clinics_team_member_id', 'team_member_clinics', ['team_member_id'])
    op.create_index('ix_team_member_clinics_clinic_id', 'team_member_clinics', ['clinic_id'])

    # Backfill team_member_clinics from existing team_members.clinic_id or location_id
    op.execute("""
        INSERT INTO team_member_clinics (id, team_member_id, clinic_id, is_active, is_primary, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            tm.id,
            COALESCE(tm.clinic_id, tm.location_id),
            tm.is_active,
            true,
            now(),
            now()
        FROM team_members tm
        WHERE COALESCE(tm.clinic_id, tm.location_id) IS NOT NULL
          AND EXISTS (SELECT 1 FROM clinics c WHERE c.id = COALESCE(tm.clinic_id, tm.location_id))
        ON CONFLICT (team_member_id, clinic_id) DO NOTHING;
    """)

    # 4. Update service_providers table (Doctor-Service Assignments)
    op.add_column('service_providers', sa.Column('clinic_id', sa.Uuid(as_uuid=True), sa.ForeignKey('clinics.id', ondelete='CASCADE'), nullable=True))
    op.add_column('service_providers', sa.Column('custom_duration_minutes', sa.Integer(), nullable=True))
    op.add_column('service_providers', sa.Column('buffer_minutes', sa.Integer(), nullable=True))
    op.add_column('service_providers', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('service_providers', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    op.create_index('ix_service_providers_clinic_id', 'service_providers', ['clinic_id'])

    # 5. Update provider_availability table (Draft vs Published schedules, multi-breaks)
    op.add_column('provider_availability', sa.Column('is_draft', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('provider_availability', sa.Column('breaks_json', sa.Text(), nullable=True))
    op.add_column('provider_availability', sa.Column('published_at', sa.DateTime(timezone=True), nullable=True))

    # 6. Create doctor_schedule_overrides table (Date-Specific Overrides)
    op.create_table(
        'doctor_schedule_overrides',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('team_member_id', sa.Uuid(as_uuid=True), sa.ForeignKey('team_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('clinic_id', sa.Uuid(as_uuid=True), sa.ForeignKey('clinics.id', ondelete='CASCADE'), nullable=True),
        sa.Column('override_date', sa.Date(), nullable=False),
        sa.Column('override_type', sa.String(50), nullable=False, server_default=sa.text("'unavailable'")),
        sa.Column('is_draft', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('shifts_json', sa.Text(), nullable=True),
        sa.Column('breaks_json', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_doctor_schedule_overrides_team_member_id', 'doctor_schedule_overrides', ['team_member_id'])
    op.create_index('ix_doctor_schedule_overrides_clinic_id', 'doctor_schedule_overrides', ['clinic_id'])
    op.create_index('ix_doctor_schedule_overrides_override_date', 'doctor_schedule_overrides', ['override_date'])

    # 7. Create appointment_categories table (Special Appointment Categories & Approval Settings)
    op.create_table(
        'appointment_categories',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint('code', name='uq_appointment_categories_code'),
    )
    op.create_index('ix_appointment_categories_code', 'appointment_categories', ['code'])

    # Seed default appointment categories
    op.execute("""
        INSERT INTO appointment_categories (id, name, code, description, requires_approval, is_active, created_at, updated_at)
        VALUES 
            (gen_random_uuid(), 'General Dentistry', 'general', 'Standard diagnostic and preventative appointments', false, true, now(), now()),
            (gen_random_uuid(), 'Routine Cleaning', 'cleaning', 'Dental hygiene, plaque removal, and routine cleanings', false, true, now(), now()),
            (gen_random_uuid(), 'Implant Consultation', 'implant_consultation', 'Specialized surgical and restorative implant assessments requiring staff review', true, true, now(), now()),
            (gen_random_uuid(), 'Orthodontic Consultation', 'ortho_consultation', 'Braces and clear aligner specialist evaluations requiring approval', true, true, now(), now()),
            (gen_random_uuid(), 'Emergency Care', 'emergency', 'Urgent dental triage and immediate pain relief', false, true, now(), now())
        ON CONFLICT (code) DO NOTHING;
    """)

    # 8. Link services and bookings to appointment_categories
    op.add_column('services', sa.Column('category_id', sa.Uuid(as_uuid=True), sa.ForeignKey('appointment_categories.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_services_category_id', 'services', ['category_id'])

    op.add_column('bookings', sa.Column('category_id', sa.Uuid(as_uuid=True), sa.ForeignKey('appointment_categories.id', ondelete='SET NULL'), nullable=True))
    op.add_column('bookings', sa.Column('approval_required', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('bookings', sa.Column('approved_by_user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('bookings', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.create_index('ix_bookings_category_id', 'bookings', ['category_id'])

    # 9. Create reschedule_requests table
    op.create_table(
        'reschedule_requests',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('booking_id', sa.Uuid(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requested_date', sa.Date(), nullable=False),
        sa.Column('requested_time', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('staff_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by_user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_reschedule_requests_booking_id', 'reschedule_requests', ['booking_id'])
    op.create_index('ix_reschedule_requests_status', 'reschedule_requests', ['status'])

    # 10. Create cancellation_requests table
    op.create_table(
        'cancellation_requests',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('booking_id', sa.Uuid(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('hours_before_appointment', sa.Float(), nullable=True),
        sa.Column('is_auto_accepted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('staff_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by_user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_cancellation_requests_booking_id', 'cancellation_requests', ['booking_id'])
    op.create_index('ix_cancellation_requests_status', 'cancellation_requests', ['status'])


def downgrade() -> None:
    op.drop_index('ix_cancellation_requests_status', table_name='cancellation_requests')
    op.drop_index('ix_cancellation_requests_booking_id', table_name='cancellation_requests')
    op.drop_table('cancellation_requests')

    op.drop_index('ix_reschedule_requests_status', table_name='reschedule_requests')
    op.drop_index('ix_reschedule_requests_booking_id', table_name='reschedule_requests')
    op.drop_table('reschedule_requests')

    op.drop_index('ix_bookings_category_id', table_name='bookings')
    op.drop_column('bookings', 'rejection_reason')
    op.drop_column('bookings', 'approved_at')
    op.drop_column('bookings', 'approved_by_user_id')
    op.drop_column('bookings', 'approval_required')
    op.drop_column('bookings', 'category_id')

    op.drop_index('ix_services_category_id', table_name='services')
    op.drop_column('services', 'category_id')

    op.drop_index('ix_appointment_categories_code', table_name='appointment_categories')
    op.drop_table('appointment_categories')

    op.drop_index('ix_doctor_schedule_overrides_override_date', table_name='doctor_schedule_overrides')
    op.drop_index('ix_doctor_schedule_overrides_clinic_id', table_name='doctor_schedule_overrides')
    op.drop_index('ix_doctor_schedule_overrides_team_member_id', table_name='doctor_schedule_overrides')
    op.drop_table('doctor_schedule_overrides')

    op.drop_column('provider_availability', 'published_at')
    op.drop_column('provider_availability', 'breaks_json')
    op.drop_column('provider_availability', 'is_draft')

    op.drop_index('ix_service_providers_clinic_id', table_name='service_providers')
    op.drop_column('service_providers', 'updated_at')
    op.drop_column('service_providers', 'is_active')
    op.drop_column('service_providers', 'buffer_minutes')
    op.drop_column('service_providers', 'custom_duration_minutes')
    op.drop_column('service_providers', 'clinic_id')

    op.drop_index('ix_team_member_clinics_clinic_id', table_name='team_member_clinics')
    op.drop_index('ix_team_member_clinics_team_member_id', table_name='team_member_clinics')
    op.drop_table('team_member_clinics')

    op.drop_column('clinic_booking_settings', 'inter_branch_travel_buffer_minutes')
    op.drop_column('clinic_booking_settings', 'booking_horizon_days')
    op.drop_column('clinic_booking_settings', 'cancellation_auto_cutoff_hours')

    op.drop_column('clinic_working_hours', 'periods_json')
    op.drop_column('clinic_working_hours', 'is_24_hours')

