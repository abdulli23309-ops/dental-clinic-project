# Fix auth CSRF - Step 1: Add dependencies to logout decorator
with open('e:/dental clinic project/backend/app/api/v1/endpoints/auth.py', encoding='utf-8', errors='ignore') as f:
    content = f.read()

old = '@router.post("/logout")\nasync def logout('
new = '@router.post(\n    "/logout",\n    summary="Logout and clear authentication state",\n    dependencies=[Depends(get_current_user)],\n)\nasync def logout('
if 'dependencies=[Depends(get_current_user)]' not in content:
    content = content.replace(old, new)

# 2. Add _clear_csrf_cookie to logout body
content = content.replace(
    'Revokes the active refresh token and server-side session, and clears the HTTP-only cookie.',
    'Revokes the active refresh token and server-side session, and clears the HTTP-only cookie.'
)

with open('e:/dental clinic project/backend/app/api/v1/endpoints/auth.py', 'w', encoding='utf-8', errors='ignore') as f:
    f.write(content)

print('Step 1 Done')