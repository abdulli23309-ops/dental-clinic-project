"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { adminListBlogPosts as adminGetBlogPosts, adminCreateBlogPost, adminDeleteBlogPost, BlogPost } from "@/lib/api";

export default function BlogsTab() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
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

  useEffect(() => {
    adminGetBlogPosts()
      .then((data) => setBlogPosts(data))
      .catch((error) => console.error("Failed to fetch blog posts:", error));
  }, []);

  const handleCreateBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminCreateBlogPost({
        ...blogForm,
      });
      setBlogPosts([...blogPosts, created]);
      setBlogForm({
        title: "",
        slug: "",
        excerpt: "",
        body: "",
        displayOrder: 0,
        isPublished: false,
      });
    } catch (error) {
      console.error("Failed to create blog post:", error);
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    try {
      await adminDeleteBlogPost(id);
      setBlogPosts(blogPosts.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete blog post:", error);
    }
  };

  return (
    <div>
      {/* Form Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-display text-ink mb-4">Add New Blog Post</h2>
        <form onSubmit={handleCreateBlogPost} className="space-y-4">
          <div>
            <label htmlFor="blog-title" className="block text-xs font-medium text-ink mb-1.5">
              Title
            </label>
            <input
              id="blog-title"
              type="text"
              value={blogForm.title}
              onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
              required
              className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label htmlFor="blog-slug" className="block text-xs font-medium text-ink mb-1.5">
              Slug
            </label>
            <input
              id="blog-slug"
              type="text"
              value={blogForm.slug}
              onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
              className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label htmlFor="blog-excerpt" className="block text-xs font-medium text-ink mb-1.5">
              Excerpt
            </label>
            <textarea
              id="blog-excerpt"
              rows={3}
              value={blogForm.excerpt}
              onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
              required
              className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label htmlFor="blog-body" className="block text-xs font-medium text-ink mb-1.5">
              Body
            </label>
            <textarea
              id="blog-body"
              rows={5}
              value={blogForm.body}
              onChange={(e) => setBlogForm({ ...blogForm, body: e.target.value })}
              required
              className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label htmlFor="display-order" className="block text-xs font-medium text-ink mb-1.5">
              Display Order
            </label>
            <input
              id="display-order"
              type="number"
              value={blogForm.displayOrder}
              onChange={(e) => setBlogForm({ ...blogForm, displayOrder: Number(e.target.value) })}
              className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label htmlFor="is-published" className="block text-xs font-medium text-ink mb-1.5">
              Published
            </label>
            <select
              id="is-published"
              value={blogForm.isPublished ? "true" : "false"}
              onChange={(e) => setBlogForm({ ...blogForm, isPublished: e.target.value === "true" })}
              className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2.5 text-xs text-ink"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setBlogForm({
                  title: "",
                  slug: "",
                  excerpt: "",
                  body: "",
                  displayOrder: 0,
                  isPublished: false,
                })
              }
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Blog Post
            </Button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-6 mt-8">
        <h2 className="text-lg font-display text-ink mb-4">Blog Posts List</h2>
        {blogPosts.length === 0 && (
          <p className="text-ink-soft/60">No blog posts yet. Add one above.</p>
        )}
        <div className="space-y-3">
          {blogPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border border-line bg-bone"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">{post.title}</span>
                <span className="text-ink-soft/60">{post.slug}</span>
              </div>
              <p className="text-ink-soft/60 whitespace-break">{(post.excerpt || "").substring(0, 80)}...</p>
              <Button onClick={() => handleDeleteBlogPost(post.id)} variant="secondary" size="sm">
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
