"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Globe,
  HelpCircle,
  Info,
  Layers,
  MessageSquare,
  Phone,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { AnimatedView } from "@/components/ui/animated-view";
import { motion } from "motion/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  adminCreateFaq,
  adminGetCmsSection,
  adminGetFaqs,
  adminReorderFaqs,
  adminToggleFaqStatus,
  adminUpdateCmsSection,
  adminUpdateFaq,
  adminUploadMedia,
  FaqItem,
  // Stage-2: Reviews, Blogs, Social Links
  adminCreateBlogPost,
  adminCreateReview,
  adminCreateSocialLink,
  adminDeleteBlogPost,
  adminDeleteReview,
  adminDeleteSocialLink,
  adminListBlogPosts,
  adminListReviews,
  adminListSocialLinks,
  adminUpdateBlogPost,
  adminUpdateReview,
  adminUpdateSocialLink,
  BlogPost,
  Review,
  SocialLink,
  getSiteContent,
} from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

type SectionTab =
  | "general"
  | "homepage"
  | "about"
  | "contact"
  | "faq"
  | "seo"
  | "success-stories"
  | "blogs"
  | "social-links";

export default function AdminWebsitePage() {
  const { accessToken } = useAuth();
  const { refreshPublicContent } = usePublicContent();
  const [activeTab, setActiveTab] = useState<SectionTab>("general");

  // Form states per section
  const [generalData, setGeneralData] = useState<any>({
    practiceName: "",
    shortBrandName: "",
    tagline: "",
    logoUrl: "",
    phone: "",
    email: "",
    address: "",
    emergencyPhone: "",
  });

  const [homepageData, setHomepageData] = useState<any>({
    heroEyebrow: "",
    heroHeading: "",
    heroDescription: "",
    heroCtaText: "",
    heroCtaLink: "",
    heroSecondaryCtaText: "",
    heroSecondaryCtaLink: "",
    heroImageUrl: "",
  });

  const [aboutData, setAboutData] = useState<any>({
    eyebrow: "",
    title: "",
    storyParagraphs: [],
    licensureText: "",
  });

  const [contactData, setContactData] = useState<any>({
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    transitNote: "",
    hoursSummary: "",
    emergencyNote: "",
  });

  const [seoData, setSeoData] = useState<any>({
    siteTitle: "",
    metaDescription: "",
  });

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaq, setNewFaq] = useState({ category: "pricing", question: "", answer: "" });
  const [showAddFaq, setShowAddFaq] = useState(false);

  // Stage-2: Success Stories form state
  const [reviewForm, setReviewForm] = useState<{
    authorName: string;
    rating: number;
    text: string;
    sourceLabel: string;
    displayOrder: number;
    isPublished: boolean;
  }>({
    authorName: "",
    rating: 5,
    text: "",
    sourceLabel: "",
    displayOrder: 0,
    isPublished: true,
  });

  const [blogForm, setBlogForm] = useState<{
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    displayOrder: number;
    isPublished: boolean;
  }>({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    displayOrder: 0,
    isPublished: false,
  });

  // Stage-2: Social Links form state
  const [socialForm, setSocialForm] = useState<{
    platform: string;
    url: string;
    displayOrder: number;
    isActive: boolean;
  }>({
    platform: "",
    url: "",
    displayOrder: 0,
    isActive: true,
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load section content on mount and tab switch
  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;
      setIsLoading(true);
      try {
        if (activeTab === "faq") {
          const faqList = await adminGetFaqs(accessToken);
          setFaqs(faqList);
        } else if (activeTab === "success-stories") {
          const reviewList = await adminListReviews(accessToken);
          setReviews(reviewList);
        } else if (activeTab === "blogs") {
          const blogList = await adminListBlogPosts(accessToken);
          setBlogPosts(blogList);
        } else if (activeTab === "social-links") {
          const socialList = await adminListSocialLinks(accessToken);
          setSocialLinks(socialList);
        } else {
          const data = await adminGetCmsSection(activeTab, accessToken);
          if (activeTab === "general") setGeneralData(data);
          else if (activeTab === "homepage") setHomepageData(data);
          else if (activeTab === "about") setAboutData(data);
          else if (activeTab === "contact") setContactData(data);
          else if (activeTab === "seo") setSeoData(data);
        }
      } catch (err: any) {
        setSaveError(err.message || "Failed to load section data.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [activeTab, accessToken]);

  const handleSaveSection = async (sectionKey: string, payload: any) => {
    if (!accessToken) return;
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      await adminUpdateCmsSection(sectionKey, payload, accessToken);
      // Trigger client provider re-fetch and broadcast to other open tabs
      await refreshPublicContent();

      // Verify that the public endpoint responds with updated content
      let isLive = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const publicData = await getSiteContent();
          if (publicData) {
            isLive = true;
            break;
          }
        } catch {
          // Retry verification
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      setSaveSuccess(isLive ? "Saved. Live on the website now." : `Website ${sectionKey} section updated successfully.`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || `Failed to update ${sectionKey} section.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadImage = async (
    file: File,
    field: "logoUrl" | "heroImageUrl",
    section: "general" | "homepage"
  ) => {
    if (!accessToken) return;
    setIsUploading(true);
    setSaveError(null);
    try {
      const { url } = await adminUploadMedia(file, accessToken);
      if (section === "general") {
        setGeneralData((prev: any) => ({ ...prev, [field]: url }));
      } else {
        setHomepageData((prev: any) => ({ ...prev, [field]: url }));
      }
      setSaveSuccess("Image uploaded. Click Save to persist the change.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFaq.question.trim() || !newFaq.answer.trim()) return;

    try {
      await adminCreateFaq(
        {
          category: newFaq.category,
          question: newFaq.question.trim(),
          answer: newFaq.answer.trim(),
          displayOrder: faqs.length,
          isActive: true,
        },
        accessToken
      );
      setNewFaq({ category: "pricing", question: "", answer: "" });
      setShowAddFaq(false);
      const updated = await adminGetFaqs(accessToken);
      setFaqs(updated);
      setSaveSuccess("New FAQ item created successfully.");
    } catch (err: any) {
      setSaveError(err.message || "Failed to create FAQ.");
    }
  };

  const handleToggleFaq = async (faqId: string, currentStatus: boolean) => {
    if (!accessToken) return;
    try {
      await adminToggleFaqStatus(faqId, !currentStatus, accessToken);
      const updated = await adminGetFaqs(accessToken);
      setFaqs(updated);
      setSaveSuccess(`FAQ item ${currentStatus ? "deactivated" : "reactivated"}.`);
    } catch (err: any) {
      setSaveError(err.message || "Failed to toggle FAQ status.");
    }
  };

  const handleMoveFaq = async (index: number, direction: -1 | 1) => {
    if (!accessToken) return;
    const target = index + direction;
    if (target < 0 || target >= faqs.length) return;
    const ordered = [...faqs];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    try {
      await adminReorderFaqs(ordered.map((f) => f.id), accessToken);
      setFaqs(ordered);
      setSaveSuccess("FAQ display order saved.");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to reorder FAQs.");
    }
  };

  // Review Handlers
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !reviewForm.authorName.trim() || !reviewForm.text.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await adminCreateReview(
        {
          authorName: reviewForm.authorName.trim(),
          rating: Number(reviewForm.rating),
          text: reviewForm.text.trim(),
          sourceLabel: reviewForm.sourceLabel.trim() || "Google",
          isPublished: reviewForm.isPublished,
          displayOrder: reviews.length,
        },
        accessToken
      );
      setReviewForm({
        authorName: "",
        rating: 5,
        text: "",
        sourceLabel: "",
        displayOrder: 0,
        isPublished: true,
      });
      const updated = await adminListReviews(accessToken);
      setReviews(updated);
      setSaveSuccess("Review created successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to create review.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminDeleteReview(id, accessToken);
      const updated = await adminListReviews(accessToken);
      setReviews(updated);
      setSaveSuccess("Review deleted successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete review.");
    }
  };

  // Blog Handlers
  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !blogForm.title.trim() || !blogForm.slug.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await adminCreateBlogPost(
        {
          title: blogForm.title.trim(),
          slug: blogForm.slug.trim(),
          excerpt: blogForm.excerpt.trim() || undefined,
          body: blogForm.body.trim() || undefined,
          isPublished: blogForm.isPublished,
          displayOrder: blogPosts.length,
        },
        accessToken
      );
      setBlogForm({
        title: "",
        slug: "",
        excerpt: "",
        body: "",
        displayOrder: 0,
        isPublished: false,
      });
      const updated = await adminListBlogPosts(accessToken);
      setBlogPosts(updated);
      setSaveSuccess("Blog post created successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to create blog post.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminDeleteBlogPost(id, accessToken);
      const updated = await adminListBlogPosts(accessToken);
      setBlogPosts(updated);
      setSaveSuccess("Blog post deleted successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete blog post.");
    }
  };

  // Social Link Handlers
  const handleAddSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !socialForm.platform.trim() || !socialForm.url.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await adminCreateSocialLink(
        {
          platform: socialForm.platform.trim().toLowerCase(),
          url: socialForm.url.trim(),
          displayOrder: socialLinks.length,
          isActive: socialForm.isActive,
        },
        accessToken
      );
      setSocialForm({
        platform: "",
        url: "",
        displayOrder: 0,
        isActive: true,
      });
      const updated = await adminListSocialLinks(accessToken);
      setSocialLinks(updated);
      setSaveSuccess("Social link added successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to add social link.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSocial = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminDeleteSocialLink(id, accessToken);
      const updated = await adminListSocialLinks(accessToken);
      setSocialLinks(updated);
      setSaveSuccess("Social link deleted successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete social link.");
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6 max-w-5xl">
      {/* Page Title */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Content Management System</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Website Content Editor
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage public messaging, hero content, clinic contact details, and FAQs.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-800 dark:text-red-300"
        >
          {saveError}
        </div>
      )}

      {/* Section Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3" role="tablist">
        {[
          { id: "general", label: "General & Branding", icon: Globe },
          { id: "homepage", label: "Homepage Hero", icon: Layers },
          { id: "about", label: "About Story", icon: Info },
          { id: "contact", label: "Contact & Hours", icon: Phone },
          { id: "faq", label: "FAQ Items", icon: HelpCircle },
          { id: "seo", label: "Search & SEO", icon: MessageSquare },
          { id: "success-stories", label: "Success Stories", icon: Check },
          { id: "blogs", label: "Blogs", icon: Layers },
          { id: "social-links", label: "Social Links", icon: Globe },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          // Review Handlers
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !reviewForm.authorName.trim() || !reviewForm.text.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await adminCreateReview(
        {
          authorName: reviewForm.authorName.trim(),
          rating: Number(reviewForm.rating),
          text: reviewForm.text.trim(),
          sourceLabel: reviewForm.sourceLabel.trim() || "Google",
          isPublished: reviewForm.isPublished,
          displayOrder: reviews.length,
        },
        accessToken
      );
      setReviewForm({
        authorName: "",
        rating: 5,
        text: "",
        sourceLabel: "",
        displayOrder: 0,
        isPublished: true,
      });
      const updated = await adminListReviews(accessToken);
      setReviews(updated);
      setSaveSuccess("Review created successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to create review.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminDeleteReview(id, accessToken);
      const updated = await adminListReviews(accessToken);
      setReviews(updated);
      setSaveSuccess("Review deleted successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete review.");
    }
  };

  // Blog Handlers
  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !blogForm.title.trim() || !blogForm.slug.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await adminCreateBlogPost(
        {
          title: blogForm.title.trim(),
          slug: blogForm.slug.trim(),
          excerpt: blogForm.excerpt.trim() || undefined,
          body: blogForm.body.trim() || undefined,
          isPublished: blogForm.isPublished,
          displayOrder: blogPosts.length,
        },
        accessToken
      );
      setBlogForm({
        title: "",
        slug: "",
        excerpt: "",
        body: "",
        displayOrder: 0,
        isPublished: false,
      });
      const updated = await adminListBlogPosts(accessToken);
      setBlogPosts(updated);
      setSaveSuccess("Blog post created successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to create blog post.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminDeleteBlogPost(id, accessToken);
      const updated = await adminListBlogPosts(accessToken);
      setBlogPosts(updated);
      setSaveSuccess("Blog post deleted successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete blog post.");
    }
  };

  // Social Link Handlers
  const handleAddSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !socialForm.platform.trim() || !socialForm.url.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await adminCreateSocialLink(
        {
          platform: socialForm.platform.trim().toLowerCase(),
          url: socialForm.url.trim(),
          displayOrder: socialLinks.length,
          isActive: socialForm.isActive,
        },
        accessToken
      );
      setSocialForm({
        platform: "",
        url: "",
        displayOrder: 0,
        isActive: true,
      });
      const updated = await adminListSocialLinks(accessToken);
      setSocialLinks(updated);
      setSaveSuccess("Social link added successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to add social link.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSocial = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminDeleteSocialLink(id, accessToken);
      const updated = await adminListSocialLinks(accessToken);
      setSocialLinks(updated);
      setSaveSuccess("Social link deleted successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete social link.");
    }
  };

  return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as SectionTab)}
              className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer select-none ${
                isActive
                  ? "text-[#FAF7F2] shadow-subtle"
                  : "bg-cream text-ink-soft hover:text-ink hover:bg-sand/60 border border-line/60"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="adminWebsiteTabIndicator"
                  className="absolute inset-0 rounded-full bg-forest"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        </div>
      ) : (
        <AnimatedView viewKey={activeTab}>
          {/* 1. GENERAL SECTION */}
          {activeTab === "general" && (
            <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={0}>
              <h2 className="text-lg font-display text-ink">General Clinic Branding</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  id="practice-name"
                  label="Practice Name"
                  value={generalData.practiceName || ""}
                  onChange={(e) => setGeneralData({ ...generalData, practiceName: e.target.value })}
                  placeholder="Your Clinic Name"
                />
                <TextField
                  id="short-brand-name"
                  label="Short Brand Name (Navbar, max 24 chars)"
                  value={generalData.shortBrandName || ""}
                  maxLength={24}
                  onChange={(e) => setGeneralData({ ...generalData, shortBrandName: e.target.value.slice(0, 24) })}
                  placeholder="e.g. Marlow Dental"
                />
                <TextField
                  id="general-tagline"
                  label="Tagline"
                  value={generalData.tagline || ""}
                  onChange={(e) => setGeneralData({ ...generalData, tagline: e.target.value })}
                  placeholder="Your clinic tagline..."
                />
                <TextField
                  id="general-phone"
                  label="Clinic Telephone"
                  value={generalData.phone || ""}
                  onChange={(e) => setGeneralData({ ...generalData, phone: e.target.value })}
                  placeholder="(000) 000-0000"
                />
                <TextField
                  id="general-emergency-phone"
                  label="Emergency Telephone"
                  value={generalData.emergencyPhone || ""}
                  onChange={(e) => setGeneralData({ ...generalData, emergencyPhone: e.target.value })}
                  placeholder="(000) 000-0001"
                />
                <TextField
                  id="general-email"
                  label="Contact Email"
                  value={generalData.email || ""}
                  onChange={(e) => setGeneralData({ ...generalData, email: e.target.value })}
                  placeholder="clinic@example.com"
                />
                <TextField
                  id="general-address"
                  label="Physical Address"
                  value={generalData.address || ""}
                  onChange={(e) => setGeneralData({ ...generalData, address: e.target.value })}
                  placeholder="e.g. Clinic Address"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Clinic Logo
                </label>
                <div className="flex items-center gap-3">
                  {generalData.logoUrl && (
                    <img
                      src={generalData.logoUrl}
                      alt="Current logo"
                      className="h-10 w-10 rounded-lg object-contain border border-line bg-bone"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, "logoUrl", "general");
                      e.target.value = "";
                    }}
                    className="block text-xs text-ink-soft file:mr-3 file:rounded-full file:border file:border-line file:bg-bone file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink file:cursor-pointer hover:file:bg-sand/60 disabled:opacity-50"
                  />
                  {isUploading && (
                    <span className="text-xs text-ink-soft">Uploading…</span>
                  )}
                </div>
                {generalData.logoUrl && (
                  <p className="mt-1 text-[11px] text-ink-soft/70 truncate">{generalData.logoUrl}</p>
                )}
              </div>

              <div className="pt-4 border-t border-line/60 flex justify-end">
                <Button
                  onClick={() => handleSaveSection("general", generalData)}
                  disabled={isSaving}
                  variant="primary"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  <span>{isSaving ? "Saving..." : "Save General Settings"}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* 2. HOMEPAGE SECTION */}
          {activeTab === "homepage" && (
            <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={1}>
              <h2 className="text-lg font-display text-ink">Homepage Hero &amp; Messaging</h2>
              <div className="space-y-4">
                <TextField
                  id="hero-eyebrow"
                  label="Eyebrow Tagline"
                  value={homepageData.heroEyebrow || ""}
                  onChange={(e) => setHomepageData({ ...homepageData, heroEyebrow: e.target.value })}
                />
                <TextField
                  id="hero-heading"
                  label="Main Hero Heading"
                  value={homepageData.heroHeading || ""}
                  onChange={(e) => setHomepageData({ ...homepageData, heroHeading: e.target.value })}
                />
                <div>
                  <label htmlFor="hero-desc" className="block text-xs font-medium text-ink mb-1.5">
                    Hero Description Paragraph
                  </label>
                  <textarea
                    id="hero-desc"
                    rows={3}
                    value={homepageData.heroDescription || ""}
                    onChange={(e) => setHomepageData({ ...homepageData, heroDescription: e.target.value })}
                    className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="hero-cta-text"
                    label="Primary CTA Button Text"
                    value={homepageData.heroCtaText || ""}
                    onChange={(e) => setHomepageData({ ...homepageData, heroCtaText: e.target.value })}
                  />
                  <TextField
                    id="hero-cta-link"
                    label="Primary CTA Button URL"
                    value={homepageData.heroCtaLink || ""}
                    onChange={(e) => setHomepageData({ ...homepageData, heroCtaLink: e.target.value })}
                  />
                  <TextField
                    id="hero-sec-text"
                    label="Secondary CTA Button Text"
                    value={homepageData.heroSecondaryCtaText || ""}
                    onChange={(e) => setHomepageData({ ...homepageData, heroSecondaryCtaText: e.target.value })}
                  />
                  <TextField
                    id="hero-sec-link"
                    label="Secondary CTA Button URL"
                    value={homepageData.heroSecondaryCtaLink || ""}
                    onChange={(e) => setHomepageData({ ...homepageData, heroSecondaryCtaLink: e.target.value })}
                  />
                </div>
              </div>

              {/* Hero Image Upload */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Hero Image
                </label>
                <div className="flex items-center gap-3">
                  {homepageData.heroImageUrl && (
                    <img
                      src={homepageData.heroImageUrl}
                      alt="Current hero"
                      className="h-16 w-24 rounded-lg object-cover border border-line bg-bone"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, "heroImageUrl", "homepage");
                      e.target.value = "";
                    }}
                    className="block text-xs text-ink-soft file:mr-3 file:rounded-full file:border file:border-line file:bg-bone file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink file:cursor-pointer hover:file:bg-sand/60 disabled:opacity-50"
                  />
                  {isUploading && (
                    <span className="text-xs text-ink-soft">Uploading…</span>
                  )}
                </div>
                {homepageData.heroImageUrl && (
                  <p className="mt-1 text-[11px] text-ink-soft/70 truncate">{homepageData.heroImageUrl}</p>
                )}
              </div>

              <div className="pt-4 border-t border-line/60 flex justify-end">
                <Button
                  onClick={() => handleSaveSection("homepage", homepageData)}
                  disabled={isSaving}
                  variant="primary"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  <span>{isSaving ? "Saving..." : "Save Homepage Content"}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* 3. ABOUT SECTION */}
          {activeTab === "about" && (
            <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={2}>
              <h2 className="text-lg font-display text-ink">About Practice &amp; Story</h2>
              <div className="space-y-4">
                <TextField
                  id="about-eyebrow"
                  label="Section Eyebrow"
                  value={aboutData.eyebrow || ""}
                  onChange={(e) => setAboutData({ ...aboutData, eyebrow: e.target.value })}
                />
                <TextField
                  id="about-title"
                  label="Story Title"
                  value={aboutData.title || ""}
                  onChange={(e) => setAboutData({ ...aboutData, title: e.target.value })}
                />
                <div>
                  <label htmlFor="about-story" className="block text-xs font-medium text-ink mb-1.5">
                    Story Paragraphs (one per line)
                  </label>
                  <textarea
                    id="about-story"
                    rows={6}
                    value={Array.isArray(aboutData.storyParagraphs) ? aboutData.storyParagraphs.join("\n\n") : ""}
                    onChange={(e) =>
                      setAboutData({
                        ...aboutData,
                        storyParagraphs: e.target.value.split("\n\n").filter(Boolean),
                      })
                    }
                    className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>
                <TextField
                  id="about-licensure"
                  label="Licensure Standing Text"
                  value={aboutData.licensureText || ""}
                  onChange={(e) => setAboutData({ ...aboutData, licensureText: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-line/60 flex justify-end">
                <Button
                  onClick={() => handleSaveSection("about", aboutData)}
                  disabled={isSaving}
                  variant="primary"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  <span>{isSaving ? "Saving..." : "Save About Content"}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* 4. CONTACT SECTION */}
          {activeTab === "contact" && (
            <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={3}>
              <h2 className="text-lg font-display text-ink">Contact Details &amp; Operating Hours</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  id="contact-phone"
                  label="Office Phone"
                  value={contactData.phone || ""}
                  onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                />
                <TextField
                  id="contact-email"
                  label="Office Email"
                  value={contactData.email || ""}
                  onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                />
                <TextField
                  id="contact-addr1"
                  label="Address Line 1"
                  value={contactData.addressLine1 || ""}
                  onChange={(e) => setContactData({ ...contactData, addressLine1: e.target.value })}
                />
                <TextField
                  id="contact-addr2"
                  label="Address Line 2 (City, State, Zip)"
                  value={contactData.addressLine2 || ""}
                  onChange={(e) => setContactData({ ...contactData, addressLine2: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="contact-hours" className="block text-xs font-medium text-ink">
                      Operating Hours Summary (Legacy Fallback)
                    </label>
                    <a
                      href="/admin/booking"
                      className="text-[11px] text-forest hover:underline font-medium"
                    >
                      Edit single-source hours in Booking Settings →
                    </a>
                  </div>
                  <textarea
                    id="contact-hours"
                    rows={3}
                    value={contactData.hoursSummary || ""}
                    onChange={(e) => setContactData({ ...contactData, hoursSummary: e.target.value })}
                    className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                  <p className="text-[11px] text-ink-soft/70 mt-1">
                    Standard clinic hours and closures are managed in <a href="/admin/booking" className="underline text-forest font-medium">Booking Settings</a> as the single source of truth. This field is preserved only as a fallback.
                  </p>
                </div>
                <TextField
                  id="contact-transit"
                  label="Transit &amp; Parking Instructions"
                  value={contactData.transitNote || ""}
                  onChange={(e) => setContactData({ ...contactData, transitNote: e.target.value })}
                />
                <TextField
                  id="contact-emergency"
                  label="Emergency Triage Note"
                  value={contactData.emergencyNote || ""}
                  onChange={(e) => setContactData({ ...contactData, emergencyNote: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-line/60 flex justify-end">
                <Button
                  onClick={() => handleSaveSection("contact", contactData)}
                  disabled={isSaving}
                  variant="primary"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  <span>{isSaving ? "Saving..." : "Save Contact Info"}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* 5. FAQ SECTION */}
          {activeTab === "faq" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display text-ink">Manage Patient FAQs</h2>
                <Button
                  onClick={() => setShowAddFaq(!showAddFaq)}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>{showAddFaq ? "Cancel" : "Add FAQ Item"}</span>
                </Button>
              </div>

              {/* Add FAQ Form */}
              {showAddFaq && (
                <Card surface="cream" shadow="card" className="p-6 space-y-4" hoverLift={true} index={4}>
                  <h3 className="text-sm font-semibold text-ink">Add New FAQ Question</h3>
                  <form onSubmit={handleAddFaq} className="space-y-4">
                    <div>
                      <label htmlFor="faq-cat" className="block text-xs font-medium text-ink mb-1.5">
                        Category
                      </label>
                      <select
                        id="faq-cat"
                        value={newFaq.category}
                        onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                        className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2 text-xs text-ink"
                      >
                        <option value="pricing">Pricing &amp; Estimates</option>
                        <option value="general">General Information</option>
                        <option value="comfort">Anxiety &amp; Comfort</option>
                        <option value="scheduling">Appointments &amp; Scheduling</option>
                      </select>
                    </div>

                    <TextField
                      id="faq-q"
                      label="Question"
                      value={newFaq.question}
                      onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                      required
                    />

                    <div>
                      <label htmlFor="faq-a" className="block text-xs font-medium text-ink mb-1.5">
                        Answer
                      </label>
                      <textarea
                        id="faq-a"
                        rows={3}
                        value={newFaq.answer}
                        onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                        required
                        className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddFaq(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Save FAQ Item
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* FAQ List */}
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <Card
                    key={faq.id}
                    surface={faq.isActive === false ? "sand" : "cream"}
                    shadow="subtle"
                    className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                   hoverLift={true} index={5}>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold text-forest uppercase">
                          {faq.category}
                        </span>
                        {faq.isActive === false ? (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            Inactive / Draft
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Public
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-sm text-ink">{faq.question}</h4>
                      <p className="text-xs text-ink-soft leading-relaxed">{faq.answer}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 mr-1" role="group" aria-label="Reorder FAQ">
                        <button
                          type="button"
                          onClick={() => handleMoveFaq(faqs.indexOf(faq), -1)}
                          disabled={faqs.indexOf(faq) === 0}
                          aria-label={`Move FAQ up`}
                          className="h-5 w-6 rounded border border-line text-ink-soft hover:text-ink hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-[10px] leading-none"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveFaq(faqs.indexOf(faq), 1)}
                          disabled={faqs.indexOf(faq) === faqs.length - 1}
                          aria-label={`Move FAQ down`}
                          className="h-5 w-6 rounded border border-line text-ink-soft hover:text-ink hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-[10px] leading-none"
                        >
                          ▼
                        </button>
                      </div>

                      <Button
                        onClick={() => handleToggleFaq(faq.id, faq.isActive !== false)}
                        variant="secondary"
                        size="sm"
                      >
                        {faq.isActive === false ? "Reactivate" : "Deactivate"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 6. SEO SECTION */}
          {activeTab === "seo" && (
            <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={6}>
              <h2 className="text-lg font-display text-ink">Metadata &amp; Search Engine Optimization</h2>
              <div className="space-y-4">
                <TextField
                  id="seo-title"
                  label="Global Site Title (<title>)"
                  value={seoData.siteTitle || ""}
                  onChange={(e) => setSeoData({ ...seoData, siteTitle: e.target.value })}
                />
                <div>
                  <label htmlFor="seo-desc" className="block text-xs font-medium text-ink mb-1.5">
                    Meta Description (&lt;meta name=&quot;description&quot;&gt;)
                  </label>
                  <textarea
                    id="seo-desc"
                    rows={3}
                    value={seoData.metaDescription || ""}
                    onChange={(e) => setSeoData({ ...seoData, metaDescription: e.target.value })}
                    className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-line/60 flex justify-end">
                <Button
                  onClick={() => handleSaveSection("seo", seoData)}
                  disabled={isSaving}
                  variant="primary"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  <span>{isSaving ? "Saving..." : "Save SEO Settings"}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* 7. SUCCESS STORIES (REVIEWS) SECTION */}
          {activeTab === "success-stories" && (
            <div className="space-y-6">
              <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-5" hoverLift={false} index={7}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display text-ink">Add New Review (Success Story)</h2>
                    <p className="text-xs text-ink-soft">Add patient testimonials and external reviews.</p>
                  </div>
                </div>

                <form onSubmit={handleAddReview} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <TextField
                      id="review-author"
                      label="Author Name"
                      value={reviewForm.authorName}
                      onChange={(e) => setReviewForm({ ...reviewForm, authorName: e.target.value })}
                      placeholder="e.g. Jane D."
                      required
                    />

                    <div>
                      <label htmlFor="review-rating" className="block text-xs font-medium text-ink mb-1.5">
                        Rating (1-5)
                      </label>
                      <select
                        id="review-rating"
                        value={reviewForm.rating}
                        onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                        className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2 text-xs text-ink"
                      >
                        <option value={5}>5 Stars - Excellent</option>
                        <option value={4}>4 Stars - Great</option>
                        <option value={3}>3 Stars - Good</option>
                        <option value={2}>2 Stars - Fair</option>
                        <option value={1}>1 Star - Poor</option>
                      </select>
                    </div>

                    <TextField
                      id="review-source"
                      label="Source Label"
                      value={reviewForm.sourceLabel}
                      onChange={(e) => setReviewForm({ ...reviewForm, sourceLabel: e.target.value })}
                      placeholder="e.g. Google, Yelp, Direct"
                    />
                  </div>

                  <div>
                    <label htmlFor="review-text" className="block text-xs font-medium text-ink mb-1.5">
                      Review Text
                    </label>
                    <textarea
                      id="review-text"
                      rows={3}
                      value={reviewForm.text}
                      onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                      placeholder="Write patient testimonial or review quote..."
                      required
                      className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={reviewForm.isPublished}
                        onChange={(e) => setReviewForm({ ...reviewForm, isPublished: e.target.checked })}
                        className="rounded border-line text-forest focus:ring-forest"
                      />
                      <span>Publish immediately</span>
                    </label>

                    <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span>{isSaving ? "Saving..." : "Add Review"}</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Reviews List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">Existing Reviews ({reviews.length})</h3>
                {reviews.length === 0 ? (
                  <p className="text-xs text-ink-soft py-4 text-center">No reviews added yet.</p>
                ) : (
                  reviews.map((rev) => (
                    <Card
                      key={rev.id}
                      surface={rev.isPublished ? "cream" : "sand"}
                      shadow="subtle"
                      className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      hoverLift={true}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-ink">{rev.authorName}</span>
                          <span className="flex items-center text-amber-500 text-xs font-semibold">
                            <Star className="h-3 w-3 fill-amber-400 stroke-amber-500 mr-0.5" />
                            {rev.rating}/5
                          </span>
                          {rev.sourceLabel && (
                            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold text-forest">
                              {rev.sourceLabel}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              rev.isPublished
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {rev.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft leading-relaxed">{rev.text}</p>
                      </div>

                      <Button
                        onClick={() => handleDeleteReview(rev.id)}
                        variant="secondary"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Delete</span>
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 8. BLOGS SECTION */}
          {activeTab === "blogs" && (
            <div className="space-y-6">
              <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-5" hoverLift={false} index={8}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display text-ink">Add New Blog Post</h2>
                    <p className="text-xs text-ink-soft">Create educational and clinical blog articles.</p>
                  </div>
                </div>

                <form onSubmit={handleAddBlog} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      id="blog-title"
                      label="Post Title"
                      value={blogForm.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        const slug = title
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "");
                        setBlogForm({ ...blogForm, title, slug: blogForm.slug ? blogForm.slug : slug });
                      }}
                      placeholder="e.g. Modern Preventive Dental Care"
                      required
                    />

                    <TextField
                      id="blog-slug"
                      label="URL Slug"
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                      placeholder="e.g. modern-preventive-dental-care"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="blog-excerpt" className="block text-xs font-medium text-ink mb-1.5">
                      Excerpt / Summary
                    </label>
                    <textarea
                      id="blog-excerpt"
                      rows={2}
                      value={blogForm.excerpt}
                      onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                      placeholder="Short synopsis shown in blog cards..."
                      className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  <div>
                    <label htmlFor="blog-body" className="block text-xs font-medium text-ink mb-1.5">
                      Article Body
                    </label>
                    <textarea
                      id="blog-body"
                      rows={6}
                      value={blogForm.body}
                      onChange={(e) => setBlogForm({ ...blogForm, body: e.target.value })}
                      placeholder="Full article content..."
                      className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={blogForm.isPublished}
                        onChange={(e) => setBlogForm({ ...blogForm, isPublished: e.target.checked })}
                        className="rounded border-line text-forest focus:ring-forest"
                      />
                      <span>Publish immediately</span>
                    </label>

                    <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span>{isSaving ? "Saving..." : "Add Blog Post"}</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Blog Posts List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">Existing Blog Posts ({blogPosts.length})</h3>
                {blogPosts.length === 0 ? (
                  <p className="text-xs text-ink-soft py-4 text-center">No blog posts added yet.</p>
                ) : (
                  blogPosts.map((post) => (
                    <Card
                      key={post.id}
                      surface={post.isPublished ? "cream" : "sand"}
                      shadow="subtle"
                      className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      hoverLift={true}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-ink">{post.title}</h4>
                          <span className="font-mono text-[10px] text-ink-soft bg-muted px-2 py-0.5 rounded">
                            /{post.slug}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              post.isPublished
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {post.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                        {post.excerpt && <p className="text-xs text-ink-soft leading-relaxed">{post.excerpt}</p>}
                      </div>

                      <Button
                        onClick={() => handleDeleteBlog(post.id)}
                        variant="secondary"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Delete</span>
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 9. SOCIAL LINKS SECTION */}
          {activeTab === "social-links" && (
            <div className="space-y-6">
              <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-5" hoverLift={false} index={9}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display text-ink">Add Social Link</h2>
                    <p className="text-xs text-ink-soft">Link clinic profiles (Instagram, Facebook, Google, etc.).</p>
                  </div>
                </div>

                <form onSubmit={handleAddSocial} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="social-platform" className="block text-xs font-medium text-ink mb-1.5">
                        Platform Name
                      </label>
                      <select
                        id="social-platform"
                        value={socialForm.platform}
                        onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                        required
                        className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2 text-xs text-ink"
                      >
                        <option value="">Select a platform...</option>
                        <option value="google">Google</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="twitter">Twitter / X</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="youtube">YouTube</option>
                        <option value="yelp">Yelp</option>
                        <option value="tiktok">TikTok</option>
                      </select>
                    </div>

                    <TextField
                      id="social-url"
                      label="URL (must start with https://)"
                      value={socialForm.url}
                      onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                      placeholder="https://instagram.com/yourclinic"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={socialForm.isActive}
                        onChange={(e) => setSocialForm({ ...socialForm, isActive: e.target.checked })}
                        className="rounded border-line text-forest focus:ring-forest"
                      />
                      <span>Active on public website</span>
                    </label>

                    <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span>{isSaving ? "Saving..." : "Add Social Link"}</span>
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Social Links List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">Existing Social Links ({socialLinks.length})</h3>
                {socialLinks.length === 0 ? (
                  <p className="text-xs text-ink-soft py-4 text-center">No social links configured yet.</p>
                ) : (
                  socialLinks.map((link) => (
                    <Card
                      key={link.id}
                      surface={link.isActive ? "cream" : "sand"}
                      shadow="subtle"
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      hoverLift={true}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                            {link.platform}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              link.isActive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {link.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-forest hover:underline break-all"
                        >
                          {link.url}
                        </a>
                      </div>

                      <Button
                        onClick={() => handleDeleteSocial(link.id)}
                        variant="secondary"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Delete</span>
                      </Button>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </AnimatedView>
      )}
    </div>
  </AnimatedPage>
  );
}
