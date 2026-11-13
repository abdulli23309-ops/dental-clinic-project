from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_activity_log_repository,
    get_db_session,
    get_refresh_token_repository,
    get_session_repository,
    get_user_repository,
    require_admin,
)
from app.infrastructure.database.orm_models import (
    ClinicalNoteORM,
    PatientAttachmentORM,
    PatientConsentORM,
    PrescriptionORM,
    ReferralLetterORM,
    UserORM,
)
from app.application.dtos.admin_user_dto import (
    AdminUserCreateRequest,
    AdminUserDto,
    AdminUserResetPasswordRequest,
    AdminUserRoleUpdateRequest,
    AdminUserStatusUpdateRequest,
    AdminUserUpdateRequest,
)
from app.core.security import hash_password, validate_password_strength
from app.domain.models.user import User, UserRole
from app.domain.repositories.user_repo import (
    RefreshTokenRepository,
    UserRepository,
    UserSessionRepository,
)
from app.infrastructure.repositories.postgres_activity_repo import (
    PostgresActivityLogRepository,
    record_activity,
)

router = APIRouter(prefix="/admin/users", tags=["Admin Staff Accounts"])

class BulkStatusRequest(BaseModel):
    userIds: List[UUID]
    isActive: bool

class BulkActionResponse(BaseModel):
    successCount: int
    failedCount: int
    updatedIds: List[UUID]
    message: str

ROLE_LOOKUP = {
    "admin": UserRole.ADMIN,
    "practice manager": UserRole.PRACTICE_MANAGER,
    "practice_manager": UserRole.PRACTICE_MANAGER,
    "doctor": UserRole.DOCTOR,
    "receptionist": UserRole.RECEPTIONIST,
    "nurse": UserRole.NURSE,
    "dental assistant": UserRole.DENTAL_ASSISTANT,
    "dental_assistant": UserRole.DENTAL_ASSISTANT,
    "cleaner": UserRole.CLEANER,
    "sterilization tech": UserRole.STERILIZATION_TECH,
    "sterilization_tech": UserRole.STERILIZATION_TECH,
    "platform owner": UserRole.PLATFORM_OWNER,
    "super admin": UserRole.SUPER_ADMIN,
    "clinic branch manager": UserRole.CLINIC_BRANCH_MANAGER,
    "patient": UserRole.PATIENT,
}


def _to_dto(user: User) -> AdminUserDto:
    return AdminUserDto(
        id=user.id,
        email=user.email,
        fullName=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        isActive=user.is_active,
        clinicId=user.clinic_id,
        teamMemberId=user.team_member_id,
        requiresPasswordChange=user.requires_password_change,
        createdAt=user.created_at,
        updatedAt=user.updated_at,
    )


@router.get("", response_model=List[AdminUserDto])
async def list_staff_accounts(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
) -> List[AdminUserDto]:
    """
    Lists staff accounts, optionally filtered by role and status.
    Admin only.
    """
    users = await user_repo.list_users(role=role, is_active=is_active)
    return [_to_dto(u) for u in users]


@router.post("", response_model=AdminUserDto, status_code=status.HTTP_201_CREATED)
async def create_staff_account(
    req: AdminUserCreateRequest,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> AdminUserDto:
    """
    Creates a new staff account (doctor, receptionist, admin).
    Enforces minimum password policy. If doctor is selected, links to practitioner team member profile.
    """
    # 1. Check existing email
    existing = await user_repo.get_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{req.email}' already exists.",
        )

    # 2. Validate role
    role_key = req.role.strip().lower()
    if role_key not in ROLE_LOOKUP:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{req.role}'. Allowed roles: {list(ROLE_LOOKUP.keys())}",
        )
    user_role = ROLE_LOOKUP[role_key]

    # 3. Validate password policy
    try:
        validate_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # 4. Create and save user
    new_user = User(
        email=req.email.strip().lower(),
        hashed_password=hash_password(req.password),
        full_name=req.fullName.strip(),
        role=user_role,
        is_active=True,
        clinic_id=req.clinicId,
        team_member_id=req.teamMemberId,
        requires_password_change=req.requiresPasswordChange,
    )
    saved = await user_repo.save(new_user)

    # 5. Audit log
    await record_activity(
        activity_repo,
        action="user_create",
        entity_type="user",
        entity_id=saved.id,
        user_id=current_admin.id,
        details={
            "email": saved.email,
            "role": saved.role.value,
            "team_member_id": str(saved.team_member_id) if saved.team_member_id else None,
        },
    )

    return _to_dto(saved)


@router.get("/{id}", response_model=AdminUserDto)
async def get_staff_account(
    id: UUID,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
) -> AdminUserDto:
    user = await user_repo.get_by_id(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found.")
    return _to_dto(user)


@router.patch("/{id}", response_model=AdminUserDto)
async def update_staff_account(
    id: UUID,
    req: AdminUserUpdateRequest,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> AdminUserDto:
    user = await user_repo.get_by_id(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found.")

    if req.fullName is not None:
        user.full_name = req.fullName.strip()
    if req.email is not None:
        user.email = req.email.strip().lower()
    if req.role is not None:
        role_key = req.role.strip().lower()
        if role_key not in ROLE_LOOKUP:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role '{req.role}'.",
            )
        user.role = ROLE_LOOKUP[role_key]
    if req.teamMemberId is not None:
        user.team_member_id = req.teamMemberId
    if req.clinicId is not None:
        user.clinic_id = req.clinicId

    saved = await user_repo.save(user)
    await record_activity(
        activity_repo,
        action="user_update",
        entity_type="user",
        entity_id=saved.id,
        user_id=current_admin.id,
        details={"updated_fields": [k for k, v in req.model_dump().items() if v is not None]},
    )
    return _to_dto(saved)


@router.patch("/{id}/status", response_model=AdminUserDto)
async def update_staff_status(
    id: UUID,
    req: AdminUserStatusUpdateRequest,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> AdminUserDto:
    """
    Deactivates or reactivates a staff account.
    Deactivation immediately revokes all active sessions and refresh tokens.
    """
    user = await user_repo.get_by_id(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found.")

    user.is_active = req.isActive
    saved = await user_repo.save(user)

    if not req.isActive:
        # Revoke all active sessions and refresh tokens
        await session_repo.revoke_all_for_user(user.id)
        await refresh_token_repo.revoke_all_for_user(user.id)

    action = "user_reactivate" if req.isActive else "user_deactivate"
    await record_activity(
        activity_repo,
        action=action,
        entity_type="user",
        entity_id=saved.id,
        user_id=current_admin.id,
        details={"is_active": req.isActive},
    )
    return _to_dto(saved)


@router.post("/bulk-status", response_model=BulkActionResponse)
async def bulk_update_staff_status(
    req: BulkStatusRequest,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> BulkActionResponse:
    """
    Batch updates active status for multiple staff accounts in a single transactional operation.
    """
    updated: List[UUID] = []
    failed: int = 0
    for uid in req.userIds:
        # Prevent admin deactivating their own account
        if uid == current_admin.id and not req.isActive:
            failed += 1
            continue
        user = await user_repo.get_by_id(uid)
        if not user:
            failed += 1
            continue
        user.is_active = req.isActive
        await user_repo.save(user)
        if not req.isActive:
            await session_repo.revoke_all_for_user(user.id)
            await refresh_token_repo.revoke_all_for_user(user.id)
        updated.append(uid)
        await record_activity(
            activity_repo,
            action="user_bulk_status",
            entity_type="user",
            entity_id=user.id,
            user_id=current_admin.id,
            details={"is_active": req.isActive, "bulk": True},
        )
    return BulkActionResponse(
        successCount=len(updated),
        failedCount=failed,
        updatedIds=updated,
        message=f"Successfully updated status for {len(updated)} staff accounts ({failed} skipped/failed).",
    )


@router.patch("/{id}/role", response_model=AdminUserDto)
async def update_staff_role(
    id: UUID,
    req: AdminUserRoleUpdateRequest,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> AdminUserDto:
    """
    Changes a staff account's role and optionally updates team member link.
    """
    user = await user_repo.get_by_id(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found.")

    role_key = req.role.strip().lower()
    if role_key not in ROLE_LOOKUP:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{req.role}'.",
        )
    old_role = user.role.value
    user.role = ROLE_LOOKUP[role_key]
    if req.teamMemberId is not None:
        user.team_member_id = req.teamMemberId

    saved = await user_repo.save(user)
    await record_activity(
        activity_repo,
        action="user_role_change",
        entity_type="user",
        entity_id=saved.id,
        user_id=current_admin.id,
        details={"from_role": old_role, "to_role": saved.role.value},
    )
    return _to_dto(saved)


@router.post("/{id}/reset-password")
async def reset_staff_password(
    id: UUID,
    req: AdminUserResetPasswordRequest,
    current_admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
):
    """
    Resets a staff account password.
    Enforces password strength policy.
    Sets requires_password_change = True (must change on next login).
    Revokes all existing active sessions.
    """
    user = await user_repo.get_by_id(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found.")

    try:
        validate_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    user.hashed_password = hash_password(req.password)
    user.requires_password_change = True
    saved = await user_repo.save(user)

    # Revoke sessions
    await session_repo.revoke_all_for_user(user.id)
    await refresh_token_repo.revoke_all_for_user(user.id)

    await record_activity(
        activity_repo,
        action="user_password_reset",
        entity_type="user",
        entity_id=saved.id,
        user_id=current_admin.id,
        details={"requires_password_change": True},
    )

    return {"message": "Password reset successfully. Active sessions revoked."}


async def _check_user_delete_eligibility(user_id: UUID, current_admin_id: UUID, session: AsyncSession) -> None:
    if user_id == current_admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own active account.",
        )

    # Check if target is last active admin
    target_user = await session.get(UserORM, user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found.")

    if target_user.role == "admin" and target_user.is_active:
        admin_count_stmt = select(func.count()).select_from(UserORM).where(
            UserORM.role == "admin",
            UserORM.is_active.is_(True),
        )
        active_admins = (await session.execute(admin_count_stmt)).scalar() or 0
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last remaining active Administrator.",
            )

    # Pre-flight check on RESTRICT clinical tables
    checks = [
        (ClinicalNoteORM, (ClinicalNoteORM.author_id == user_id) | (ClinicalNoteORM.signed_by_id == user_id), "clinical notes"),
        (PrescriptionORM, (PrescriptionORM.doctor_id == user_id) | (PrescriptionORM.signed_by_user_id == user_id), "prescriptions"),
        (PatientConsentORM, (PatientConsentORM.obtained_by == user_id) | (PatientConsentORM.voided_by == user_id), "patient consents"),
        (PatientAttachmentORM, (PatientAttachmentORM.uploaded_by == user_id) | (PatientAttachmentORM.voided_by == user_id), "patient attachments"),
        (ReferralLetterORM, (ReferralLetterORM.doctor_id == user_id) | (ReferralLetterORM.signed_by_user_id == user_id), "referral letters"),
    ]
    for model_cls, condition, label in checks:
        stmt = select(func.count()).select_from(model_cls).where(condition)
        count = (await session.execute(stmt)).scalar() or 0
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete staff account with associated legal {label}. Please Deactivate it instead.",
            )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_staff_account(
    id: UUID,
    current_admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> None:
    """Permanently deletes a staff account after foreign key and safety checks."""
    await _check_user_delete_eligibility(id, current_admin.id, session)

    # Revoke sessions and refresh tokens first
    await session_repo.revoke_all_for_user(id)
    await refresh_token_repo.revoke_all_for_user(id)

    # Nullify soft FKs: ActivityLogORM, TaskORM, MessageORM
    from app.infrastructure.database.orm_models import ActivityLogORM, TaskORM, MessageORM
    from sqlalchemy import update
    await session.execute(update(ActivityLogORM).where(ActivityLogORM.user_id == id).values(user_id=None))
    await session.execute(update(TaskORM).where(TaskORM.assigned_to_user_id == id).values(assigned_to_user_id=None))
    await session.execute(update(TaskORM).where(TaskORM.created_by_user_id == id).values(created_by_user_id=None))
    await session.execute(update(MessageORM).where(MessageORM.sender_id == id).values(sender_id=None))

    await user_repo.delete(id)
    await record_activity(
        activity_repo,
        action="user_deleted",
        entity_type="user",
        entity_id=id,
        user_id=current_admin.id,
        details={"deleted_user_id": str(id)},
    )
    return None


class BulkDeleteUsersRequest(BaseModel):
    userIds: List[UUID]


class BulkDeleteUsersResponse(BaseModel):
    deleted: int
    errors: List[str] = []


@router.post("/bulk-delete", response_model=BulkDeleteUsersResponse, dependencies=[Depends(require_admin)])
async def bulk_delete_staff_accounts(
    req: BulkDeleteUsersRequest,
    current_admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
    user_repo: UserRepository = Depends(get_user_repository),
    session_repo: UserSessionRepository = Depends(get_session_repository),
    refresh_token_repo: RefreshTokenRepository = Depends(get_refresh_token_repository),
    activity_repo: PostgresActivityLogRepository = Depends(get_activity_log_repository),
) -> BulkDeleteUsersResponse:
    """Bulk deletes staff accounts with individual guard evaluations."""
    deleted_count = 0
    errors: List[str] = []

    for uid in req.userIds:
        try:
            await _check_user_delete_eligibility(uid, current_admin.id, session)
            await session_repo.revoke_all_for_user(uid)
            await refresh_token_repo.revoke_all_for_user(uid)

            from app.infrastructure.database.orm_models import ActivityLogORM, TaskORM, MessageORM
            from sqlalchemy import update
            await session.execute(update(ActivityLogORM).where(ActivityLogORM.user_id == uid).values(user_id=None))
            await session.execute(update(TaskORM).where(TaskORM.assigned_to_user_id == uid).values(assigned_to_user_id=None))
            await session.execute(update(TaskORM).where(TaskORM.created_by_user_id == uid).values(created_by_user_id=None))
            await session.execute(update(MessageORM).where(MessageORM.sender_id == uid).values(sender_id=None))

            success = await user_repo.delete(uid)
            if success:
                deleted_count += 1
                await record_activity(
                    activity_repo,
                    action="user_bulk_deleted",
                    entity_type="user",
                    entity_id=uid,
                    user_id=current_admin.id,
                    details={"deleted_user_id": str(uid)},
                )
        except HTTPException as e:
            errors.append(f"User {uid}: {e.detail}")
        except Exception as e:
            errors.append(f"User {uid}: {str(e)}")

    return BulkDeleteUsersResponse(deleted=deleted_count, errors=errors)
