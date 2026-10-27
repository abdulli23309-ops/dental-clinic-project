"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { adminListSocialLinks as adminGetSocialLinks, adminCreateSocialLink, adminDeleteSocialLink, SocialLink } from "@/lib/api";

export default function SocialLinksTab() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
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

  useEffect(() => {
    adminGetSocialLinks()
      .then((data) => setSocialLinks(data))
      .catch((error) => console.error("Failed to fetch social links:", error));
  }, []);

  const handleCreateSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminCreateSocialLink({
        ...socialForm,
      });
      setSocialLinks([...socialLinks, created]);
      setSocialForm({
        platform: "",
        url: "",
        displayOrder: 0,
        isActive: true,
      });
    } catch (error) {
      console.error("Failed to create social link:", error);
    }
  };

  const handleDeleteSocialLink = async (id: string) => {
    try {
      await adminDeleteSocialLink(id);
      setSocialLinks(socialLinks.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete social link:", error);
    }
  };

  return (
    <div>
      {/* Form Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-display text-ink mb-4">Add New Social Link</h2>
        <form onSubmit={handleCreateSocialLink} className="space-y-4">
          <TextField
            id="social-platform"
            label="Platform"
            value={socialForm.platform}
            onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
            placeholder="e.g. google, instagram, facebook"
            required
          />
          <TextField
            id="social-url"
            label="URL"
            value={socialForm.url}
            onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
            placeholder="https://..."
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSocialForm({
                  platform: "",
                  url: "",
                  displayOrder: 0,
                  isActive: true,
                })
              }
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Social Link
            </Button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-6 mt-8">
        <h2 className="text-lg font-display text-ink mb-4">Social Links List</h2>
        {socialLinks.length === 0 && (
          <p className="text-ink-soft/60">No social links yet. Add one above.</p>
        )}
        <div className="space-y-3">
          {socialLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border border-line bg-bone"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">{link.platform}</span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-soft/60 hover:underline break-all"
                >
                  {link.url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-soft/60 text-xs">{link.isActive ? "Active" : "Inactive"}</span>
                <Button onClick={() => handleDeleteSocialLink(link.id)} variant="secondary" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}