from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import (
    get_blog_post_service,
    get_cms_service,
    get_gallery_service,
    get_review_service,
    get_social_link_service,
    require_admin,
)
from app.application.dtos.cms_dto import (
    BlogPostCreateRequest,
    BlogPostResponse,
    BlogPostUpdateRequest,
    FaqCreateRequest,
    FaqResponse,
    FaqUpdateRequest,
    GalleryImageCreateRequest,
    GalleryImageResponse,
    GalleryImageUpdateRequest,
    ReviewCreateRequest,
    ReviewResponse,
    ReviewUpdateRequest,
    SocialLinkCreateRequest,
    SocialLinkResponse,
    SocialLinkUpdateRequest,
)
from app.application.dtos.team_dto import ReorderRequest
from app.application.services.cms_service import CmsService
from app.application.services.content_service import (
    BlogPostService,
    GalleryService,
    ReviewService,
    SocialLinkService,
)
from app.domain.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin CMS"], dependencies=[Depends(require_admin)])

# ---------------------------------------------------------------------------
# Stage-2 admin endpoints: Reviews, Blog Posts, Social Links
# ---------------------------------------------------------------------------


def _review_to_response(r) -> ReviewResponse:
    """Converts a ReviewORM instance to a ReviewResponse DTO."""
    return ReviewResponse(
        id=r.id,
        authorName=r.author_name,
        rating=r.rating,
        text=r.review_text,
        reviewDate=r.review_date.isoformat() if r.review_date else None,
        sourceLabel=r.source_label,
        displayOrder=r.display_order,
        isPublished=r.is_published,
        createdAt=r.created_at,
        updatedAt=r.updated_at,
    )


def _blog_to_response(p) -> BlogPostResponse:
    """Converts a BlogPostORM instance to a BlogPostResponse DTO."""
    return BlogPostResponse(
        id=p.id,
        title=p.title,
        slug=p.slug,
        excerpt=p.excerpt,
        body=p.body,
        coverImageUrl=p.cover_image_url,
        publishedDate=p.published_date.isoformat() if p.published_date else None,
        displayOrder=p.display_order,
        isPublished=p.is_published,
        createdAt=p.created_at,
        updatedAt=p.updated_at,
    )


def _social_to_response(s) -> SocialLinkResponse:
    """Converts a SocialLinkORM instance to a SocialLinkResponse DTO."""
    return SocialLinkResponse(
        id=s.id,
        platform=s.platform,
        url=s.url,
        displayOrder=s.display_order,
        isActive=s.is_active,
        createdAt=s.created_at,
        updatedAt=s.updated_at,
    )


def _gallery_to_response(g) -> GalleryImageResponse:
    """Converts a GalleryImageORM instance to a GalleryImageResponse DTO."""
    return GalleryImageResponse(
        id=g.id,
        imageUrl=g.image_url,
        caption=g.caption,
        displayOrder=g.display_order,
        isActive=g.is_active,
        createdAt=g.created_at,
    )


# -- Reviews (Success Stories) --

@router.get("/cms/reviews", response_model=List[ReviewResponse])
@router.get("/reviews", response_model=List[ReviewResponse])
async def list_reviews(
    review_service: ReviewService = Depends(get_review_service),
) -> List[ReviewResponse]:
    """Lists all reviews including unpublished ones (admin view)."""
    items = await review_service.list_all()
    return [_review_to_response(r) for r in items]


@router.post("/cms/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    req: ReviewCreateRequest,
    review_service: ReviewService = Depends(get_review_service),
) -> ReviewResponse:
    """Creates a new review."""
    r = await review_service.create(req)
    return _review_to_response(r)


@router.put("/cms/reviews/{review_id}", response_model=ReviewResponse)
@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: UUID,
    req: ReviewUpdateRequest,
    review_service: ReviewService = Depends(get_review_service),
) -> ReviewResponse:
    """Updates an existing review."""
    r = await review_service.update(review_id, req)
    return _review_to_response(r)


@router.delete("/cms/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    review_service: ReviewService = Depends(get_review_service),
) -> None:
    """Permanently deletes a review."""
    await review_service.delete(review_id)


# -- Blog Posts --

@router.get("/cms/blogs", response_model=List[BlogPostResponse])
@router.get("/blogs", response_model=List[BlogPostResponse])
async def list_blog_posts(
    blog_service: BlogPostService = Depends(get_blog_post_service),
) -> List[BlogPostResponse]:
    """Lists all blog posts including unpublished ones (admin view)."""
    items = await blog_service.list_all()
    return [_blog_to_response(p) for p in items]


@router.post("/cms/blogs", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
@router.post("/blogs", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
async def create_blog_post(
    req: BlogPostCreateRequest,
    blog_service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostResponse:
    """Creates a new blog post."""
    p = await blog_service.create(req)
    return _blog_to_response(p)


@router.put("/cms/blogs/{post_id}", response_model=BlogPostResponse)
@router.put("/blogs/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    post_id: UUID,
    req: BlogPostUpdateRequest,
    blog_service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostResponse:
    """Updates an existing blog post."""
    p = await blog_service.update(post_id, req)
    return _blog_to_response(p)


@router.delete("/cms/blogs/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/blogs/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    post_id: UUID,
    blog_service: BlogPostService = Depends(get_blog_post_service),
) -> None:
    """Permanently deletes a blog post."""
    await blog_service.delete(post_id)


# -- Social Links --

@router.get("/cms/social-links", response_model=List[SocialLinkResponse])
@router.get("/social-links", response_model=List[SocialLinkResponse])
async def list_social_links(
    social_service: SocialLinkService = Depends(get_social_link_service),
) -> List[SocialLinkResponse]:
    """Lists all social links including inactive ones (admin view)."""
    items = await social_service.list_all()
    return [_social_to_response(s) for s in items]


@router.post("/cms/social-links", response_model=SocialLinkResponse, status_code=status.HTTP_201_CREATED)
@router.post("/social-links", response_model=SocialLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_social_link(
    req: SocialLinkCreateRequest,
    social_service: SocialLinkService = Depends(get_social_link_service),
) -> SocialLinkResponse:
    """Creates a new social link. Platform must be in the allowed list; URL must be https."""
    s = await social_service.create(req)
    return _social_to_response(s)


@router.put("/cms/social-links/{link_id}", response_model=SocialLinkResponse)
@router.put("/social-links/{link_id}", response_model=SocialLinkResponse)
async def update_social_link(
    link_id: UUID,
    req: SocialLinkUpdateRequest,
    social_service: SocialLinkService = Depends(get_social_link_service),
) -> SocialLinkResponse:
    """Updates an existing social link."""
    s = await social_service.update(link_id, req)
    return _social_to_response(s)


@router.delete("/cms/social-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/social-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_social_link(
    link_id: UUID,
    social_service: SocialLinkService = Depends(get_social_link_service),
) -> None:
    """Permanently deletes a social link."""
    await social_service.delete(link_id)


# -- Clinic Gallery --

@router.get("/cms/gallery", response_model=List[GalleryImageResponse])
@router.get("/gallery", response_model=List[GalleryImageResponse])
async def list_gallery_images(
    gallery_service: GalleryService = Depends(get_gallery_service),
) -> List[GalleryImageResponse]:
    """Lists all gallery images for admin."""
    images = await gallery_service.list_all()
    return [_gallery_to_response(img) for img in images]


@router.post("/cms/gallery", response_model=GalleryImageResponse, status_code=status.HTTP_201_CREATED)
@router.post("/gallery", response_model=GalleryImageResponse, status_code=status.HTTP_201_CREATED)
async def create_gallery_image(
    req: GalleryImageCreateRequest,
    gallery_service: GalleryService = Depends(get_gallery_service),
) -> GalleryImageResponse:
    """Creates a new gallery image."""
    img = await gallery_service.create(req)
    return _gallery_to_response(img)


@router.put("/cms/gallery/{image_id}", response_model=GalleryImageResponse)
@router.put("/gallery/{image_id}", response_model=GalleryImageResponse)
async def update_gallery_image(
    image_id: UUID,
    req: GalleryImageUpdateRequest,
    gallery_service: GalleryService = Depends(get_gallery_service),
) -> GalleryImageResponse:
    """Updates a gallery image."""
    img = await gallery_service.update(image_id, req)
    return _gallery_to_response(img)


@router.delete("/cms/gallery/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/gallery/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_image(
    image_id: UUID,
    gallery_service: GalleryService = Depends(get_gallery_service),
) -> None:
    """Permanently deletes a gallery image."""
    await gallery_service.delete(image_id)


@router.get("/cms/{section}")
async def get_cms_section(
    section: str,
    cms_service: CmsService = Depends(get_cms_service),
) -> Dict[str, Any]:
    """Retrieves content for a specific CMS section (general, homepage, about, contact, footer, seo)."""
    return await cms_service.get_section(section)


@router.put("/cms/{section}")
async def update_cms_section(
    section: str,
    content: Dict[str, Any],
    cms_service: CmsService = Depends(get_cms_service),
) -> Dict[str, Any]:
    """Updates and validates content for a specific CMS section."""
    return await cms_service.update_section(section, content)


@router.get("/faq", response_model=List[FaqResponse])
async def list_all_faqs(
    cms_service: CmsService = Depends(get_cms_service),
) -> List[FaqResponse]:
    """Lists all FAQ items including inactive ones for administrative review."""
    faqs = await cms_service.list_faqs(include_inactive=True)
    return [
        FaqResponse(
            id=f.id,
            category=f.category,
            question=f.question,
            answer=f.answer,
            displayOrder=f.display_order,
            isActive=f.is_active,
            createdAt=f.created_at,
            updatedAt=f.updated_at,
        )
        for f in faqs
    ]


@router.post("/faq", response_model=FaqResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(
    req: FaqCreateRequest,
    cms_service: CmsService = Depends(get_cms_service),
) -> FaqResponse:
    """Creates a new FAQ item."""
    f = await cms_service.create_faq(req)
    return FaqResponse(
        id=f.id,
        category=f.category,
        question=f.question,
        answer=f.answer,
        displayOrder=f.display_order,
        isActive=f.is_active,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


@router.put("/faq/{faq_id}", response_model=FaqResponse)
async def update_faq(
    faq_id: UUID,
    req: FaqUpdateRequest,
    cms_service: CmsService = Depends(get_cms_service),
) -> FaqResponse:
    """Updates an existing FAQ item."""
    f = await cms_service.update_faq(faq_id, req)
    return FaqResponse(
        id=f.id,
        category=f.category,
        question=f.question,
        answer=f.answer,
        displayOrder=f.display_order,
        isActive=f.is_active,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


@router.patch("/faq/{faq_id}/status", response_model=FaqResponse)
async def toggle_faq_status(
    faq_id: UUID,
    is_active: bool,
    cms_service: CmsService = Depends(get_cms_service),
) -> FaqResponse:
    """Soft deletes (deactivates) or reactivates an FAQ item."""
    f = await cms_service.set_faq_status(faq_id, is_active)
    return FaqResponse(
        id=f.id,
        category=f.category,
        question=f.question,
        answer=f.answer,
        displayOrder=f.display_order,
        isActive=f.is_active,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


@router.patch("/faq/reorder")
async def reorder_faqs(
    req: ReorderRequest,
    cms_service: CmsService = Depends(get_cms_service),
) -> dict:
    """Updates the display order of FAQ items."""
    await cms_service.reorder_faqs(req.orderedIds)
    return {"success": True}


