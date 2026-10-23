"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FileText,
  Plus,
  Power,
  PowerOff,
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
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Skeleton } from "@/components/ui/skeleton";
import { StaggerList, StaggerItem } from "@/components/ui/stagger-list";
import {
  staggerContainer,
  listItem,
  modalOverlay,
  modalContent,
  reducedVariant,
} from "@/animations/variants";

export default function AdminNoteTemplatesPage() {
  const { accessToken } = useAuth();

  const [templates, setTemplates] = useState<ClinicalNoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    getClinicalNoteTemplates(false, accessToken)
      .then((data) => {
        if (isMounted) setTemplates(data);
      })
      .catch((err) => {
        console.error("Failed to load note templates:", err);
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
      setActionMessage(
        `Template "${tmpl.name}" is now ${updated.active ? "active" : "inactive"}.`
      );
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update template status.");
    }
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
        setActionMessage(`Template "${updated.name}" updated successfully.`);
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
        setActionMessage(`Template "${created.name}" created successfully.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow mb-1">Clinical Governance</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Clinical Note Templates
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Define standardized SOAP structure headings and prompts for clinical encounters.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          data-testid="create-template-btn"
          className="gap-2 shrink-0 bg-primary text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Create Note Template
        </Button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="p-12 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
          <StaggerList className="flex flex-col items-center justify-center gap-2">
            <StaggerItem index={0}><Skeleton className="h-4 w-1/3" /></StaggerItem>
            <StaggerItem index={1}><Skeleton className="h-4 w-1/2" /></StaggerItem>
            <StaggerItem index={2}><Skeleton className="h-4 w-2/3" /></StaggerItem>
          </StaggerList>
          <p className="text-xs text-ink-soft">Loading note templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center" hoverLift={true} index={0}>
          <FileText className="h-10 w-10 text-ink-soft mx-auto mb-3 opacity-60" />
          <p className="text-base font-medium text-ink">No templates configured</p>
          <p className="text-xs text-ink-soft mt-1">
            Create standard SOAP note templates for check-ups, fillings, and procedures.
          </p>
        </Card>
      ) : (
        <StaggerList className="grid gap-4 md:grid-cols-2">
          {templates.map((tmpl, idx) => (
            <StaggerItem key={tmpl.id} index={idx}>
              <Card className="p-5 space-y-4 border hover:border-primary/40 transition-all flex flex-col justify-between" index={1}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-medium text-ink capitalize">
                      {tmpl.name}
                    </h3>
                    <span
                      className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                        tmpl.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                      }`}
                    >
                      {tmpl.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(tmpl)}
                      title={tmpl.active ? "Deactivate template" : "Activate template"}
                      className={`h-8 w-8 p-0 ${
                        tmpl.active ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"
                      }`}
                    >
                      {tmpl.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(tmpl)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                </div>

                {/* SOAP Preview */}
                <div className="space-y-2 bg-muted/40 p-3 rounded-md text-xs font-mono">
                  <div>
                    <span className="font-semibold text-primary">S (Subjective):</span>
                    <p className="text-ink-soft whitespace-pre-wrap mt-0.5 line-clamp-2">
                      {tmpl.subjective || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-primary">O (Objective):</span>
                    <p className="text-ink-soft whitespace-pre-wrap mt-0.5 line-clamp-2">
                      {tmpl.objective || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-primary">A (Assessment):</span>
                    <p className="text-ink-soft whitespace-pre-wrap mt-0.5 line-clamp-2">
                      {tmpl.assessment || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-primary">P (Plan):</span>
                    <p className="text-ink-soft whitespace-pre-wrap mt-0.5 line-clamp-2">
                      {tmpl.plan || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {/* Edit / Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={reducedVariant(modalOverlay)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalContent}
              className="bg-surface rounded-xl shadow-xl w-full max-w-2xl border border-line p-6 space-y-4 my-8"
            >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-display font-medium text-ink">
                {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create Note Template"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink-soft hover:text-ink transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-ink mb-1">
                    Template Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. check-up, filling, extraction, root canal visit"
                    className="w-full text-xs px-3 py-2 bg-surface rounded-md border border-line focus:outline-none focus:ring-1 focus:ring-primary text-ink"
                  />
                </div>

                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="active-toggle"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-line text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="active-toggle" className="text-xs text-ink font-medium select-none cursor-pointer">
                    Active for clinicians
                  </label>
                </div>
              </div>

              {/* SOAP Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Subjective (S) Prompt Structure
                  </label>
                  <TextField
                    id="template-subjective"
                    label="Subjective (S) Prompt Structure"
                    multiline
                    rows={2}
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    placeholder="Chief Complaint: [...]\nHistory of Present Complaint: [...]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Objective (O) Prompt Structure
                  </label>
                  <TextField
                    id="template-objective"
                    label="Objective (O) Prompt Structure"
                    multiline
                    rows={2}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Clinical Examination: [...]\nRadiographic Findings: [...]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Assessment (A) Prompt Structure
                  </label>
                  <TextField
                    id="template-assessment"
                    label="Assessment (A) Prompt Structure"
                    multiline
                    rows={2}
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Diagnosis / Impression: [...]\nPrognosis: [...]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Plan (P) Prompt Structure
                  </label>
                  <TextField
                    id="template-plan"
                    label="Plan (P) Prompt Structure"
                    multiline
                    rows={2}
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Procedures Executed: [...]\nPost-Operative Instructions: [...]\nNext Visit: [...]"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white hover:bg-primary-dark"
                >
                  {isSubmitting ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  </AnimatedPage>
  );
}
