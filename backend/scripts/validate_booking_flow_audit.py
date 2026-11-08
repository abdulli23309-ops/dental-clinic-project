"""
CI Validator for docs/BOOKING_FLOW_AUDIT.md

Validates that every citation in docs/BOOKING_FLOW_AUDIT.md is real:
1. Every cited API route exists in app.openapi()
2. Every cited table.column exists in PostgreSQL information_schema
3. Every cited file path exists on disk
4. Every cited migration file exists in backend/alembic/versions/
5. Every cited pytest test exists in pytest collection
6. Every cited Playwright test exists in Playwright test suite
"""

import os
import re
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, "backend")
from app.main import app

AUDIT_DOC = "docs/BOOKING_FLOW_AUDIT.md"

def extract_citations(content: str):
    # Extract routes like /api/v1/... (avoiding file paths ending in .py)
    raw_routes = set(re.findall(r'(?:Endpoint[s]?|Route[s]?):?\s*(?:GET|POST|PATCH|PUT|DELETE)?\s*`?(/api/v1/[a-zA-Z0-9_\-\/{}\.]+)`?', content))
    # Also find any inline /api/v1 routes
    all_api_matches = set(re.findall(r'(/api/v1/[a-zA-Z0-9_\-\/{}\.]+)', content))
    routes = set()
    for r in raw_routes.union(all_api_matches):
        if not r.endswith(".py") and "endpoints" not in r:
            routes.add(r)
    
    # Extract file paths like frontend/... or backend/...
    files = set(re.findall(r'(?:frontend|backend)/[a-zA-Z0-9_\-\/\.]+\.[a-zA-Z0-9]+', content))
    
    # Extract table.column mentions like `leads.status`
    raw_table_cols = set(re.findall(r'`([a-z_]+)\.([a-z_]+)`', content))
    table_cols = set()
    for t, c in raw_table_cols:
        if t != "information_schema":
            table_cols.add((t, c))
    
    # Extract pytest test function names like `test_...`
    pytest_tests = set(re.findall(r'::(test_[a-zA-Z0-9_]+)', content))
    
    # Extract playwright test names
    playwright_tests = set(re.findall(r'\("([0-9]+[A-Z]?\.[^"]+)"\)', content))
    
    return routes, files, table_cols, pytest_tests, playwright_tests


async def validate():
    print(f"=== Validating {AUDIT_DOC} ===")
    if not os.path.exists(AUDIT_DOC):
        print(f"ERROR: {AUDIT_DOC} not found!")
        sys.exit(1)
        
    with open(AUDIT_DOC, "r", encoding="utf-8") as f:
        content = f.read()
        
    routes, files, table_cols, pytest_tests, playwright_tests = extract_citations(content)
    
    errors = []
    
    # 1. Validate routes
    openapi = app.openapi()
    openapi_paths = set(openapi.get("paths", {}).keys())
    print(f"\n1. Validating {len(routes)} cited routes against app.openapi()...")
    for r in sorted(routes):
        base_route = r.split("?")[0]
        if base_route not in openapi_paths:
            errors.append(f"Invalid OpenAPI Route: {r}")
            print(f"  [FAIL] {r}")
        else:
            print(f"  [PASS] {r}")
            
    # 2. Validate file paths
    print(f"\n2. Validating {len(files)} cited file paths against repository tree...")
    for f in sorted(files):
        if not os.path.exists(f):
            errors.append(f"Missing File Path: {f}")
            print(f"  [FAIL] {f}")
        else:
            print(f"  [PASS] {f}")

    # 3. Validate database table.columns
    print(f"\n3. Validating {len(table_cols)} cited table.columns against information_schema...")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        from app.core.config import settings
        db_url = str(settings.DATABASE_URL)
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'"))
        db_cols = set((r[0], r[1]) for r in res.fetchall())
        
    for t, c in sorted(table_cols):
        if (t, c) not in db_cols:
            errors.append(f"Invalid Table/Column: {t}.{c}")
            print(f"  [FAIL] `{t}.{c}`")
        else:
            print(f"  [PASS] `{t}.{c}`")

    # 4. Validate pytest tests
    print(f"\n4. Validating {len(pytest_tests)} cited pytest tests...")
    collected_file = "_scratch/pytest_collected_all.txt"
    if os.path.exists(collected_file):
        with open(collected_file, "r", encoding="utf-8", errors="ignore") as pf:
            pytest_output = pf.read()
    else:
        pytest_output = ""
        
    for pt in sorted(pytest_tests):
        if pt not in pytest_output:
            errors.append(f"Pytest test not found in collected suite: {pt}")
            print(f"  [FAIL] {pt}")
        else:
            print(f"  [PASS] {pt}")

    # 5. Validate playwright tests
    print(f"\n5. Validating {len(playwright_tests)} cited Playwright tests...")
    pw_spec = "frontend/e2e/booking-flow-roles-and-states.spec.ts"
    with open(pw_spec, "r", encoding="utf-8") as pwf:
        pw_content = pwf.read()
        
    for pwt in sorted(playwright_tests):
        if pwt not in pw_content:
            errors.append(f"Playwright test not found in {pw_spec}: {pwt}")
            print(f"  [FAIL] {pwt}")
        else:
            print(f"  [PASS] {pwt}")

    print("\n" + "=" * 50)
    if errors:
        print(f"VALIDATION FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("AUDIT TRUTH VERIFICATION PASSED: All citations are 100% verified.")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(validate())
