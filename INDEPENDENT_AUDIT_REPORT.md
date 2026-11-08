# Independent Audit Report — Marlow Dental

Date: 2026-11-04

This is a read-only audit of the current repository state. I did not modify any existing project files. I created this report as the only new file permitted under the audit instructions.

## Scope and method

I reviewed the live source tree, configuration, and runtime behavior of the current project snapshot, including:

- repository state and uncommitted changes
- backend/auth configuration and dependency wiring
- frontend auth/session flow and role-based routing
- test execution evidence

The audit is based on actual files and commands observed in the workspace, not on prior remediation history or prior AI-generated reports.

## Executive summary

The project is substantial and the frontend test suite is currently green, but the backend is not currently bootable in a clean environment because a required runtime dependency is absent. The configuration also exposes a weak default JWT secret in non-production settings, which is a real security posture issue even though it is not immediately fatal in local development.

Overall assessment: promising and well-structured codebase, but not deployment-ready as-is because of missing backend dependency and configuration hygiene issues.

## Findings

### 1) Backend startup fails in a clean environment because the `magic` dependency is missing

Evidence:

- [backend/app/infrastructure/storage/local_storage.py](</E:/dental clinic project/backend/app/infrastructure/storage/local_storage.py:1>) imports `magic`.
- [backend/requirements.txt](</E:/dental clinic project/backend/requirements.txt:1>) does not include `python-magic` or any equivalent `magic` package.
- Runtime validation command failed before tests could run:

  `python -m pytest tests/test_auth.py tests/test_reception_and_roles.py -q`

  Result:

  `ModuleNotFoundError: No module named 'magic'`

Impact:

- The backend cannot import its media/storage layer in a fresh Python environment.
- File-upload validation and media storage features are broken until the dependency is installed.
- This is a real operational blocker, not a theoretical issue.

Severity: High

### 2) The JWT secret default is insecure and is accepted by the app in non-production configurations

Evidence:

- [backend/app/core/config.py](</E:/dental clinic project/backend/app/core/config.py:13>) sets a default value:

  `JWT_SECRET_KEY: str = "dev-marlow-dental-insecure-secret-key-change-in-production-2026"`

- The validator in the same file only enforces a strong secret when `ENVIRONMENT == "production"`.
- This means a local or staging configuration that does not set the environment variable will silently run with a known, shared secret.

Impact:

- If a deployment copies the default local settings or forgets to provide a real secret, JWT forgery becomes feasible.
- The configuration is fail-open for non-production environments rather than fail-closed.

Severity: High

### 3) The project demonstrates strong frontend health, but backend validation is currently blocked by environment setup

Evidence:

- I ran the frontend test suite:

  `cd "E:\dental clinic project\frontend"; npm test -- --run`

  Result: 12 test files passed, 63 tests passed.

- I ran backend auth tests:

  `cd "E:\dental clinic project\backend"; python -m pytest tests/test_auth.py tests/test_reception_and_roles.py -q`

  Result: failed at import time with `ModuleNotFoundError: No module named 'magic'`.

Impact:

- Frontend behavior is currently better validated than backend runtime health.
- The repository is not in a consistent “green stack” state across environments because dependency setup is incomplete.

Severity: Medium

## Additional observations

### Role/workspace symmetry is clean and intentional

The role mapping appears consistent between backend authorization dependencies and frontend workspace routing:

- [backend/app/api/deps.py](</E:/dental clinic project/backend/app/api/deps.py:613>) defines `require_admin`, `require_receptionist`, and `require_doctor`.
- [frontend/src/lib/workspace.ts](</E:/dental clinic project/frontend/src/lib/workspace.ts:1>) mirrors those rules for navigation and route access.

This is a positive engineering pattern and helps reduce privilege drift between client and server.

### The repo currently contains a large number of uncommitted and historical audit artifacts

The working tree includes many modified files and untracked report artifacts, which is consistent with a long-running audit/remediation process. That does not by itself invalidate the code, but it does increase the importance of validating the actual current runtime state rather than relying on prior reports.

## Validation summary

- Frontend validation: PASS (`63/63` tests passed)
- Backend validation: FAIL in clean environment because of missing dependency (`python-magic` / `magic`)

## Conclusion

The application shows credible architecture and strong frontend test coverage, but the backend is not currently ready for reliable startup or deployment in a clean environment because of a missing dependency and an insecure default JWT secret strategy. These issues should be fixed before production sign-off.

No existing project source files were modified in this audit.
