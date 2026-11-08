# Fix auth CSRF - Step 2: Add CSRF endpoint before /me
with open('e:/dental clinic project/backend/app/api/v1/endpoints/auth.py', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 3. Add CSRF endpoint before /me
csrf_code = '\n\n@router.get(\'/csrf\')\nasync def get_csrf_token(response: Response) -> Dict[str, str]:\n    token = generate_csrf_token()\n    response.set_cookie(\n        key=\'marlow_csrf_token\',\n        value=token,\n        httponly=True,\n        secure=settings.COOKIE_SECURE,\n        samesite=settings.COOKIE_SAMESITE,\n        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,\n        path=\'/\',\n        domain=settings.COOKIE_DOMAIN,\n    )\n    return {\'csrfToken\': token}\n\n\n@router.get(\'/me\'\n'

if 'def get_csrf_token' not in content:
    content = content.replace('@router.get(\'/me\'', csrf_code)

with open('e:/dental clinic project/backend/app/api/v1/endpoints/auth.py', 'w', encoding='utf-8', errors='ignore') as f:
    f.write(content)

print('Step 2 Done')