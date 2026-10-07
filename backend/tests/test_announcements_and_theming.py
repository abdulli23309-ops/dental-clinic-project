import pytest

from app.core.config import settings


@pytest.mark.asyncio
async def test_announcements_and_theming_flow(admin_auth):
    client = admin_auth["client"]
    headers = admin_auth["headers"]

    # 1. Update organization theming
    update_res = await client.put(
        f"{settings.API_V1_PREFIX}/admin/organization",
        headers=headers,
        json={
            "name": "Marlow Dental",
            "displayName": "Marlow Dental Complex",
            "primaryColor": "#0f766e",
            "secondaryColor": "#14b8a6",
            "backgroundColor": "#f8fafc",
            "primaryFont": "Plus Jakarta Sans",
            "secondaryFont": "Inter",
        },
    )
    assert update_res.status_code == 200
    org_data = update_res.json()
    assert org_data["primaryColor"] == "#0f766e"
    assert org_data["primaryFont"] == "Plus Jakarta Sans"

    # 2. Public organization endpoint returns theming
    pub_org_res = await client.get(f"{settings.API_V1_PREFIX}/public/organization")
    assert pub_org_res.status_code == 200
    pub_org = pub_org_res.json()
    assert pub_org["primaryColor"] == "#0f766e"
    assert pub_org["primaryFont"] == "Plus Jakarta Sans"

    # 3. Create marquee announcement
    create_res = await client.post(
        f"{settings.API_V1_PREFIX}/admin/announcements",
        headers=headers,
        json={
            "content": "Grand Opening of our West Loop branch this Friday!",
            "isActive": True,
            "displayOrder": 1,
        },
    )
    assert create_res.status_code == 201
    announcement = create_res.json()
    assert announcement["content"] == "Grand Opening of our West Loop branch this Friday!"
    announcement_id = announcement["id"]

    # 4. Public announcements endpoint returns active announcement
    pub_ann_res = await client.get(f"{settings.API_V1_PREFIX}/public/announcements")
    assert pub_ann_res.status_code == 200
    announcements = pub_ann_res.json()
    assert any(a["id"] == announcement_id for a in announcements)

    # 5. Delete announcement
    del_res = await client.delete(
        f"{settings.API_V1_PREFIX}/admin/announcements/{announcement_id}",
        headers=headers,
    )
    assert del_res.status_code == 204
