"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Check,
  Copy,
  Globe,
  Key,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  AdminIntegrationClient,
  createAdminIntegrationClient,
  getAdminIntegrationClients,
  revokeAdminIntegrationClient,
  rotateAdminIntegrationClientKey,
  toggleAdminIntegrationClientActive,
} from "@/lib/api";

const AVAILABLE_SCOPES = [
  { id: "leads:read", label: "Read Leads", description: "Query and view captured and due follow-up leads" },
  { id: "leads:write", label: "Write Leads", description: "Capture leads, log contact attempts, update statuses" },
  { id: "messages:read", label: "Read Messages", description: "Query communication history" },
  { id: "messages:write", label: "Record Messages", description: "Record inbound and outbound message events" },
  { id: "bookings:read", label: "Read Bookings", description: "Query booking options and confirmation data" },
  { id: "bookings:write", label: "Manage Bookings", description: "Create, cancel, and reschedule appointment bookings" },
  { id: "lookup:read", label: "Phone Lookup", description: "Lookup caller history, holds, and prior booking choices" },
];

export default function AdminIntegrationsPage() {
  const { accessToken } = useAuth();

  const [clients, setClients] = useState<AdminIntegrationClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Client Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>([
    "leads:read",
    "leads:write",
    "messages:write",
    "bookings:read",
    "bookings:write",
    "lookup:read",
  ]);
  const [newIpAllowlist, setNewIpAllowlist] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Secret Key Revealed Modal (Shown Once)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedClientName, setRevealedClientName] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState(false);

  // Action Loading
  const [actionClientId, setActionClientId] = useState<string | null>(null);

  async function loadClients() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminIntegrationClients(accessToken);
      setClients(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load integration clients.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      queueMicrotask(() => {
        loadClients();
      });
    }
  }, [accessToken]);

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const ips = newIpAllowlist
        .split(",")
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);

      const res = await createAdminIntegrationClient(
        {
          name: newName.trim(),
          scopes: newScopes,
          ipAllowlist: ips.length > 0 ? ips : undefined,
        },
        accessToken
      );

      setIsCreateModalOpen(false);
      setRevealedClientName(res.client.name);
      setRevealedKey(res.rawKey);
      setCopiedKey(false);
      setNewName("");
      setNewIpAllowlist("");
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create client.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRotateKey(client: AdminIntegrationClient) {
    const confirmRotate = window.confirm(
      `Are you sure you want to rotate the key for '${client.name}'?\nThe existing key will be permanently invalidated immediately.`
    );
    if (!confirmRotate) return;

    setActionClientId(client.id);
    try {
      const res = await rotateAdminIntegrationClientKey(client.id, accessToken);
      setRevealedClientName(res.client.name);
      setRevealedKey(res.rawKey);
      setCopiedKey(false);
      await loadClients();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to rotate key.");
    } finally {
      setActionClientId(null);
    }
  }

  async function handleToggleActive(client: AdminIntegrationClient) {
    setActionClientId(client.id);
    try {
      await toggleAdminIntegrationClientActive(client.id, accessToken);
      await loadClients();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status.");
    } finally {
      setActionClientId(null);
    }
  }

  async function handleRevoke(client: AdminIntegrationClient) {
    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke '${client.name}'?\nIt will immediately stop accepting API calls.`
    );
    if (!confirmRevoke) return;

    setActionClientId(client.id);
    try {
      await revokeAdminIntegrationClient(client.id, accessToken);
      await loadClients();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to revoke client.");
    } finally {
      setActionClientId(null);
    }
  }

  function handleCopyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  }

  function toggleScope(scopeId: string) {
    if (newScopes.includes(scopeId)) {
      setNewScopes(newScopes.filter((s) => s !== scopeId));
    } else {
      setNewScopes([...newScopes, scopeId]);
    }
  }

  return (
  <AnimatedPage>
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow mb-1">Developer & Automation Seam</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-forest" />
            <span>API Integrations</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage scoped API keys and IP allow-lists for WhatsApp, SMS, IVR, and webhook automations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          data-testid="create-integration-btn"
          onClick={() => {
            setIsCreateModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>New API Client</span>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clients Table Card */}
      <Card surface="bone" shadow="subtle" className="overflow-hidden border border-line" hoverLift={true} index={0}>
        <div className="p-4 sm:p-5 border-b border-line/60 bg-cream/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-forest" />
            <h2 className="text-sm font-semibold text-ink">Registered Integration Clients</h2>
          </div>
          <span className="text-xs text-ink-soft">
            {clients.length} {clients.length === 1 ? "client" : "clients"} configured
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-ink-soft">
            <StaggerList className="flex flex-col items-center justify-center gap-2">
              <StaggerItem index={0}><Skeleton className="h-4 w-1/3" /></StaggerItem>
              <StaggerItem index={1}><Skeleton className="h-4 w-1/2" /></StaggerItem>
              <StaggerItem index={2}><Skeleton className="h-4 w-2/3" /></StaggerItem>
            </StaggerList>
            <p className="mt-2 text-xs text-ink-soft">Loading integration clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Shield className="h-10 w-10 text-ink-soft/40 mx-auto" />
            <p className="text-sm font-medium text-ink">No integration clients yet</p>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              Create an API key to allow external WhatsApp or SMS automation systems to sync leads and bookings securely.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Create First Integration Key</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-cream/60 text-ink-soft font-medium uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Key Prefix</th>
                  <th className="py-3 px-4">Scopes</th>
                  <th className="py-3 px-4">IP Allowlist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Used</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="divide-y divide-line/60"
              >
                {clients.map((c) => {
                  const isBusy = actionClientId === c.id;
                  return (
                    <motion.tr
                      key={c.id}
                      data-testid={`integration-client-row-${c.id}`}
                      variants={listItem}
                      initial="hidden"
                      animate="visible"
                      className="hover:bg-sand/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-ink">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-ink-soft">
                        <span className="bg-bone px-2 py-0.5 rounded border border-line">
                          {c.keyPrefix}...
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.scopes.map((scope) => (
                            <span
                              key={scope}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-forest/10 text-forest border border-forest/20"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-ink-soft">
                        {c.ipAllowlist && c.ipAllowlist.length > 0 ? (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-ink">
                            <Globe className="h-3 w-3 text-ink-soft" />
                            {c.ipAllowlist.join(", ")}
                          </span>
                        ) : (
                          <span className="text-ink-soft/70 italic text-[11px]">Any IP (Allow-all)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <ShieldCheck className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            <ShieldAlert className="h-3 w-3" />
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-ink-soft text-[11px]">
                        {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : "Never used"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleRotateKey(c)}
                            title="Rotate Key (Generates new random key)"
                            className="h-7 px-2 text-[11px]"
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isBusy ? "animate-spin" : ""}`} />
                            <span>Rotate</span>
                          </Button>

                          {c.isActive ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleRevoke(c)}
                              title="Revoke access immediately"
                              className="h-7 px-2 text-[11px] text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
                            >
                              <span>Revoke</span>
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleToggleActive(c)}
                              title="Reactivate client key"
                              className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                            >
                              <span>Reactivate</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </Card>

      {/* REVEALED KEY MODAL (SHOWN EXACTLY ONCE) */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={reducedVariant(modalOverlay)}
            data-testid="key-revealed-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalContent}
              className="w-full max-w-lg rounded-2xl bg-cream border border-forest/30 shadow-2xl p-6 space-y-5"
            >
            <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300">
              <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300">
                <Key className="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  API Key Created for {revealedClientName}
                </h3>
                <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                  Copy this key now. It will NEVER be shown again!
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/40 space-y-2">
              <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                X-Marlow-Key (32-byte Cryptographic Secret)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={revealedKey}
                  data-testid="revealed-key-input"
                  className="w-full px-3 py-2 rounded-lg border border-line bg-white dark:bg-stone-900 font-mono text-xs text-ink select-all shadow-inner"
                />
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="copy-key-btn"
                  onClick={handleCopyKey}
                  className="shrink-0 h-9"
                >
                  {copiedKey ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              Authenticate all automation requests by including this secret in the{" "}
              <code className="px-1.5 py-0.5 rounded bg-sand font-mono text-ink text-[11px]">
                X-Marlow-Key
              </code>{" "}
              HTTP header. The raw key is hashed before storage and cannot be retrieved later.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setRevealedKey(null)}
                data-testid="close-revealed-key-btn"
              >
                I Have Saved This Key Securely
              </Button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE CLIENT MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={reducedVariant(modalOverlay)}
            data-testid="create-client-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalContent}
              className="w-full max-w-md rounded-2xl bg-cream border border-line shadow-2xl p-6 space-y-5"
            >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-forest" />
                <h3 className="font-display text-lg font-semibold text-ink">
                  New Integration Client
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-ink-soft hover:text-ink text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Client / Integration Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. WhatsApp Bot Production"
                  className="w-full px-3 py-2 rounded-xl border border-line bg-white dark:bg-stone-900 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Authorized Scopes *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {AVAILABLE_SCOPES.map((sc) => {
                    const isSelected = newScopes.includes(sc.id);
                    return (
                      <label
                        key={sc.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "border-forest/50 bg-forest/5 text-ink font-medium"
                            : "border-line bg-cream/40 text-ink-soft"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleScope(sc.id)}
                          className="mt-0.5 rounded border-line text-forest focus:ring-forest"
                        />
                        <div>
                          <p className="font-mono text-[11px] text-ink">{sc.id}</p>
                          <p className="text-[10px] text-ink-soft">{sc.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  IP Allowlist (Optional)
                </label>
                <input
                  type="text"
                  value={newIpAllowlist}
                  onChange={(e) => setNewIpAllowlist(e.target.value)}
                  placeholder="e.g. 192.168.1.100, 10.0.0.5 (comma separated)"
                  className="w-full px-3 py-2 rounded-xl border border-line bg-white dark:bg-stone-900 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                />
                <p className="text-[10px] text-ink-soft mt-1">
                  Leave blank to allow requests from any IP address.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !newName.trim() || newScopes.length === 0}
                >
                  {isSubmitting ? "Generating Key..." : "Generate Key"}
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
