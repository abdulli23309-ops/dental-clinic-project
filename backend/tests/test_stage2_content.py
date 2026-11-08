import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_stage2_reviews_crud(client_with_db: AsyncClient, admin_auth):
    headers = admin_auth["headers"]

    # 1. Admin creates a review
    review_payload = {
        "authorName": "Alice Johnson",
        "rating": 5,
        "text": "Exceptional dental care and very gentle clinicians.",
        "sourceLabel": "Google",
        "isPublished": True,
        "displayOrder": 0,
    }
    create_res = await client_with_db.post("/api/v1/admin/cms/reviews", json=review_payload, headers=headers)
    assert create_res.status_code == 201
    created_review = create_res.json()
    review_id = created_review["id"]
    assert created_review["authorName"] == "Alice Johnson"
    assert created_review["rating"] == 5

    # 2. Admin lists reviews
    list_res = await client_with_db.get("/api/v1/admin/cms/reviews", headers=headers)
    assert list_res.status_code == 200
    assert any(r["id"] == review_id for r in list_res.json())

    # 3. Public GET reviews (only published)
    pub_res = await client_with_db.get("/api/v1/public/reviews")
    assert pub_res.status_code == 200
    assert any(r["id"] == review_id for r in pub_res.json())

    # 4. Admin updates review
    update_res = await client_with_db.put(
        f"/api/v1/admin/cms/reviews/{review_id}",
        json={"rating": 4, "isPublished": False},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["rating"] == 4
    assert update_res.json()["isPublished"] is False

    # 5. Public GET no longer shows unpublished
    pub_res_after = await client_with_db.get("/api/v1/public/reviews")
    assert pub_res_after.status_code == 200
    assert not any(r["id"] == review_id for r in pub_res_after.json())

    # 6. Admin deletes review
    del_res = await client_with_db.delete(f"/api/v1/admin/cms/reviews/{review_id}", headers=headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_stage2_blogs_crud(client_with_db: AsyncClient, admin_auth):
    headers = admin_auth["headers"]

    # 1. Admin creates a blog post
    blog_payload = {
        "title": "Preventive Pediatric Care",
        "slug": "preventive-pediatric-care",
        "excerpt": "A short guide on establishing positive dental hygiene in children.",
        "body": "Early dental visits help children acclimate to the clinical environment...",
        "isPublished": True,
        "displayOrder": 0,
    }
    create_res = await client_with_db.post("/api/v1/admin/cms/blogs", json=blog_payload, headers=headers)
    assert create_res.status_code == 201
    created_blog = create_res.json()
    post_id = created_blog["id"]
    assert created_blog["slug"] == "preventive-pediatric-care"

    # 2. Admin lists blogs
    list_res = await client_with_db.get("/api/v1/admin/cms/blogs", headers=headers)
    assert list_res.status_code == 200
    assert any(b["id"] == post_id for b in list_res.json())

    # 3. Public GET blogs
    pub_res = await client_with_db.get("/api/v1/public/blogs")
    assert pub_res.status_code == 200
    assert any(b["id"] == post_id for b in pub_res.json())

    # 4. Admin updates blog
    update_res = await client_with_db.put(
        f"/api/v1/admin/cms/blogs/{post_id}",
        json={"title": "Updated Pediatric Care Guide", "isPublished": False},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Pediatric Care Guide"

    # 5. Admin deletes blog post
    del_res = await client_with_db.delete(f"/api/v1/admin/cms/blogs/{post_id}", headers=headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_stage2_social_links_crud(client_with_db: AsyncClient, admin_auth):
    headers = admin_auth["headers"]

    # 1. Admin creates a social link
    social_payload = {
        "platform": "instagram",
        "url": "https://instagram.com/marlowdental",
        "displayOrder": 1,
        "isActive": True,
    }
    create_res = await client_with_db.post("/api/v1/admin/cms/social-links", json=social_payload, headers=headers)
    assert create_res.status_code == 201
    created_link = create_res.json()
    link_id = created_link["id"]
    assert created_link["platform"] == "instagram"

    # 2. Admin lists social links
    list_res = await client_with_db.get("/api/v1/admin/cms/social-links", headers=headers)
    assert list_res.status_code == 200
    assert any(s["id"] == link_id for s in list_res.json())

    # 3. Public GET social links
    pub_res = await client_with_db.get("/api/v1/public/social-links")
    assert pub_res.status_code == 200
    assert any(s["id"] == link_id for s in pub_res.json())

    # 4. Admin updates social link
    update_res = await client_with_db.put(
        f"/api/v1/admin/cms/social-links/{link_id}",
        json={"platform": "facebook", "url": "https://facebook.com/marlowdental", "isActive": False},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["platform"] == "facebook"

    # 5. Admin deletes social link
    del_res = await client_with_db.delete(f"/api/v1/admin/cms/social-links/{link_id}", headers=headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_public_content_cache_headers_and_etag(client_with_db: AsyncClient):
    # 1. GET /api/v1/public/content returns Cache-Control and ETag
    res = await client_with_db.get("/api/v1/public/content")
    assert res.status_code == 200
    assert "cache-control" in res.headers
    assert "must-revalidate" in res.headers["cache-control"]
    assert "etag" in res.headers
    etag = res.headers["etag"]

    # 2. Subsequent GET with If-None-Match returns 304 Not Modified
    res_304 = await client_with_db.get("/api/v1/public/content", headers={"if-none-match": etag})
    assert res_304.status_code == 304
    assert res_304.headers["etag"] == etag


