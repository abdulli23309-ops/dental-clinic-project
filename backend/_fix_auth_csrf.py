import re

with open('e:/dental clinic project/backend/app/api/v1/endpoints/auth.py', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Add _clear_csrf_cookie to logout
if '_clear_csrf_cookie(response)' not in content:
    content = content.replace(
        'Revokes the active refresh token and server-side session, and clears the HTTP-only cookie.',
        'Revokes the active refresh token and server-side session, and clears the HTTP-only cookie.\n    _clear_csrf_cookie(response)'
    )

# 2. Add dependencies to logout decorator
if 'dependencies=[Depends(get_current_user)]' not in content:
    content = re.sub(
        r'@router\.post\("/logout")\nasync def logout\(',
        '@router.post(\n    "/logout",\n    summary="Logout and clear authentication state",\n    dependencies=[Depends(get_current_user)],\n)\nasync def logout(',
        content
    )

# 3. Add CSRF endpoint before /me
if 'def get_csrf_token' not in content:
    csrf_endpoint = '''

@router.get(
    '/csrf',
    summary='Get CSRF token for state-changing requests',
    dependencies=[Depends(get_current_user)],
)
async def get_csrf_token(response: Response) -> Dict[str, str]:
    """Returns the current CSRF token. Frontend must use this token for state-changing requests."""
    token = generate_csrf_token()
    response.set_cookie(
        key='marlow_csrf_token',
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path='/',
        domain=settings.COOKIE_DOMAIN,
    )
    return {'csrfToken': token}
'''
    content = content.replace('@router.get("/me"', csrf_endpoint + '@router.get("/me"')

with open('e:/dental clinic project/backend/app/api/v1/endpoints/auth.py', 'w', encoding='utf-8', errors='ignore') as f:
    f.write(content)

print('Done')