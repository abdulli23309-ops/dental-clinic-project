import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_admin_roles_crud(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. List all roles (unpaginated backward-compatible list)
    resp = await client_with_db.get("/api/v1/admin/roles", headers=headers)
    assert resp.status_code == 200
    roles = resp.json()
    assert isinstance(roles, list)
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


@pytest.mark.asyncio
async def test_admin_roles_pagination(client_with_db: AsyncClient, test_session: AsyncSession, admin_auth):
    headers = admin_auth["headers"]

    # 1. Page 1 with per_page = 6
    p1_resp = await client_with_db.get("/api/v1/admin/roles?page=1&per_page=6", headers=headers)
    assert p1_resp.status_code == 200
    p1 = p1_resp.json()
    assert isinstance(p1, dict)
    assert "items" in p1
    assert p1["page"] == 1
    assert p1["per_page"] == 6
    assert len(p1["items"]) == 6
    assert p1["total"] >= 13
    assert p1["total_pages"] >= 3

    # 2. Page 2 with per_page = 6
    p2_resp = await client_with_db.get("/api/v1/admin/roles?page=2&per_page=6", headers=headers)
    assert p2_resp.status_code == 200
    p2 = p2_resp.json()
    assert p2["page"] == 2
    assert p2["per_page"] == 6
    assert len(p2["items"]) == 6

    # Verify distinct items between pages
    p1_ids = {r["id"] for r in p1["items"]}
    p2_ids = {r["id"] for r in p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)

    # 3. Beyond last page: empty items, valid metadata
    p_high_resp = await client_with_db.get("/api/v1/admin/roles?page=999&per_page=6", headers=headers)
    assert p_high_resp.status_code == 200
    p_high = p_high_resp.json()
    assert p_high["page"] == 999
    assert len(p_high["items"]) == 0
    assert p_high["total"] == p1["total"]

    # 4. Search with pagination
    search_resp = await client_with_db.get("/api/v1/admin/roles?search=dentist&page=1&per_page=12", headers=headers)
    assert search_resp.status_code == 200
    s_data = search_resp.json()
    assert s_data["page"] == 1
    assert all("dentist" in (r["name"] + r["displayName"]).lower() for r in s_data["items"])
