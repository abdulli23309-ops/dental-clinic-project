"""
Centralized Role-Based Access Control (RBAC) & Permission Mapping.

Defines role hierarchies, allowed roles per system action/resource,
and validation helpers for both frontend navigation synchronization
and backend FastAPI route dependencies.
"""
from typing import Set

# Role group definitions (case-insensitive strings)
ADMIN_ROLES: Set[str] = {
    "admin",
    "super admin",
    "super_admin",
    "platform owner",
    "platform_owner",
    "practice manager",
    "practice_manager",
    "clinic branch manager",
    "clinic_branch_manager",
}

DOCTOR_ROLES: Set[str] = {
    "doctor",
}

RECEPTIONIST_ROLES: Set[str] = {
    "receptionist",
    "reception",
    "front_desk",
    "front desk",
}

NURSE_ROLES: Set[str] = {
    "nurse",
    "dental assistant",
    "dental_assistant",
}

CLEANER_ROLES: Set[str] = {
    "cleaner",
    "sterilization tech",
    "sterilization_tech",
}

# Consolidated resource permission sets:
# 1. Full Admin / Practice Manager (All endpoints)
PERM_FULL_ADMIN = ADMIN_ROLES

# 2. Team Directory: Doctors and Admins
PERM_VIEW_TEAM = ADMIN_ROLES | DOCTOR_ROLES
PERM_MANAGE_TEAM = ADMIN_ROLES

# 3. Appointments & Scheduling:
# - View/Manage: Admin, Doctor, Receptionist
# - View schedule: Nurse
PERM_VIEW_APPOINTMENTS = ADMIN_ROLES | DOCTOR_ROLES | RECEPTIONIST_ROLES | NURSE_ROLES
PERM_MANAGE_APPOINTMENTS = ADMIN_ROLES | DOCTOR_ROLES | RECEPTIONIST_ROLES

# 4. Clinical Documentation & Note Templates: Doctors and Admins
PERM_CLINICAL_NOTES = ADMIN_ROLES | DOCTOR_ROLES

# 5. Patient Charts & Medical Alerts: Doctors, Nurses, and Admins
PERM_PATIENT_CHARTS = ADMIN_ROLES | DOCTOR_ROLES | NURSE_ROLES

# 6. Clinic Locations: Viewable by all clinical/reception staff, modifiable only by Admin
PERM_VIEW_LOCATIONS = ADMIN_ROLES | DOCTOR_ROLES | RECEPTIONIST_ROLES | NURSE_ROLES
PERM_MANAGE_LOCATIONS = ADMIN_ROLES

# 7. Executive Reports & Financial CSV Exports: Strictly Admin / Practice Manager
PERM_REPORTS = ADMIN_ROLES

# 8. Audit Trail Viewer: Strictly Admin / Practice Manager
PERM_AUDIT_LOGS = ADMIN_ROLES

# 9. Staff Account Management (Users): Strictly Admin / Practice Manager
PERM_USER_MANAGEMENT = ADMIN_ROLES

# 10. System Settings, Roles & Integrations: Strictly Admin / Practice Manager
PERM_SYSTEM_SETTINGS = ADMIN_ROLES

# 11. My Schedule: Accessible to all active staff members
PERM_MY_SCHEDULE = ADMIN_ROLES | DOCTOR_ROLES | RECEPTIONIST_ROLES | NURSE_ROLES | CLEANER_ROLES


def is_role_permitted(user_role: str, allowed_set: Set[str]) -> bool:
    """Case-insensitive role membership check."""
    if not user_role:
        return False
    normalized = user_role.strip().lower()
    return normalized in {r.strip().lower() for r in allowed_set}

