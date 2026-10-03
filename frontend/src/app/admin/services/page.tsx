"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  Edit,
  Layers,
  Plus,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/components/providers/auth-provider";
import {
  adminCreateService,
  adminGetServices,
  adminToggleServiceStatus,
  adminUpdateService,
  ServiceItem,
} from "@/lib/api";

const CATEGORIES = [
  { id: "preventive", label: "Preventive Care" },
  { id: "restorative", label: "Restorative" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "emergency", label: "Emergency Triage" },
];

export default function AdminServicesPage() {
  const { accessToken } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: "",
    category: "preventive",
    title: "",
    shortDesc: "",
    fullDesc: "",
    cashPrice: "",
    duration: "",
    code: "",
    insuranceNote: "",
    recommendedInterval: "",
    displayOrder: 0,
    isHighlighted: false,
    isPublic: true,
  });

  const loadServices = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await adminGetServices(accessToken);
      setServices(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load services.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [accessToken]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      slug: "",
      category: "preventive",
      title: "",
      shortDesc: "",
      fullDesc: "",
      cashPrice: "from $",
      duration: "45 to 60 min",
      code: "CDT D0150",
      insuranceNote: "Usually covered by PPO dental plans.",
      recommendedInterval: "Every 6 months",
      displayOrder: services.length,
      isHighlighted: false,
      isPublic: true,
    });
    setShowModal(true);
  };

  const openEditModal = (service: any) => {
    setEditingId(service.id);
    setForm({
      slug: service.slug,
      category: service.category,
      title: service.title,
      shortDesc: service.shortDesc,
      fullDesc: service.fullDesc || "",
      cashPrice: service.cashPrice,
      duration: service.duration,
      code: service.code || "",
      insuranceNote: service.insuranceNote || "",
      recommendedInterval: service.recommendedInterval || "",
      displayOrder: service.displayOrder,
      isHighlighted: service.isHighlighted,
      isPublic: service.isPublic,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setErrorMessage(null);

    const payload = {
      slug: form.slug.trim().toLowerCase(),
      category: form.category,
      title: form.title.trim(),
      shortDesc: form.shortDesc.trim(),
      fullDesc: form.fullDesc.trim() || null,
      cashPrice: form.cashPrice.trim(),
      duration: form.duration.trim(),
      code: form.code.trim() || null,
      insuranceNote: form.insuranceNote.trim() || null,
      recommendedInterval: form.recommendedInterval.trim() || null,
      displayOrder: Number(form.displayOrder) || 0,
      isHighlighted: Boolean(form.isHighlighted),
      isPublic: Boolean(form.isPublic),
      isActive: true,
    };

    try {
      if (editingId) {
        await adminUpdateService(editingId, payload, accessToken);
        setSuccessMessage("Service updated successfully.");
      } else {
        await adminCreateService(payload, accessToken);
        setSuccessMessage("New service added successfully.");
      }
      setShowModal(false);
      loadServices();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save service.");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!accessToken) return;
    try {
      await adminToggleServiceStatus(id, !currentStatus, accessToken);
      setSuccessMessage(`Service ${currentStatus ? "deactivated" : "reactivated"}.`);
      loadServices();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle status.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Fee Transparency &amp; Procedures</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Services &amp; Pricing Catalog
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage procedures, CDT billing codes, upfront cash prices, and booking availability.
          </p>
        </div>

        <Button onClick={openAddModal} variant="primary" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span>Add Service</span>
        </Button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-800 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {/* Services List */}
      {isLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {services.map((svc) => (
            <Card
              key={svc.id}
              surface={svc.isActive ? "cream" : "bone"}
              shadow="subtle"
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {svc.code && (
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-forest dark:text-emerald-400 font-semibold">
                      {svc.code}
                    </span>
                  )}
                  <span className="rounded-full bg-sand/60 px-2.5 py-0.5 text-[10.5px] font-semibold text-clay uppercase">
                    {svc.category}
                  </span>
                  {svc.isActive ? (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                      Deactivated
                    </span>
                  )}
                  {svc.isHighlighted && (
                    <span className="rounded-full bg-forest text-[#FAF7F2] px-2 py-0.5 text-[10px] font-medium">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="font-display text-base text-ink font-semibold">
                  {svc.title}
                </h3>

                <p className="text-xs text-ink-soft leading-relaxed max-w-2xl">
                  {svc.shortDesc}
                </p>

                <div className="flex items-center gap-4 text-xs text-ink-soft pt-1 font-mono">
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <Tag className="h-3 w-3 text-forest" />
                    {svc.cashPrice}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {svc.duration}
                  </span>
                  <span>slug: {svc.slug}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button onClick={() => openEditModal(svc)} variant="secondary" size="sm">
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  <span>Edit</span>
                </Button>

                <Button
                  onClick={() => handleToggleStatus(svc.id, svc.isActive)}
                  variant="secondary"
                  size="sm"
                >
                  <span>{svc.isActive ? "Deactivate" : "Reactivate"}</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl my-8">
            <Card surface="cream" shadow="elevated" className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display text-lg text-ink">
                  {editingId ? "Edit Service" : "Add Service"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-xs text-ink-soft hover:text-ink font-mono cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="service-slug"
                    label="Slug (URL key / Identifier)"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="cleanings-exams"
                    required
                  />

                  <div>
                    <label htmlFor="service-cat" className="block text-xs font-medium text-ink mb-1.5">
                      Category
                    </label>
                    <select
                      id="service-cat"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2 text-xs text-ink"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <TextField
                  id="service-title"
                  label="Service Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Cleanings & Comprehensive Exam"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TextField
                    id="service-price"
                    label="Cash Price"
                    value={form.cashPrice}
                    onChange={(e) => setForm({ ...form, cashPrice: e.target.value })}
                    placeholder="from $140"
                    required
                  />
                  <TextField
                    id="service-duration"
                    label="Estimated Duration"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="45 to 60 min"
                    required
                  />
                  <TextField
                    id="service-code"
                    label="CDT Billing Code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="CDT D0150 / D1110"
                  />
                </div>

                <div>
                  <label htmlFor="service-short" className="block text-xs font-medium text-ink mb-1.5">
                    Short Description (Card Summary)
                  </label>
                  <textarea
                    id="service-short"
                    rows={2}
                    value={form.shortDesc}
                    onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
                    required
                    className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>

                <div>
                  <label htmlFor="service-full" className="block text-xs font-medium text-ink mb-1.5">
                    Full Description (Detail Modal / Expanded View)
                  </label>
                  <textarea
                    id="service-full"
                    rows={3}
                    value={form.fullDesc}
                    onChange={(e) => setForm({ ...form, fullDesc: e.target.value })}
                    className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3.5 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="service-ins"
                    label="Insurance Copay Note"
                    value={form.insuranceNote}
                    onChange={(e) => setForm({ ...form, insuranceNote: e.target.value })}
                    placeholder="Typically 100% covered by PPO..."
                  />
                  <TextField
                    id="service-rec"
                    label="Recommended Interval"
                    value={form.recommendedInterval}
                    onChange={(e) => setForm({ ...form, recommendedInterval: e.target.value })}
                    placeholder="Every 6 months"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isHighlighted}
                      onChange={(e) => setForm({ ...form, isHighlighted: e.target.checked })}
                      className="rounded border-line text-forest focus:ring-forest"
                    />
                    <span>Highlight as Featured Treatment</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                      className="rounded border-line text-forest focus:ring-forest"
                    />
                    <span>Show on Public Website</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-line/60 flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    {editingId ? "Update Service" : "Save Service"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
