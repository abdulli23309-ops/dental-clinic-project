"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Send,
  User,
  X,
} from "lucide-react";

import {
  getReceptionMessages,
  logInboundNote,
  ReceptionMessage,
  searchReceptionPatients,
  sendReceptionMessage,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";

export default function ReceptionMessagesPage() {
  const { accessToken } = useAuth();

  const [messages, setMessages] = useState<ReceptionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [activePhone, setActivePhone] = useState<string | null>(null);

  // Send / Log states
  const [actionTab, setActionTab] = useState<"inbound" | "outbound">("inbound");
  const [inputContent, setInputContent] = useState("");
  const [inputChannel, setInputChannel] = useState<"whatsapp" | "sms" | "email" | "portal">("whatsapp");
  const [outboundPurpose, setOutboundPurpose] = useState<"manual" | "reminder" | "confirmation" | "lead_recovery">("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Conversation Modal State
  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [initialType, setInitialType] = useState<"inbound" | "outbound">("inbound");

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await getReceptionMessages(undefined, accessToken);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadMessages();
    });
  }, [accessToken]);

  // Group messages by phone number
  const conversations = useMemo(() => {
    const groups: Record<string, ReceptionMessage[]> = {};
    for (const m of messages) {
      const phoneKey = m.phoneNormalized || m.phone || m.recipient || "Unspecified";
      if (!groups[phoneKey]) {
        groups[phoneKey] = [];
      }
      groups[phoneKey].push(m);
    }

    // Sort messages in each thread chronologically ascending
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    // Sort conversations by latest message timestamp descending
    return Object.entries(groups)
      .map(([phone, thread]) => {
        const lastMsg = thread[thread.length - 1];
        return {
          phone,
          messages: thread,
          lastMessage: lastMsg,
          updatedAt: lastMsg ? new Date(lastMsg.createdAt).getTime() : 0,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [messages]);

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return conversations;
    const q = searchFilter.toLowerCase();
    return conversations.filter(
      (c) =>
        c.phone.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchFilter]);

  // Derived active phone: selected or first available
  const effectivePhone = activePhone || (conversations.length > 0 ? conversations[0].phone : null);

  const activeThread = useMemo(() => {
    if (!effectivePhone) return null;
    return conversations.find((c) => c.phone === effectivePhone) || null;
  }, [conversations, effectivePhone]);

  const handleSendOrLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePhone || !inputContent.trim()) return;

    setIsSubmitting(true);
    try {
      if (actionTab === "inbound") {
        await logInboundNote(
          {
            phone: effectivePhone,
            content: inputContent.trim(),
            channel: inputChannel,
          },
          accessToken
        );
      } else {
        await sendReceptionMessage(
          {
            channel: inputChannel,
            recipient: effectivePhone,
            body: inputContent.trim(),
            direction: "outbound",
            purpose: outboundPurpose,
          },
          accessToken
        );
      }
      setInputContent("");
      await loadMessages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !initialNote.trim()) return;

    setIsSubmitting(true);
    try {
      if (initialType === "inbound") {
        await logInboundNote(
          {
            phone: newPhone.trim(),
            content: initialNote.trim(),
            channel: inputChannel,
          },
          accessToken
        );
      } else {
        await sendReceptionMessage(
          {
            channel: inputChannel,
            recipient: newPhone.trim(),
            body: initialNote.trim(),
            direction: "outbound",
            purpose: outboundPurpose,
          },
          accessToken
        );
      }
      setActivePhone(newPhone.trim());
      setIsNewConvoOpen(false);
      setNewPhone("");
      setInitialNote("");
      await loadMessages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start conversation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
            Patient &amp; Lead Conversations
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time message history grouped by contact phone number with simulated delivery audit.
          </p>
        </div>
      </div>

      {/* Persistent Honest Notice */}
      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider font-mono text-[10px] px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60">
            Simulated Delivery Mode
          </span>
          <span>
            Internal communication log only. Nothing is delivered to patients from this screen.
          </span>
        </div>
        <button
          onClick={() => setIsNewConvoOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Thread</span>
        </button>
      </div>

      {/* Main Conversation Split View */}
      <div className="h-[74vh] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12">
        {/* Left Panel: Conversation Threads */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-gray-50/50 dark:bg-gray-950/40">
          <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold font-display uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Conversations ({conversations.length})
              </h2>
              <button
                onClick={loadMessages}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Refresh messages"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search phone or text..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-mono text-gray-400">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <Inbox className="h-6 w-6 mx-auto text-gray-300" />
                <p>No conversation threads found</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = effectivePhone === c.phone;
                return (
                  <button
                    key={c.phone}
                    data-testid={`thread-${c.phone}`}
                    onClick={() => setActivePhone(c.phone)}
                    className={`w-full p-3.5 text-left transition-colors flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-semibold text-xs text-gray-900 dark:text-white truncate">
                        {c.phone}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 truncate">
                      {c.lastMessage?.content || "No message content"}
                    </p>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-semibold ${
                          c.lastMessage?.direction === "inbound"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {c.lastMessage?.direction === "inbound" ? (
                          <ArrowDownLeft className="h-2.5 w-2.5" />
                        ) : (
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        )}
                        {c.lastMessage?.direction || "outbound"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-gray-500 bg-gray-200/60 dark:bg-gray-800">
                        {c.lastMessage?.channel || "sms"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono ml-auto">
                        {c.messages.length} msg{c.messages.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Conversation View & Action Desk */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white dark:bg-gray-900">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                      {activeThread.phone}
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {activeThread.messages.length} logged communications
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Link to Call Desk with phone parameter */}
                  <Link
                    href={`/reception/call-desk?phone=${encodeURIComponent(activeThread.phone)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold transition-colors"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Open in Call Desk</span>
                  </Link>
                </div>
              </div>

              {/* Message Bubbles Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/40 dark:bg-gray-950/20">
                {activeThread.messages.map((m) => {
                  const isInbound = m.direction === "inbound";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 text-xs shadow-2xs space-y-1.5 ${
                          isInbound
                            ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-xs"
                            : "bg-primary text-white rounded-tr-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                        <div
                          className={`flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1 border-t ${
                            isInbound
                              ? "border-gray-100 dark:border-gray-700 text-gray-500"
                              : "border-white/20 text-white/80"
                          }`}
                        >
                          <span className="font-semibold uppercase">{m.channel}</span>
                          <span>·</span>
                          <span className="capitalize">{m.purpose || "general"}</span>

                          {/* Honest Simulated Label */}
                          {!isInbound && m.deliveryStatus === "simulated" && (
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-amber-400 text-amber-950 font-mono text-[9px]">
                              Simulated (Not Delivered)
                            </span>
                          )}

                          {!isInbound && m.deliveryStatus === "delivered" && (
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-400 text-emerald-950 font-mono text-[9px]">
                              Delivered
                            </span>
                          )}

                          <span className="ml-auto opacity-75">
                            {new Date(m.createdAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Section: Log Inbound Note or Outbound Message */}
              <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActionTab("inbound")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      actionTab === "inbound"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Log Inbound Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionTab("outbound")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      actionTab === "outbound"
                        ? "bg-primary text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Log Outbound Message (Simulated)
                  </button>

                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Channel:</span>
                    <select
                      value={inputChannel}
                      onChange={(e) => setInputChannel(e.target.value as any)}
                      className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-mono"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="portal">Portal</option>
                    </select>

                    {actionTab === "outbound" && (
                      <select
                        value={outboundPurpose}
                        onChange={(e) => setOutboundPurpose(e.target.value as any)}
                        className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-mono"
                      >
                        <option value="manual">Manual Message</option>
                        <option value="reminder">Appointment Reminder</option>
                        <option value="confirmation">Confirmation</option>
                        <option value="lead_recovery">Lead Follow-up</option>
                      </select>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSendOrLog} className="flex gap-2">
                  <textarea
                    rows={2}
                    required
                    placeholder={
                      actionTab === "inbound"
                        ? "Type staff note regarding patient/lead phone call or message..."
                        : "Type message content to record in log (simulated)..."
                    }
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs focus:border-primary resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !inputContent.trim()}
                    className={`px-4 rounded-xl text-white font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      actionTab === "inbound"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    {actionTab === "inbound" ? (
                      <span>Save Note</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <span>Log</span>
                        <Send className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-2">
              <MessageSquare className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold">Select a conversation</p>
              <p className="text-xs">Choose a thread from the left or create a new conversation.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isNewConvoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                New Conversation Thread
              </h2>
              <button
                onClick={() => setIsNewConvoOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewConversation} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-mono focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Direction</label>
                  <select
                    value={initialType}
                    onChange={(e) => setInitialType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                  >
                    <option value="inbound">Inbound Note</option>
                    <option value="outbound">Outbound (Simulated)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Channel</label>
                  <select
                    value={inputChannel}
                    onChange={(e) => setInputChannel(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">Message / Note Content *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record initial message or notes..."
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewConvoOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 cursor-pointer transition-colors"
                >
                  {isSubmitting ? "Starting..." : "Start Thread"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </AnimatedPage>
  );
}
