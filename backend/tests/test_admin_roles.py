import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_admin_roles_crud(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. List all roles
    resp = await client_with_db.get("/api/v1/admin/roles", headers=headers)
    assert resp.status_code == 200
    roles = resp.json()
    assert len(roles) >= 13
    assert any(r["name"] == "Dentist" for r in roles)

    # 2. Public endpoint to get active roles
    pub_resp = await client_with_db.get("/api/v1/public/roles")
    assert pub_resp.status_code == 200
    pub_roles = pub_resp.json()
    assert any(r["name"] == "Dentist" for r in pub_roles)

    # 3. Create a new role
    create_payload = {
        "name": "Sleep Dentist",
        "displayName": "Sleep Dentist",
        "description": "Specialized in sleep apnea and snoring oral appliances",
        "displayOrder": 20,
    }
    create_resp = await client_with_db.post("/api/v1/admin/roles", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    new_role = create_resp.json()
    assert new_role["name"] == "Sleep Dentist"
    assert new_role["displayName"] == "Sleep Dentist"
    role_id = new_role["id"]

    # 4. Update role
    update_payload = {
        "displayName": "Dental Sleep Medicine Specialist",
        "displayOrder": 25,
    }
    update_resp = await client_with_db.patch(f"/api/v1/admin/roles/{role_id}", json=update_payload, headers=headers)
    assert update_resp.status_code == 200
    updated_role = update_resp.json()
    assert updated_role["displayName"] == "Dental Sleep Medicine Specialist"
    assert updated_role["displayOrder"] == 25

    # 5. Soft delete role
    del_resp = await client_with_db.delete(f"/api/v1/admin/roles/{role_id}", headers=headers)
    assert del_resp.status_code == 204

    # 6. Verify role is inactive in admin list and excluded from public list
    list_resp = await client_with_db.get("/api/v1/admin/roles", headers=headers)
    assert list_resp.status_code == 200
    admin_list = list_resp.json()
    matched = [r for r in admin_list if r["id"] == role_id]
    assert len(matched) == 1
    assert matched[0]["isActive"] is False

    pub_resp2 = await client_with_db.get("/api/v1/public/roles")
    pub_list = pub_resp2.json()
    assert not any(r["id"] == role_id for r in pub_list)
