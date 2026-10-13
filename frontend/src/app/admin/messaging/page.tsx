"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Moon,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getMessageLogs,
  getMessagingSettings,
  MessageLogItem,
  MessagingSettings,
  runReminderScheduler,
  updateMessagingSettings,
} from "@/lib/api";

const TEMPLATE_VARIABLES = [
  { key: "{patient_name}", desc: "Patient full name" },
  { key: "{appointment_date}", desc: "Appointment date (e.g. 2026-10-15)" },
  { key: "{appointment_time}", desc: "Appointment time (e.g. 10:30 AM)" },
  { key: "{doctor_name}", desc: "Assigned clinician name" },
  { key: "{clinic_phone}", desc: "Clinic front desk phone" },
  { key: "{clinic_name}", desc: "Clinic legal name" },
  { key: "{confirmation_id}", desc: "Booking confirmation code" },
];

export default function AdminMessagingPage() {
  const { accessToken } = useAuth();

  // Settings State
  const [settings, setSettings] = useState<MessagingSettings | null>(null);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(true);
  const [quietHoursStart, setQuietHoursStart] = useState<string>("21:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>("08:00");
  const [providerMode, setProviderMode] = useState<string>("simulated");
  const [template, setTemplate] = useState<string>("");

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Scheduler Runner State
  const [schedulerDate, setSchedulerDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [forceQuietHours, setForceQuietHours] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  // Message Logs State
  const [logs, setLogs] = useState<MessageLogItem[]>([]);
  const [logsTotal, setLogsTotal] = useState<number>(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const fetchSettingsAndLogs = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const s = await getMessagingSettings(accessToken);
      setSettings(s);
      setQuietHoursEnabled(s.quietHoursEnabled);
      setQuietHoursStart(s.quietHoursStart);
      setQuietHoursEnd(s.quietHoursEnd);
      setProviderMode(s.messagingProviderMode);
      setTemplate(s.reminderTemplate);

      setIsLoadingLogs(true);
      const l = await getMessageLogs(50, 0, accessToken);
      setLogs(l.items);
      setLogsTotal(l.total);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to load messaging configuration.");
    } finally {
      setIsLoading(false);
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndLogs();
  }, [accessToken]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const updated = await updateMessagingSettings(
        {
          quietHoursEnabled,
          quietHoursStart,
          quietHoursEnd,
          messagingProviderMode: providerMode,
          reminderTemplate: template,
        },
        accessToken
      );
      setSettings(updated);
      setSaveSuccess("Messaging and reminder settings saved successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunScheduler = async () => {
    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await runReminderScheduler(schedulerDate, forceQuietHours, accessToken);
      setDispatchResult(res.message);
      // Refresh message logs
      const l = await getMessageLogs(50, 0, accessToken);
      setLogs(l.items);
      setLogsTotal(l.total);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to execute scheduler.");
    } finally {
      setIsDispatching(false);
    }
  };

  // Preview interpolation
  const previewText = template
    .replace(/{patient_name}/g, "Zainab Malik")
    .replace(/{appointment_date}/g, schedulerDate)
    .replace(/{appointment_time}/g, "10:30 AM")
    .replace(/{doctor_name}/g, "Dr. Ayesha Khan")
    .replace(/{clinician_name}/g, "Dr. Ayesha Khan")
    .replace(/{clinic_name}/g, "Marlow Dental Clinic")
    .replace(/{clinic_phone}/g, "+92 300 1234567")
    .replace(/{confirmation_id}/g, "MD-2026-8841");

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-ink-soft">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Admin Settings / Messaging & Outreach</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            Messaging & Reminders Administration
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Configure reminder templates, quiet hours window (PKT), simulated delivery provider, and dispatch schedules.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSettingsAndLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Provider Layer Configuration */}
          <Card surface="bone" shadow="card" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-ink">Provider Layer & Modes</h2>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Honest Simulation
              </span>
            </div>

            <p className="text-xs text-ink-soft">
              Controls outbound messaging provider behavior. Under the simulated layer, all automated and manual outreach is recorded honestly as <strong>simulated</strong> without charging external telco fees or claiming false delivery.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink block">
                Provider Operating Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProviderMode("simulated")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    providerMode === "simulated"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-line bg-bone text-ink hover:bg-cream"
                  }`}
                >
                  <div className="text-xs">Simulated Mode (Active)</div>
                  <div className="text-[10px] text-ink-soft mt-0.5 font-normal">
                    Generates genuine audit logs & simulated statuses. Zero carrier cost.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProviderMode("disabled")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    providerMode === "disabled"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-line bg-bone text-ink hover:bg-cream"
                  }`}
                >
                  <div className="text-xs">Disabled Mode</div>
                  <div className="text-[10px] text-ink-soft mt-0.5 font-normal">
                    Completely halts automated reminder dispatch.
                  </div>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
              <strong>Operating Principle:</strong> Carrier SMS/WhatsApp integrations are never fabricated. All simulated messages are labeled explicitly in logs and patient files.
            </div>
          </Card>

          {/* Quiet Hours Window */}
          <Card surface="bone" shadow="card" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-ink">Quiet Hours Window (PKT)</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-2 text-xs font-semibold text-ink">
                  {quietHoursEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            <p className="text-xs text-ink-soft">
              Suppresses automated reminders during night hours (evaluated in <strong>Asia/Karachi PKT</strong>) so patients are not disturbed late at night or early in the morning.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Quiet Hours Start (Evening)
                </label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  disabled={!quietHoursEnabled}
                  className="w-full text-xs font-mono rounded-xl border border-line bg-bone p-2.5 text-ink focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <span className="text-[10px] text-ink-soft mt-1 block">Default: 21:00 (9:00 PM)</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Quiet Hours End (Morning)
                </label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  disabled={!quietHoursEnabled}
                  className="w-full text-xs font-mono rounded-xl border border-line bg-bone p-2.5 text-ink focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <span className="text-[10px] text-ink-soft mt-1 block">Default: 08:00 (8:00 AM)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900">
              When quiet hours are active, scheduler runs will hold dispatch automatically unless staff explicitly check &apos;Force Dispatch&apos;.
            </div>
          </Card>
        </div>

        {/* Template Configuration & Live Preview */}
        <Card surface="bone" shadow="card" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-bold text-ink">Appointment Reminder Template</h2>
            </div>
            <span className="text-xs text-ink-soft">Strictly non-clinical logistical reminder</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink block">
              Message Template Body
            </label>
            <textarea
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-line bg-bone p-3 text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Variables Legend */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-ink block">Supported Placeholders:</span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setTemplate((prev) => prev + " " + v.key)}
                  className="px-2 py-1 rounded-lg border border-line bg-bone hover:bg-cream text-[10px] font-mono text-ink flex items-center gap-1 transition-colors"
                  title={v.desc}
                >
                  <span className="text-primary font-bold">{v.key}</span>
                  <span className="text-ink-soft">({v.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-xl border border-line bg-cream/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Live Interpolation Preview (Simulated Patient)</span>
            </div>
            <div className="p-3 rounded-lg bg-bone border border-line text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed shadow-inner">
              {previewText}
            </div>
            <p className="text-[10px] text-ink-soft">
              Preview rendered with sample patient data. No protected health information (PHI) or diagnostic findings are included.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
              {isSaving ? "Saving Settings..." : "Save Messaging Configuration"}
            </Button>
          </div>
        </Card>
      </form>

      {/* Manual Scheduler Runner */}
      <Card surface="bone" shadow="card" className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-ink">Manual Reminder Dispatch Runner</h2>
          </div>
          <span className="text-xs text-ink-soft">Execute automated outreach on demand</span>
        </div>

        <p className="text-xs text-ink-soft">
          Triggers batch reminder dispatch for all confirmed appointments on the chosen target date. Respects patient opt-outs and quiet hours.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink whitespace-nowrap">
              Target Appointment Date:
            </label>
            <input
              type="date"
              value={schedulerDate}
              onChange={(e) => setSchedulerDate(e.target.value)}
              className="rounded-xl border border-line bg-bone px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={forceQuietHours}
              onChange={(e) => setForceQuietHours(e.target.checked)}
              className="rounded border-line text-primary focus:ring-primary h-4 w-4"
            />
            <span>Override Quiet Hours (Force dispatch immediately)</span>
          </label>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRunScheduler}
            disabled={isDispatching}
            className="flex items-center gap-1.5 shadow-sm sm:ml-auto"
          >
            <Send className={`h-3.5 w-3.5 ${isDispatching ? "animate-spin" : ""}`} />
            {isDispatching ? "Dispatching..." : "Run Reminder Dispatch Now"}
          </Button>
        </div>

        {dispatchResult && (
          <div className="p-3 rounded-xl border border-blue-300 bg-blue-50 text-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{dispatchResult}</span>
            </div>
            <button
              onClick={() => setDispatchResult(null)}
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}
      </Card>

      {/* Message Activity Logs Table */}
      <Card surface="bone" shadow="card" className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-ink">Simulated Outreach & Activity Log</h2>
          </div>
          <span className="text-xs text-ink-soft">
            Total Logged: <strong>{logsTotal}</strong>
          </span>
        </div>

        {isLoadingLogs ? (
          <div className="p-8 text-center text-xs text-ink-soft flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading message activity...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft">
            No communication records logged yet. Run the reminder scheduler to generate outreach records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line text-ink-soft text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Recipient Phone</th>
                  <th className="py-2.5 px-3">Content Preview</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-ink-soft font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-ink">
                      {log.recipientPhone || "—"}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-ink-soft" title={log.content}>
                      {log.content}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap uppercase font-semibold text-[10px] text-ink-soft">
                      {log.channel}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          log.deliveryStatus === "simulated"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : log.deliveryStatus === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : log.deliveryStatus === "failed"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : log.deliveryStatus === "opted_out"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {log.deliveryStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
