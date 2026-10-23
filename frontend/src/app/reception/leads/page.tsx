"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  History,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Tag,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import {
  convertReceptionLead,
  createReceptionLead,
  getReceptionLeads,
  getReceptionLeadTimeline,
  LeadTimelineItem,
  logReceptionLeadAttempt,
  ReceptionLead,
  updateReceptionLeadStatus,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { TabNav } from "@/components/ui/tab-nav";
import { Card } from "@/components/ui/card";
import { AnimatedPage } from "@/components/ui/animated-page";
import { drawerSlide } from "@/animations/variants";
import { fadeIn } from "@/animations/variants";

export default function ReceptionLeadsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [leads, setLeads] = useState<ReceptionLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Lead Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [utmSource, setUtmSource] = useState("call_desk");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Status Change Modal State
  const [statusModalLead, setStatusModalLead] = useState<ReceptionLead | null>(null);
  const [targetStatus, setTargetStatus] = useState("cold");
  const [statusReason, setStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Contact Attempt Modal State
  const [attemptModalLead, setAttemptModalLead] = useState<ReceptionLead | null>(null);
  const [attemptChannel, setAttemptChannel] = useState("phone");
  const [attemptResult, setAttemptResult] = useState("no_answer");
  const [attemptNote, setAttemptNote] = useState("");
  const [isLoggingAttempt, setIsLoggingAttempt] = useState(false);

  // Timeline Modal State
  const [timelineLead, setTimelineLead] = useState<ReceptionLead | null>(null);
  const [timelineItems, setTimelineItems] = useState<LeadTimelineItem[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await getReceptionLeads(statusFilter || undefined, accessToken);
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadLeads();
    });
  }, [statusFilter, accessToken]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      await createReceptionLead(
        {
          firstName,
          lastName,
          phone,
          email: email || undefined,
          notes: notes || undefined,
          utmSource: utmSource || "call_desk",
        },
        accessToken
      );
      setIsModalOpen(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setUtmSource("call_desk");
      await loadLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    setActionLoadingId(leadId);
    try {
      const res = await convertReceptionLead(leadId, accessToken);
      alert(res.message || "Lead successfully converted to Patient!");
      router.push(`/reception/patients/${res.patientId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to convert lead.");
      setActionLoadingId(null);
    }
  };

  const handleOpenStatusModal = (lead: ReceptionLead) => {
    setStatusModalLead(lead);
    setTargetStatus(lead.status === "unconverted" ? "cold" : "unconverted");
    setStatusReason("");
  };

  const handleSaveStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalLead) return;
    if (!statusReason.trim()) {
      alert("A reason is mandatory for auditing manual lead status transitions.");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateReceptionLeadStatus(
        statusModalLead.id,
        targetStatus,
        statusReason.trim(),
        accessToken
      );
      setStatusModalLead(null);
      await loadLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update lead status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenAttemptModal = (lead: ReceptionLead) => {
    setAttemptModalLead(lead);
    setAttemptChannel("phone");
    setAttemptResult("no_answer");
    setAttemptNote("");
  };

  const handleLogAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attemptModalLead) return;
    setIsLoggingAttempt(true);
    try {
      await logReceptionLeadAttempt(
        attemptModalLead.id,
        {
          channel: attemptChannel,
          result: attemptResult,
          note: attemptNote.trim() || undefined,
        },
        accessToken
      );
      setAttemptModalLead(null);
      await loadLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to log contact attempt.");
    } finally {
      setIsLoggingAttempt(false);
    }
  };

  const handleOpenTimeline = async (lead: ReceptionLead) => {
    setTimelineLead(lead);
    setIsTimelineLoading(true);
    try {
      const items = await getReceptionLeadTimeline(lead.id, accessToken);
      setTimelineItems(items);
    } catch (err) {
      console.error("Failed to load timeline", err);
      setTimelineItems([]);
    } finally {
      setIsTimelineLoading(false);
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
            Prospective Patient Leads Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Lifecycle engine: track attempts, timeline events, and transition leads to registered patient charts.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between overflow-x-auto">
        <TabNav
          tabs={[
            { id: "", label: "All Leads" },
            { id: "unconverted", label: "Unconverted" },
            { id: "converted", label: "Converted" },
            { id: "patient", label: "Patient" },
            { id: "cold", label: "Cold" },
            { id: "failed_conversion", label: "Failed Conversion" },
            { id: "archived", label: "Archived" },
          ]}
          activeTab={statusFilter}
          onSelect={(id) => setStatusFilter(id)}
          layoutId="reception-leads-tab-pill"
          getTestId={(id) => `tab-${id || "all"}`}
        />
      </div>

      {/* Leads List */}
      <Card surface="bone" shadow="subtle" className="overflow-hidden" hoverLift={true} index={0}>
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-gray-500">
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UserX className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              No leads found
            </p>
            <p className="text-xs text-gray-500">Click &quot;New Lead&quot; to register an inquiry.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {leads.map((l) => (
              <div
                key={l.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors text-xs"
              >
                <div className="space-y-2 max-w-2xl">
                  {/* Name, Status & Source */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {l.fullName}
                    </span>
                    <span
                      className={`
                        px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold
                        ${
                          l.status === "unconverted"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : l.status === "converted"
                            ? "bg-primary/10 text-primary font-bold"
                            : l.status === "patient"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold"
                            : l.status === "cold"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : l.status === "failed_conversion"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }
                      `}
                    >
                      {l.status.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sand/60 dark:bg-gray-800 border border-line/60 text-[10px] font-mono text-gray-600 dark:text-gray-400">
                      <Tag className="h-2.5 w-2.5 text-primary" />
                      <span>{l.source || l.utmSource || "manual"}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-gray-500">
                      Attempts: {l.attempts ?? 0}
                    </span>
                  </div>

                  {/* Contact Info & Attempt Timings */}
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a href={`tel:${l.phone}`} className="hover:underline">
                        {l.phone}
                      </a>
                    </span>
                    {l.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                        <span>{l.email}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        Last contacted:{" "}
                        {l.lastContactedAt
                          ? new Date(l.lastContactedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </span>
                    </span>
                    {l.nextAttemptAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Next attempt:{" "}
                          {new Date(l.nextAttemptAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    )}
                  </div>

                  {l.notes && (
                    <p className="text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
                      {l.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Link to Call Desk */}
                  <Link
                    href={`/reception/call-desk?phone=${encodeURIComponent(l.phone)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary/30 text-primary font-medium hover:bg-primary/10 transition-colors"
                    title="Open in Call Desk"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Call Desk</span>
                  </Link>

                  {/* View Timeline */}
                  <button
                    onClick={() => handleOpenTimeline(l)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-gray-500" />
                    <span>Timeline</span>
                  </button>

                  {/* Log Contact Attempt */}
                  <button
                    onClick={() => handleOpenAttemptModal(l)}
                    data-testid="log-attempt-btn"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-forest/30 text-forest font-medium hover:bg-forest/10 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Log Attempt</span>
                  </button>

                  {/* Manual Status Change */}
                  <button
                    onClick={() => handleOpenStatusModal(l)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
                  >
                    <span>Change Status</span>
                  </button>

                  {/* Convert to Patient Chart */}
                  {l.status !== "converted" && l.status !== "patient" && (
                    <button
                      onClick={() => handleConvert(l.id)}
                      disabled={actionLoadingId === l.id}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 shadow-xs transition-colors cursor-pointer"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Convert</span>
                    </button>
                  )}

                  {(l.status === "converted" || l.status === "patient") && l.convertedPatientId && (
                    <Link
                      href={`/reception/patients/${l.convertedPatientId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <span>Patient Chart</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Manual Status Change Modal */}
      {statusModalLead && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                  Update Lead Status
                </h2>
                <p className="text-xs text-gray-500">
                  Lead: {statusModalLead.fullName} (Current: {statusModalLead.status})
                </p>
              </div>
              <button
                onClick={() => setStatusModalLead(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusChange} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Target Status *</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary text-xs"
                >
                  <option value="unconverted">Unconverted</option>
                  <option value="converted">Converted</option>
                  <option value="patient">Patient</option>
                  <option value="cold">Cold</option>
                  <option value="failed_conversion">Failed Conversion</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Audit Reason (Mandatory) *
                </label>
                <textarea
                  id="audit-reason-input"
                  required
                  rows={3}
                  placeholder="Explain why this status is being updated manually..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalLead(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 cursor-pointer transition-colors"
                >
                  {isUpdatingStatus ? "Updating..." : "Confirm Change"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Timeline Drawer / Modal */}
      {timelineLead && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              variants={drawerSlide}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
            >
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span>Lead Activity Timeline: {timelineLead.fullName}</span>
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Phone: {timelineLead.phone} · Source: {timelineLead.source || "manual"}
                </p>
              </div>
              <button
                onClick={() => setTimelineLead(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isTimelineLoading ? (
                <div className="p-8 text-center text-xs font-mono text-gray-500">
                  Loading timeline events...
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  No activity recorded yet for this lead.
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 space-y-6">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      <div
                        className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 ${
                          item.type === "event"
                            ? "bg-purple-600"
                            : item.type === "message"
                            ? "bg-blue-600"
                            : item.type === "call"
                            ? "bg-amber-600"
                            : "bg-emerald-600"
                        }`}
                      />

                      <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold uppercase font-mono text-[10px] text-gray-600 dark:text-gray-300">
                            {item.type} · {item.eventType || item.direction || item.outcome || item.status || "activity"}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}
                          </span>
                        </div>

                        {item.content && (
                          <p className="text-gray-700 dark:text-gray-200 font-medium">
                            {item.content}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-gray-600 dark:text-gray-300 italic">
                            Notes: {item.notes}
                          </p>
                        )}

                        {item.payload && (
                          <div className="text-[11px] font-mono text-gray-500 bg-white dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800 mt-1">
                            {item.payload.reason && <div>Reason: {item.payload.reason}</div>}
                            {item.payload.previous_status && (
                              <div>
                                Transition: {item.payload.previous_status} &rarr; {item.payload.new_status}
                              </div>
                            )}
                            {item.payload.booking_id && <div>Booking ID: {item.payload.booking_id}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setTimelineLead(null)}
                className="px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Log Contact Attempt Modal */}
      {attemptModalLead && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                Log Contact Attempt: {attemptModalLead.fullName}
              </h2>
              <button
                onClick={() => setAttemptModalLead(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogAttempt} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Contact Channel</label>
                <select
                  value={attemptChannel}
                  onChange={(e) => setAttemptChannel(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary text-xs"
                >
                  <option value="phone">Phone Call</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Attempt Result</label>
                <select
                  value={attemptResult}
                  onChange={(e) => setAttemptResult(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary text-xs"
                >
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Line Busy</option>
                  <option value="left_voicemail">Left Voicemail</option>
                  <option value="spoke">Spoke with Caller</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="wrong_number">Wrong Number</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes on the conversation, callback time, etc."
                  value={attemptNote}
                  onChange={(e) => setAttemptNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAttemptModalLead(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingAttempt}
                  data-testid="submit-attempt-btn"
                  className="px-4 py-2 rounded-full bg-forest text-white font-semibold hover:bg-forest/90 cursor-pointer transition-colors"
                >
                  {isLoggingAttempt ? "Logging..." : "Log Attempt"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* New Lead Modal */}
      {isModalOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                Register Inbound Lead
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 dark:text-gray-300">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1-555-0199"
                    data-testid="lead-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-mono focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    placeholder="prospect@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Lead Source Channel</label>
                <select
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary text-xs"
                >
                  <option value="call_desk">Call Desk</option>
                  <option value="website_abandon">Website Abandon</option>
                  <option value="website_booking">Website Booking</option>
                  <option value="whatsapp_message">WhatsApp Message</option>
                  <option value="whatsapp_missed_call">WhatsApp Missed Call</option>
                  <option value="phone_missed_call">Phone Missed Call</option>
                  <option value="manual">Manual Reception</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Inquiry Notes</label>
                <textarea
                  rows={2}
                  placeholder="Inquiry reason, cosmetic interest, emergency pain, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 cursor-pointer transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save Lead"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  </AnimatedPage>
  );
}
