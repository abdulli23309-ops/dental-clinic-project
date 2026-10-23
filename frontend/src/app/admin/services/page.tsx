"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Clock,
  Edit,
  Layers,
  Plus,
  Stethoscope,
  Tag,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { AnimatedView } from "@/components/ui/animated-view";
import { motion } from "motion/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  adminCreateService,
  adminGetClinicMatrix,
  adminGetServices,
  adminReorderServices,
  adminToggleServiceStatus,
  adminUpdateService,
  adminUpdateServiceClinics,
  adminUpdateServiceProviders,
  ClinicMatrixClinic,
  ClinicMatrixService,
  getTeamMembers,
  TeamMember,
} from "@/lib/api";

const CATEGORIES = [
  { id: "preventive", label: "Preventive Care" },
  { id: "restorative", label: "Restorative" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "emergency", label: "Emergency Triage" },
];

export default function AdminServicesPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"catalog" | "matrix">("catalog");
  const [services, setServices] = useState<any[]>([]);
  const [matrixClinics, setMatrixClinics] = useState<ClinicMatrixClinic[]>([]);
  const [matrixServices, setMatrixServices] = useState<ClinicMatrixService[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state for Add/Edit Service
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Doctor assignment modal
  const [assignDoctorModal, setAssignDoctorModal] = useState<{
    serviceId: string;
    serviceTitle: string;
    providerIds: string[];
  } | null>(null);

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
    recallIntervalDays: 180 as number | undefined,
    displayOrder: 0,
    isHighlighted: false,
    isPublic: true,
    bookableOnline: true,
    bufferMinutes: 0,
    providerIds: [] as string[],
    clinicIds: [] as string[],
  });

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [servicesData, matrixData, members] = await Promise.all([
        adminGetServices(accessToken),
        adminGetClinicMatrix(accessToken).catch(() => ({ clinics: [], services: [] })),
        getTeamMembers().catch(() => []),
      ]);
      setServices(servicesData);
      setMatrixClinics(matrixData.clinics || []);
      setMatrixServices(matrixData.services || []);
      setTeamMembers(members.filter((m) => m.isActive));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load services data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [accessToken]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      slug: "",
      category: "preventive",
      title: "",
      shortDesc: "",
      fullDesc: "",
      cashPrice: "",
      duration: "45 min",
      code: "SRV-01",
      insuranceNote: "",
      recommendedInterval: "Every 6 months",
      recallIntervalDays: 180,
      displayOrder: services.length,
      isHighlighted: false,
      isPublic: true,
      bookableOnline: true,
      bufferMinutes: 0,
      providerIds: [],
      clinicIds: matrixClinics.map((c) => c.id),
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
      recallIntervalDays:
        service.recallIntervalDays !== undefined && service.recallIntervalDays !== null
          ? Number(service.recallIntervalDays)
          : undefined,
      displayOrder: service.displayOrder,
      isHighlighted: service.isHighlighted,
      isPublic: service.isPublic,
      bookableOnline: service.bookableOnline !== false,
      bufferMinutes: service.bufferMinutes || 0,
      providerIds: service.providerIds || [],
      clinicIds: service.clinicIds || [],
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
      recallIntervalDays: form.recallIntervalDays ? Number(form.recallIntervalDays) : null,
      displayOrder: Number(form.displayOrder) || 0,
      isHighlighted: Boolean(form.isHighlighted),
      isPublic: Boolean(form.isPublic),
      bookableOnline: Boolean(form.bookableOnline),
      bufferMinutes: Number(form.bufferMinutes) || 0,
      providerIds: form.providerIds,
      isActive: true,
    };

    try {
      if (editingId) {
        await adminUpdateService(editingId, payload, accessToken);
        if (form.clinicIds) {
          await adminUpdateServiceClinics(editingId, form.clinicIds, accessToken);
        }
        setSuccessMessage("Service updated successfully.");
      } else {
        const created = await adminCreateService(payload, accessToken);
        if (created?.id && form.clinicIds.length > 0) {
          await adminUpdateServiceClinics(created.id, form.clinicIds, accessToken);
        }
        setSuccessMessage("New service added successfully.");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save service.");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!accessToken) return;
    try {
      await adminToggleServiceStatus(id, !currentStatus, accessToken);
      setSuccessMessage(`Service ${currentStatus ? "deactivated" : "reactivated"}.`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle status.");
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!accessToken) return;
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const ordered = [...services];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    try {
      await adminReorderServices(ordered.map((s) => s.id), accessToken);
      setServices(ordered);
      setSuccessMessage("Service display order saved.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reorder services.");
    }
  };

  // Matrix: Toggle clinic offer
  const handleToggleClinic = async (serviceId: string, clinicId: string) => {
    if (!accessToken) return;
    const svc = matrixServices.find((s) => s.id === serviceId);
    if (!svc) return;

    const currentClinics = svc.clinicIds || [];
    const updatedClinics = currentClinics.includes(clinicId)
      ? currentClinics.filter((id) => id !== clinicId)
      : [...currentClinics, clinicId];

    // Optimistic update
    setMatrixServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, clinicIds: updatedClinics } : s))
    );
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, clinicIds: updatedClinics } : s))
    );

    try {
      await adminUpdateServiceClinics(serviceId, updatedClinics, accessToken);
      setSuccessMessage("Clinic offerings updated.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update clinic offering.");
      loadData();
    }
  };

  // Matrix / Doctor Assignment: Save doctors for service
  const handleSaveDoctorAssignment = async () => {
    if (!accessToken || !assignDoctorModal) return;
    const { serviceId, providerIds } = assignDoctorModal;

    try {
      await adminUpdateServiceProviders(serviceId, providerIds, accessToken);
      setSuccessMessage(
        providerIds.length === 0
          ? "Doctor assignment reset: Every active doctor at this clinic performs this service."
          : `Doctor assignment updated (${providerIds.length} doctor${providerIds.length > 1 ? "s" : ""} selected).`
      );
      setAssignDoctorModal(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update doctor assignments.");
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6 max-w-6xl">
      {/* Header Bar */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Fee Transparency &amp; Procedures</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Services &amp; Pricing Catalog
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage procedures, CDT billing codes, clinic offerings matrix, and doctor assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={openAddModal} variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Add Service</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-line gap-4 text-xs font-medium relative">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`relative pb-2.5 px-1 transition-colors flex items-center gap-1.5 ${
            activeTab === "catalog"
              ? "text-forest font-semibold"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Catalog &amp; Procedures</span>
          {activeTab === "catalog" && (
            <motion.div
              layoutId="adminServicesTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`relative pb-2.5 px-1 transition-colors flex items-center gap-1.5 ${
            activeTab === "matrix"
              ? "text-forest font-semibold"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Clinic Services Matrix</span>
          {activeTab === "matrix" && (
            <motion.div
              layoutId="adminServicesTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
        </button>
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

      {isLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        </div>
      ) : (
        <AnimatedView viewKey={activeTab}>
          {activeTab === "matrix" ? (
            /* TAB 2: CLINIC SERVICES MATRIX */
        <div className="space-y-4">
          <Card surface="cream" shadow="subtle" className="p-4 sm:p-5" hoverLift={true} index={0}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line mb-4">
              <div>
                <h3 className="font-display text-base text-ink font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-forest" />
                  Clinic Offering &amp; Doctor Assignment Matrix
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Tick which clinics offer each service. Clinician assignments apply per service; when no doctors are chosen, all active doctors at that clinic are eligible.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink border-collapse">
                <thead>
                  <tr className="border-b border-line bg-sand/40">
                    <th className="py-2.5 px-3 font-semibold text-ink">Service / Procedure</th>
                    <th className="py-2.5 px-3 font-semibold text-ink">Category</th>
                    {matrixClinics.map((clinic) => (
                      <th
                        key={clinic.id}
                        className="py-2.5 px-3 font-semibold text-ink text-center min-w-[130px]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{clinic.name}</span>
                          {clinic.isPrimary && (
                            <span className="text-[10px] text-forest font-mono">Primary</span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold text-ink min-w-[240px]">
                      Doctor Assignment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {matrixServices.map((svc) => {
                    const isAssignedEmpty = !svc.providerIds || svc.providerIds.length === 0;
                    return (
                      <tr key={svc.id} className="hover:bg-cream/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">{svc.title}</div>
                          <div className="text-[11px] font-mono text-ink-soft">
                            slug: {svc.slug} {svc.code ? `• ${svc.code}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded-full bg-sand/60 px-2 py-0.5 text-[10.5px] font-semibold text-clay uppercase">
                            {svc.category}
                          </span>
                        </td>
                        {matrixClinics.map((clinic) => {
                          const isOffered = (svc.clinicIds || []).includes(clinic.id);
                          return (
                            <td key={clinic.id} className="py-3 px-3 text-center">
                              <label className="inline-flex items-center justify-center p-2 rounded cursor-pointer hover:bg-sand/30">
                                <input
                                  type="checkbox"
                                  id={`clinic-service-${svc.id}-${clinic.id}`}
                                  checked={isOffered}
                                  onChange={() => handleToggleClinic(svc.id, clinic.id)}
                                  className="h-4 w-4 rounded border-line text-forest focus:ring-forest cursor-pointer"
                                />
                                <span className="sr-only">
                                  Offer {svc.title} at {clinic.name}
                                </span>
                              </label>
                            </td>
                          );
                        })}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {isAssignedEmpty ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-300">
                                <Check className="h-3 w-3" />
                                <span>Every active doctor at this clinic</span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-[10.5px] font-semibold text-purple-800 dark:text-purple-300">
                                  {svc.providerIds.length} Doctor{svc.providerIds.length > 1 ? "s" : ""}:
                                </span>
                                {svc.providerIds.map((pid) => {
                                  const doc = teamMembers.find((m) => m.id === pid);
                                  return (
                                    <span
                                      key={pid}
                                      className="rounded bg-sand/60 px-1.5 py-0.5 text-[10px] text-ink font-mono"
                                    >
                                      {doc?.displayName || pid.slice(0, 8)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  setAssignDoctorModal({
                                    serviceId: svc.id,
                                    serviceTitle: svc.title,
                                    providerIds: svc.providerIds || [],
                                  })
                                }
                                className="text-[11px] text-forest underline hover:text-forest/80 font-medium"
                              >
                                {isAssignedEmpty ? "Choose specific doctors..." : "Edit doctor list"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* TAB 1: CATALOG & PROCEDURES */
        <div className="grid grid-cols-1 gap-4">
          {services.map((svc) => (
            <Card
              key={svc.id}
              surface={svc.isActive ? "cream" : "bone"}
              shadow="subtle"
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
             hoverLift={true} index={1}>
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
                  {svc.bookableOnline !== false ? (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Online Bookable
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-200 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                      Staff Scheduling Only
                    </span>
                  )}
                  {svc.bufferMinutes > 0 && (
                    <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                      +{svc.bufferMinutes}m buffer
                    </span>
                  )}
                  {/* Doctor Assignment Pill */}
                  {svc.providerIds && svc.providerIds.length > 0 ? (
                    <span className="rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:text-purple-300">
                      {svc.providerIds.length} Clinician{svc.providerIds.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Every Active Doctor (All at Clinic)
                    </span>
                  )}
                  {/* Clinic links count */}
                  {svc.clinicIds && svc.clinicIds.length > 0 && (
                    <span className="rounded-full bg-teal-100 dark:bg-teal-950 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:text-teal-300">
                      {svc.clinicIds.length} Clinic{svc.clinicIds.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <h3 className="font-display text-base text-ink font-semibold">{svc.title}</h3>

                <p className="text-xs text-ink-soft leading-relaxed max-w-2xl">{svc.shortDesc}</p>

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
                <div className="flex flex-col gap-0.5 mr-1" role="group" aria-label="Reorder service">
                  <button
                    type="button"
                    onClick={() => handleMove(services.indexOf(svc), -1)}
                    disabled={services.indexOf(svc) === 0}
                    aria-label={`Move ${svc.title} up`}
                    className="h-5 w-6 rounded border border-line text-ink-soft hover:text-ink hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-[10px] leading-none"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(services.indexOf(svc), 1)}
                    disabled={services.indexOf(svc) === services.length - 1}
                    aria-label={`Move ${svc.title} down`}
                    className="h-5 w-6 rounded border border-line text-ink-soft hover:text-ink hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-[10px] leading-none"
                  >
                    ▼
                  </button>
                </div>

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
    </AnimatedView>
  )}

      {/* Modal Dialog for Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl my-8">
            <Card surface="cream" shadow="elevated" className="p-6 sm:p-8 space-y-5" hoverLift={true} index={2}>
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
                    placeholder="from Rs 1,500"
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
                    id="service-rec"
                    label="Recommended Interval Text"
                    value={form.recommendedInterval}
                    onChange={(e) => setForm({ ...form, recommendedInterval: e.target.value })}
                    placeholder="Every 6 months"
                  />
                  <TextField
                    id="service-recall-days"
                    label="Recall Interval (Days)"
                    type="number"
                    value={
                      form.recallIntervalDays !== undefined ? String(form.recallIntervalDays) : ""
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recallIntervalDays: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g. 180 (or 90 for perio)"
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

                {/* Offering Clinics Multi-Select */}
                {matrixClinics.length > 0 && (
                  <div className="rounded-xl border border-line bg-cream/40 p-4 space-y-2">
                    <label className="block text-[11px] font-semibold text-ink">
                      Offering Clinics
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {matrixClinics.map((clinic) => {
                        const isChecked = form.clinicIds.includes(clinic.id);
                        return (
                          <label
                            key={clinic.id}
                            className="flex items-center gap-2 text-xs text-ink cursor-pointer p-1.5 rounded hover:bg-cream"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setForm({ ...form, clinicIds: [...form.clinicIds, clinic.id] });
                                } else {
                                  setForm({
                                    ...form,
                                    clinicIds: form.clinicIds.filter((id) => id !== clinic.id),
                                  });
                                }
                              }}
                              className="rounded border-line text-forest focus:ring-forest"
                            />
                            <span>{clinic.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Online Booking & Clinician Assignment */}
                <div className="rounded-xl border border-line bg-cream/40 p-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Online Booking &amp; Clinician Assignment
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.bookableOnline}
                        onChange={(e) => setForm({ ...form, bookableOnline: e.target.checked })}
                        className="rounded border-line text-forest focus:ring-forest"
                      />
                      <span>Allow Online Patient Booking</span>
                    </label>

                    <div>
                      <label htmlFor="service-buffer" className="block text-[11px] font-medium text-ink mb-1">
                        Post-Procedure Buffer Time (Minutes)
                      </label>
                      <input
                        id="service-buffer"
                        type="number"
                        min={0}
                        max={120}
                        step={5}
                        value={form.bufferMinutes}
                        onChange={(e) =>
                          setForm({ ...form, bufferMinutes: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-full rounded-[var(--radius-card)] border border-line bg-bone px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                      />
                      <p className="text-[10px] text-ink-soft mt-0.5">Buffer for room sterilization &amp; chair prep.</p>
                    </div>
                  </div>

                  {/* Clinician Multi-Select */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-ink">
                        Assigned Clinicians (Doctor Assignment)
                      </label>
                      {form.providerIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, providerIds: [] })}
                          className="text-[10px] text-forest underline hover:text-forest/80 font-medium"
                        >
                          Reset to All Doctors
                        </button>
                      )}
                    </div>

                    {form.providerIds.length === 0 ? (
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 mb-2 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          <strong>Every active doctor at this clinic performs this service.</strong> (Empty set means unassigned &mdash; all doctors at the offering clinic are eligible).
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-soft mb-2">
                        Only the {form.providerIds.length} checked doctor{form.providerIds.length > 1 ? "s" : ""} will be bookable for this service.
                      </p>
                    )}

                    {teamMembers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-line rounded-lg p-2 bg-bone">
                        {teamMembers.map((tm) => {
                          const isChecked = form.providerIds.includes(tm.id);
                          return (
                            <label
                              key={tm.id}
                              className="flex items-center gap-2 text-xs text-ink p-1.5 rounded hover:bg-cream cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setForm({ ...form, providerIds: [...form.providerIds, tm.id] });
                                  } else {
                                    setForm({
                                      ...form,
                                      providerIds: form.providerIds.filter((id) => id !== tm.id),
                                    });
                                  }
                                }}
                                className="rounded border-line text-forest focus:ring-forest"
                              />
                              <span className="truncate">
                                {tm.displayName} ({tm.professionalTitle || tm.role})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-soft italic">No active clinicians found.</p>
                    )}
                  </div>
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

      {/* Doctor Assignment Picker Modal from Matrix */}
      {assignDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md my-8">
            <Card surface="cream" shadow="elevated" className="p-6 space-y-4" hoverLift={true} index={3}>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display text-base text-ink font-semibold">
                  Doctor Assignment: {assignDoctorModal.serviceTitle}
                </h3>
                <button
                  onClick={() => setAssignDoctorModal(null)}
                  className="text-xs text-ink-soft hover:text-ink font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {assignDoctorModal.providerIds.length === 0 ? (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-semibold">Empty Set (Default)</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                        Every active doctor at this clinic performs this service. Select individual doctors below to restrict eligibility.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span>
                      {assignDoctorModal.providerIds.length} doctor{assignDoctorModal.providerIds.length > 1 ? "s" : ""} selected.
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAssignDoctorModal({ ...assignDoctorModal, providerIds: [] })
                      }
                      className="text-forest underline font-semibold text-[11px]"
                    >
                      Reset to All Doctors
                    </button>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto border border-line rounded-lg p-2 bg-bone space-y-1">
                  {teamMembers.map((tm) => {
                    const isChecked = assignDoctorModal.providerIds.includes(tm.id);
                    return (
                      <label
                        key={tm.id}
                        className="flex items-center gap-2.5 text-xs text-ink p-2 rounded hover:bg-cream cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...assignDoctorModal.providerIds, tm.id]
                              : assignDoctorModal.providerIds.filter((id) => id !== tm.id);
                            setAssignDoctorModal({ ...assignDoctorModal, providerIds: newIds });
                          }}
                          className="rounded border-line text-forest focus:ring-forest"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink truncate">{tm.displayName}</p>
                          <p className="text-[10px] text-ink-soft truncate">
                            {tm.professionalTitle || tm.role}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-line/60 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAssignDoctorModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveDoctorAssignment}
                >
                  Save Assignment
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  </AnimatedPage>
  );
}
