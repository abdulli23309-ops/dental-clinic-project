"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { toast } from "sonner";
import {
  AlertCircle,
  Edit2,
  FileText,
  ImageIcon,
  Plus,
  Power,
  PowerOff,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  ClinicalNoteTemplate,
  createClinicalNoteTemplate,
  getClinicalNoteTemplates,
  updateClinicalNoteTemplate,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Card } from "@/components/ui/card";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Skeleton } from "@/components/ui/skeleton";
import {
  modalOverlay,
  modalContent,
  reducedVariant,
} from "@/animations/variants";

interface AttachedImage {
  id: string;
  name: string;
  size: number;
  url: string;
}

export default function AdminNoteTemplatesPage() {
  const { accessToken } = useAuth();

  const [templates, setTemplates] = useState<ClinicalNoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClinicalNoteTemplate | null>(null);
  const [name, setName] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attachments State (1 to 5 images per template)
  const [attachments, setAttachments] = useState<AttachedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    getClinicalNoteTemplates(false, accessToken)
      .then((data) => {
        if (isMounted) setTemplates(data);
      })
      .catch((err) => {
        console.error("Failed to load note templates:", err);
        toast.error("Failed to load note templates.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName("");
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
    setActive(true);
    setFormError(null);
    setAttachments([]);
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: ClinicalNoteTemplate) => {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setSubjective(tmpl.subjective);
    setObjective(tmpl.objective);
    setAssessment(tmpl.assessment);
    setPlan(tmpl.plan);
    setActive(tmpl.active);
    setFormError(null);
    setAttachments([]);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (tmpl: ClinicalNoteTemplate) => {
    try {
      const updated = await updateClinicalNoteTemplate(
        tmpl.id,
        { active: !tmpl.active },
        accessToken
      );
      setTemplates((prev) =>
        prev.map((t) => (t.id === tmpl.id ? { ...t, active: updated.active } : t))
      );
      toast.success(
        `Template "${tmpl.name}" is now ${updated.active ? "active" : "inactive"}.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update template status.");
    }
  };

  // Process and validate uploaded files
  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    const remainingSlots = 5 - attachments.length;
    if (remainingSlots <= 0) {
      toast.warning("Maximum of 5 image attachments reached.");
      return;
    }

    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more image(s) can be attached (max 5 total).`);
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const newAttachments: AttachedImage[] = [];

    for (const file of filesToAdd) {
      if (!validImageTypes.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported image format (JPG, PNG, WEBP).`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 5MB size limit.`);
        continue;
      }
      newAttachments.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(`Attached ${newAttachments.length} image(s).`);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.url) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Template name is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingTemplate) {
        const updated = await updateClinicalNoteTemplate(
          editingTemplate.id,
          {
            name: name.trim(),
            subjective,
            objective,
            assessment,
            plan,
            active,
          },
          accessToken
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? updated : t))
        );
        toast.success("Template saved successfully.");
      } else {
        const created = await createClinicalNoteTemplate(
          {
            name: name.trim(),
            subjective,
            objective,
            assessment,
            plan,
            active,
          },
          accessToken
        );
        setTemplates((prev) => [...prev, created]);
        toast.success("Template saved successfully.");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save template.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(templates.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedTemplates = templates.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AnimatedPage>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="eyebrow mb-1">Clinical Governance</p>
            <h1 className="text-2xl sm:text-3xl font-display text-foreground font-normal">
              Clinical Note Templates
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Define standardized SOAP structure headings and prompts for clinical encounters.
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            data-testid="create-template-btn"
            variant="primary"
            size="sm"
            className="gap-2 shrink-0 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Note Template</span>
          </Button>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-tmpl-${i}`} className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2 p-3 bg-muted/40 rounded-xl">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center" hoverLift={true} index={0}>
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-base font-medium text-foreground">No templates configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create standard SOAP note templates for check-ups, fillings, and procedures.
            </p>
          </Card>
        ) : (
          <Reorder.Group
            axis="y"
            values={templates}
            onReorder={(newOrder) => {
              setTemplates(newOrder);
              toast.success("Note template display order updated.");
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            {paginatedTemplates.map((tmpl) => (
              <Reorder.Item
                key={tmpl.id}
                value={tmpl}
                whileDrag={{
                  scale: 1.02,
                  boxShadow: "0 20px 30px -10px rgba(0, 0, 0, 0.15)",
                  zIndex: 40,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <div className="p-5 space-y-4 border border-border bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-foreground capitalize">
                          {tmpl.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            tmpl.active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                          }`}
                        >
                          {tmpl.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tmpl)}
                          title={tmpl.active ? "Deactivate template" : "Activate template"}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            tmpl.active
                              ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          {tmpl.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(tmpl)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    {/* SOAP Preview */}
                    <div className="space-y-2 bg-muted/40 p-3.5 rounded-xl text-xs font-mono border border-border/50">
                      <div>
                        <span className="font-bold text-primary">S (Subjective):</span>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-0.5 line-clamp-2">
                          {tmpl.subjective || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-primary">O (Objective):</span>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-0.5 line-clamp-2">
                          {tmpl.objective || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-primary">A (Assessment):</span>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-0.5 line-clamp-2">
                          {tmpl.assessment || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-primary">P (Plan):</span>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-0.5 line-clamp-2">
                          {tmpl.plan || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        {!isLoading && templates.length > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={page}
              totalItems={templates.length}
              pageSize={pageSize}
              pageSizeOptions={[6, 12, 24]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemName="Templates"
            />
          </div>
        )}

        {/* Edit / Create Modal (Light Theme Enterprise SaaS) */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={reducedVariant(modalOverlay)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false);
              }}
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalContent}
                className="bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-200"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {editingTemplate ? `Edit Note Template: ${editingTemplate.name}` : "Create Note Template"}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Standardize clinical SOAP note structures, instructions, and reference diagrams.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="overflow-y-auto p-6 sm:p-7 space-y-6 flex-1">
                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form id="note-template-form" onSubmit={handleSave} className="space-y-6">
                    {/* Template Name & Active Switch Header */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Template Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Routine Dental Check-up, Composite Filling, Root Canal"
                          className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-xs font-semibold text-slate-700">
                          Status for Clinicians
                        </span>
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={active}
                            onClick={() => setActive(!active)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              active ? "bg-primary" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                active ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span className="text-xs font-semibold text-slate-700 select-none">
                            {active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SOAP Clinical Sections */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          SOAP Documentation Prompts
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Supports Markdown &amp; Clinical Placeholders
                        </span>
                      </div>

                      {/* Subjective */}
                      <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/40">
                        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">
                              S
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Subjective (S) Prompt Structure
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Chief complaint, history of present illness, pain scale
                          </span>
                        </div>
                        <div className="p-3">
                          <textarea
                            rows={3}
                            value={subjective}
                            onChange={(e) => setSubjective(e.target.value)}
                            placeholder="Chief Complaint: [Describe patient concern]&#10;History of Present Illness: [Onset, duration, severity 1-10]&#10;Medical History Updates: [None reported / Updated allergies]"
                            className="w-full text-xs font-mono bg-white rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all resize-y"
                          />
                        </div>
                      </div>

                      {/* Objective */}
                      <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/40">
                        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center">
                              O
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Objective (O) Prompt Structure
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Clinical exam, tooth charts, radiographic findings
                          </span>
                        </div>
                        <div className="p-3">
                          <textarea
                            rows={3}
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            placeholder="Tooth # [x]: Clinical Exam [Mobility, percussion, palpation]&#10;Perio: Probing depths [x]mm, bleeding on probing [+/-]&#10;Radiographs: [Bite-wings / Periapical taken - findings]"
                            className="w-full text-xs font-mono bg-white rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all resize-y"
                          />
                        </div>
                      </div>

                      {/* Assessment */}
                      <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/40">
                        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                              A
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Assessment (A) Prompt Structure
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Diagnosis, clinical impression, caries risk, prognosis
                          </span>
                        </div>
                        <div className="p-3">
                          <textarea
                            rows={3}
                            value={assessment}
                            onChange={(e) => setAssessment(e.target.value)}
                            placeholder="Primary Diagnosis: [e.g. Irreversible Pulpitis, Caries Class II]&#10;Caries Risk Assessment: [Low / Moderate / High]&#10;Prognosis: [Favorable / Guarded]"
                            className="w-full text-xs font-mono bg-white rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all resize-y"
                          />
                        </div>
                      </div>

                      {/* Plan */}
                      <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/40">
                        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[11px] font-bold flex items-center justify-center">
                              P
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Plan (P) Prompt Structure
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Procedures performed, medications, post-op, recall
                          </span>
                        </div>
                        <div className="p-3">
                          <textarea
                            rows={3}
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder="Treatment Rendered: [Anesthesia type & amount, procedure details]&#10;Materials Used: [Bonding agent, composite shade]&#10;Post-Op Instructions: [Given verbally & printed]&#10;Next Appointment: [Recall interval, next procedure]"
                            className="w-full text-xs font-mono bg-white rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all resize-y"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Attachments Section (New Feature: 1 to 5 Images) */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <span>Attachments / Reference Images</span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {attachments.length} / 5 attached
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Up to 5 images (max 5MB each) to attach as visual reference for clinicians using this template.
                          </p>
                        </div>
                        {attachments.length < 5 && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                          >
                            + Browse Files
                          </button>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          processFiles(e.target.files);
                          if (e.target) e.target.value = "";
                        }}
                      />

                      {/* Drag & Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => {
                          if (attachments.length < 5) {
                            fileInputRef.current?.click();
                          }
                        }}
                        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                          attachments.length >= 5
                            ? "border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-60"
                            : isDragging
                            ? "border-primary bg-primary/5 cursor-copy"
                            : "border-slate-200 hover:border-primary/50 hover:bg-slate-50/60 bg-slate-50/30 cursor-pointer"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {attachments.length >= 5
                                ? "Maximum limit of 5 attachments reached"
                                : "Drag & drop reference diagrams/images, or click to browse"}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Supports PNG, JPG, WEBP (up to 5MB each)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Image Thumbnails Grid */}
                      {attachments.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                          {attachments.map((item, index) => (
                            <div
                              key={item.id}
                              className="group relative rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs overflow-hidden flex flex-col"
                            >
                              <div className="aspect-square w-full rounded-lg bg-slate-100 overflow-hidden relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(item.id);
                                  }}
                                  title="Remove image"
                                  aria-label={`Remove ${item.name}`}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="mt-1 px-1">
                                <p className="text-[10px] font-semibold text-slate-700 truncate" title={item.name}>
                                  {index + 1}. {item.name}
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  {(item.size / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="note-template-form"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    className="shadow-xs font-semibold px-5"
                  >
                    {isSubmitting ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
