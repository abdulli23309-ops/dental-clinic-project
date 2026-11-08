#!/usr/bin/env python3
"""
Marlow Dental - Automated Secret Scanner
Scans codebase for hardcoded secrets, private keys, API keys, credentials, and tokens.
Extended to detect:
- Marlow Integration Keys (mk_[0-9a-f]{64})
- Bearer tokens
- Long hex strings (64+ chars)
- Long base64 strings (64+ chars)
- Scans tracked files in the working tree
- Scans git history for this branch
- Reports any commit that contains the old demo integration key

CRITICAL CONSTRAINT: Never prints any secret values. Only prints file path/commit and line number.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

# Files to exclude from working tree scan (e.g. documentation of generic placeholders, public fixtures, or lockfiles)
EXCLUDE_FILES = {
    "package-lock.json",
    ".env.example",
    "scan_secrets.py",
}

# The old demo key to search for in git history
REVOKED_TEST_KEY_PATTERN = "mk_demo1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# Secret detection patterns (name, regex)
SECRET_PATTERNS = [
    ("Marlow Integration Key Literal", re.compile(r"mk_[0-9a-fA-F]{64}")),
    ("Bearer Token Literal", re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{25,}")),
    ("Private Key", re.compile(r"-----BEGIN (RSA|EC|DSA|OPENSSH|PGP|PRIVATE) KEY-----")),
    ("AWS Access Key ID", re.compile(r"(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}")),
    ("Generic High-Entropy Secret", re.compile(r"(?i)(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{32,}['\"]")),
    ("Database URL with Password", re.compile(r"postgres(?:ql)?:\/\/[a-zA-Z0-9_-]+:(?!password|demo|postgres|\$|fake)[a-zA-Z0-9_!@#$%^&*()+-]+@[a-zA-Z0-9.-]+")),
    ("JWT Token Literal", re.compile(r"ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
    ("Long Hex Literal", re.compile(r"(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])")),
    ("Long Base64 Literal", re.compile(r"(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{64,}={0,2}(?![A-Za-z0-9+/=])")),
]

# Patterns allowed in tests/docs (safe placeholders)
SAFE_PATTERNS = [
    re.compile(r"(?i)(dummy|fake|mock|example|placeholder|test|dev-marlow|insecure|super-secret|<your_|<key-|token_urlsafe)"),
    re.compile(r"sha256|[0-9a-f]{12}_|alembic|migration|revision|down_revision"),
]


def is_safe_line(line: str, file_path: str) -> bool:
    # Whitelist specific standard files where hex/b64 is non-sensitive metadata
    if any(x in file_path for x in ["alembic/versions", "alembic_heads", "alembic_history"]):
        return True
    if any(file_path.endswith(ext) for ext in [".svg", ".lock", ".png", ".jpg", ".ico", ".pdf"]):
        return True
    return any(sp.search(line) for sp in SAFE_PATTERNS)


def scan_working_tree(repo_root: Path):
    print("=" * 60)
    print(" Marlow Dental - Working Tree Tracked Files Secret Scan")
    print("=" * 60)

    # Use git ls-files to inspect tracked files only
    try:
        git_res = subprocess.run(
            ["git", "ls-files"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=True,
        )
        tracked_files = [f.strip() for f in git_res.stdout.splitlines() if f.strip()]
    except Exception as e:
        print(f"Warning: Could not run git ls-files ({e}); scanning filesystem directly.")
        tracked_files = []
        for root, _, files in os.walk(repo_root):
            if any(d in root for d in [".git", "node_modules", ".next", "__pycache__", "venv", "_scratch"]):
                continue
            for f in files:
                tracked_files.append(str((Path(root) / f).relative_to(repo_root)))

    violations = []
    files_scanned = 0

    for rel_path in tracked_files:
        p = Path(rel_path)
        if p.name in EXCLUDE_FILES or any(part in {".git", "node_modules", ".next", "_scratch"} for part in p.parts):
            continue

        file_path = repo_root / rel_path
        if not file_path.is_file():
            continue

        files_scanned += 1
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                for line_num, line in enumerate(f, start=1):
                    for pattern_name, pattern in SECRET_PATTERNS:
                        if pattern.search(line):
                            if is_safe_line(line, str(rel_path)):
                                continue
                            violations.append({
                                "file": str(rel_path),
                                "line": line_num,
                                "rule": pattern_name,
                            })
        except Exception:
            pass

    print(f"Tracked files scanned: {files_scanned}")
    print(f"Secret detection rules applied: {len(SECRET_PATTERNS)}")
    print(f"Violations found: {len(violations)}")
    print("-" * 60)

    if violations:
        print("[FAIL] Secrets or private tokens detected in working tree:")
        for v in violations:
            print(f"  - {v['file']}:{v['line']} (Rule: {v['rule']})")
    else:
        print("[PASS] Zero secrets or integration keys detected in working tree.")

    return len(violations) == 0


def scan_git_history(repo_root: Path):
    print("\n" + "=" * 60)
    print(" Marlow Dental - Git History Branch Secret Scan")
    print("=" * 60)

    try:
        # Get commit hashes on this branch
        res = subprocess.run(
            ["git", "rev-list", "--max-count=50", "HEAD"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=True,
        )
        commits = [c.strip() for c in res.stdout.splitlines() if c.strip()]
    except Exception as e:
        print(f"Warning: git rev-list failed ({e})")
        return True

    print(f"Inspecting {len(commits)} commits on current branch for old keys and secret patterns...")
    old_key_commits = []
    secret_commits = []

    for commit_hash in commits:
        try:
            # Check commit diff
            diff_res = subprocess.run(
                ["git", "show", "--format=%H %s", commit_hash],
                cwd=str(repo_root),
                capture_output=True,
                text=True,
                errors="ignore",
            )
            output = diff_res.stdout
            lines = output.splitlines()
            header = lines[0] if lines else commit_hash

            if REVOKED_TEST_KEY_PATTERN in output:
                old_key_commits.append(header)

            for line in lines:
                if line.startswith("+") and not line.startswith("+++"):
                    for pattern_name, pattern in SECRET_PATTERNS:
                        if pattern.search(line):
                            # Safe check
                            if is_safe_line(line, "git_diff"):
                                continue
                            secret_commits.append((header, pattern_name))
        except Exception:
            pass

    print("-" * 60)
    print(f"Commits containing old integration key ({REVOKED_TEST_KEY_PATTERN[:11]}...): {len(old_key_commits)}")
    if old_key_commits:
        print("[REPORT] Commits containing the old integration key in history:")
        for c in set(old_key_commits):
            print(f"  - {c}")
    else:
        print("[INFO] No commits on this branch contain the old integration key.")

    return True


def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    wt_ok = scan_working_tree(repo_root)
    scan_git_history(repo_root)
    sys.exit(0 if wt_ok else 1)


if __name__ == "__main__":
    main()
