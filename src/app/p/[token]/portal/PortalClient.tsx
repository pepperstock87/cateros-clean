"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Users,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  Circle,
  FileText,
  MessageSquare,
  Send,
  CreditCard,
  Shield,
  Loader2,
  ExternalLink,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

// ─── Types ───
type ClientMessageType = {
  id: string;
  from: "client" | "caterer";
  message: string;
  action?: string;
  created_at: string;
};

type MenuItemType = {
  id: string;
  name: string;
  costPerPerson: number;
  quantity: number;
  category?: string;
};

type StaffingLineType = {
  id: string;
  role: string;
  hourlyRate: number;
  hours: number;
  headcount: number;
};

type BarPackageType = {
  type: string;
  costPerPerson: number;
  label: string;
};

type PricingDataType = {
  guestCount: number;
  menuItems: MenuItemType[];
  staffing: StaffingLineType[];
  rentals: { id: string; item: string; unitCost: number; quantity: number }[];
  barPackage: BarPackageType | null;
  adminPercent: number;
  taxPercent: number;
  foodCostTotal: number;
  staffingTotal: number;
  rentalsTotal: number;
  barTotal: number;
  subtotal: number;
  adminFee: number;
  taxAmount: number;
  totalCost: number;
  suggestedPrice: number;
  projectedMargin: number;
  targetMarginPercent: number;
};

type PaymentScheduleItemType = {
  id: string;
  installment_name: string;
  amount: number;
  percentage: number | null;
  due_date: string | null;
  status: string;
  sort_order: number;
};

type PaymentType = {
  id: string;
  amount: number;
  currency: string;
  payment_method_type: string | null;
  status: string;
  paid_at: string | null;
};

type ContractAcceptanceType = {
  accepted_by_name: string;
  accepted_by_email: string | null;
  accepted_at: string;
  ip_address: string | null;
};

type EventType = {
  id: string;
  name: string;
  client_name: string;
  client_email: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  guest_count: number;
  venue: string | null;
  status: string;
};

type TabKey = "overview" | "messages" | "payments" | "documents";

type Props = {
  shareToken: string;
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  logoUrl: string | null;
  proposalStatus: string;
  proposalCreatedAt: string;
  proposalViewedAt: string | null;
  proposalContractAcceptedAt: string | null;
  proposalTitle: string;
  proposalTerms: string | null;
  clientMessages: ClientMessageType[];
  event: EventType | null;
  pricing: PricingDataType | null;
  schedules: PaymentScheduleItemType[];
  paidPayments: PaymentType[];
  contractAcceptance: ContractAcceptanceType | null;
  totalDue: number;
  totalPaid: number;
  balanceDue: number;
  hasNewPaymentSystem: boolean;
};

// ─── Helpers ───

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

// ─── Status Tracker ───

const WORKFLOW_STAGES = [
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "approved", label: "Approved" },
  { key: "signed", label: "Signed" },
  { key: "deposit_paid", label: "Deposit Paid" },
  { key: "booked", label: "Booked" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  draft: -1,
  sent: 0,
  viewed: 1,
  approved: 2,
  accepted: 2,
  signed: 3,
  deposit_paid: 4,
  booked: 5,
};

function StatusTracker({
  status,
  createdAt,
  viewedAt,
  contractAcceptedAt,
  firstPaymentAt,
}: {
  status: string;
  createdAt: string;
  viewedAt: string | null;
  contractAcceptedAt: string | null;
  firstPaymentAt: string | null;
}) {
  const currentIndex = STATUS_ORDER[status] ?? 0;

  const dates: Record<string, string | null> = {
    sent: createdAt,
    viewed: viewedAt,
    approved: currentIndex >= 2 ? (viewedAt || createdAt) : null,
    signed: contractAcceptedAt,
    deposit_paid: firstPaymentAt,
    booked: currentIndex >= 5 ? (firstPaymentAt || contractAcceptedAt || createdAt) : null,
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-5">Booking Progress</h3>

      {/* Desktop: horizontal bar */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-stone-200" />
          {/* Filled line */}
          <div
            className="absolute top-3.5 left-0 h-0.5 bg-[#D4A373] transition-all duration-500"
            style={{ width: `${Math.min((currentIndex / (WORKFLOW_STAGES.length - 1)) * 100, 100)}%` }}
          />

          {WORKFLOW_STAGES.map((stage, i) => {
            const stageIndex = STATUS_ORDER[stage.key] ?? i;
            const isComplete = currentIndex > stageIndex;
            const isCurrent = currentIndex === stageIndex;
            const dateStr = dates[stage.key];

            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                    isComplete
                      ? "bg-[#D4A373] border-[#D4A373] text-white"
                      : isCurrent
                      ? "bg-white border-[#D4A373] text-[#D4A373]"
                      : "bg-white border-stone-300 text-stone-300"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Circle className="w-3 h-3" fill={isCurrent ? "#D4A373" : "none"} />
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium mt-2 ${
                    isComplete || isCurrent ? "text-stone-700" : "text-stone-400"
                  }`}
                >
                  {stage.label}
                </span>
                {dateStr && (
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    {format(new Date(dateStr), "MMM d")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical list */}
      <div className="sm:hidden space-y-3">
        {WORKFLOW_STAGES.map((stage, i) => {
          const stageIndex = STATUS_ORDER[stage.key] ?? i;
          const isComplete = currentIndex > stageIndex;
          const isCurrent = currentIndex === stageIndex;
          const dateStr = dates[stage.key];

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                  isComplete
                    ? "bg-[#D4A373] border-[#D4A373] text-white"
                    : isCurrent
                    ? "bg-white border-[#D4A373] text-[#D4A373]"
                    : "bg-white border-stone-300 text-stone-300"
                }`}
              >
                {isComplete ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-2.5 h-2.5" fill={isCurrent ? "#D4A373" : "none"} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isComplete || isCurrent ? "text-stone-700" : "text-stone-400"}`}>
                  {stage.label}
                </span>
              </div>
              {dateStr && (
                <span className="text-xs text-stone-400 flex-shrink-0">
                  {format(new Date(dateStr), "MMM d")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Messaging Thread ───

function MessagingThread({
  messages: initialMessages,
  shareToken,
  proposalStatus,
}: {
  messages: ClientMessageType[];
  shareToken: string;
  proposalStatus: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTerminal = ["expired"].includes(proposalStatus);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = newMessage.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/portal/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_token: shareToken, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const visibleMessages = messages.filter((m) => m.message);

  return (
    <div className="bg-white rounded-xl border border-stone-200 flex flex-col" style={{ minHeight: 320 }}>
      <div className="px-5 py-3 border-b border-stone-100">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#D4A373]" />
          Messages
        </h3>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
        {visibleMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No messages yet. Send a message to your caterer.</p>
          </div>
        ) : (
          visibleMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from === "client" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  m.from === "client"
                    ? "bg-[#D4A373] text-white rounded-br-md"
                    : "bg-stone-100 text-stone-700 rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed">{m.message}</p>
                <div
                  className={`text-[10px] mt-1 ${
                    m.from === "client" ? "text-white/70" : "text-stone-400"
                  }`}
                >
                  {format(new Date(m.created_at), "MMM d, h:mm a")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      {!isTerminal && (
        <div className="px-4 py-3 border-t border-stone-100">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/30 focus:border-[#D4A373]"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D4A373] text-white flex items-center justify-center hover:bg-[#c4935f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Status Section ───

function PaymentStatusSection({
  schedules,
  paidPayments,
  totalDue,
  totalPaid,
  balanceDue,
  hasNewPaymentSystem,
  shareToken,
  proposalStatus,
}: {
  schedules: PaymentScheduleItemType[];
  paidPayments: PaymentType[];
  totalDue: number;
  totalPaid: number;
  balanceDue: number;
  hasNewPaymentSystem: boolean;
  shareToken: string;
  proposalStatus: string;
}) {
  const showPayments = ["accepted", "approved", "signed", "deposit_paid", "booked"].includes(proposalStatus);

  if (!showPayments) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
        <DollarSign className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-sm text-stone-400">Payment details will appear here once the proposal is approved.</p>
      </div>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "paid":
        return { label: "Paid", cls: "bg-green-50 text-green-700 border-green-200" };
      case "due":
        return { label: "Due", cls: "bg-amber-50 text-amber-700 border-amber-200" };
      case "failed":
        return { label: "Failed", cls: "bg-red-50 text-red-700 border-red-200" };
      case "waived":
        return { label: "Waived", cls: "bg-stone-50 text-stone-500 border-stone-200" };
      case "refunded":
        return { label: "Refunded", cls: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: "Pending", cls: "bg-stone-50 text-[#D4A373] border-stone-200" };
    }
  }

  const paymentPercent = totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <div className="text-xs font-medium text-stone-400 mb-1">Total</div>
          <div className="text-lg font-semibold text-stone-700">{formatCurrency(totalDue)}</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <div className="text-xs font-medium text-stone-400 mb-1">Paid</div>
          <div className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <div className="text-xs font-medium text-stone-400 mb-1">Balance</div>
          <div className={`text-lg font-semibold ${balanceDue > 0 ? "text-amber-600" : "text-green-600"}`}>
            {formatCurrency(balanceDue)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalDue > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-500">Payment Progress</span>
            <span className="text-xs font-semibold text-[#D4A373]">{Math.round(paymentPercent)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D4A373] transition-all duration-500"
              style={{ width: `${paymentPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Schedule items */}
      {hasNewPaymentSystem && schedules.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Payment Schedule</h4>
          </div>
          <div className="divide-y divide-stone-100">
            {schedules.map((schedule) => {
              const badge = getStatusBadge(schedule.status);
              const isPayable = schedule.status === "pending" || schedule.status === "due";
              const isOverdue =
                schedule.status !== "paid" &&
                schedule.status !== "waived" &&
                schedule.due_date &&
                new Date(schedule.due_date) < new Date();

              return (
                <div key={schedule.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-stone-700">{schedule.installment_name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${badge.cls}`}>
                        {isOverdue ? "Overdue" : badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="font-medium text-stone-500">{formatCurrency(schedule.amount)}</span>
                      {schedule.due_date && (
                        <>
                          <span>-</span>
                          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                            Due {format(new Date(schedule.due_date), "MMM d, yyyy")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {isPayable && (
                    <ClientPayButtonLight
                      shareToken={shareToken}
                      paymentScheduleId={schedule.id}
                      amount={schedule.amount}
                      installmentName={schedule.installment_name}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      {paidPayments.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Payment History</h4>
          </div>
          <div className="divide-y divide-stone-50">
            {paidPayments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-stone-500">
                  {p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "--"}
                  {p.payment_method_type && <span className="text-stone-400"> - {p.payment_method_type}</span>}
                </span>
                <span className="font-medium text-green-600">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Light-themed pay button ───

function ClientPayButtonLight({
  shareToken,
  paymentScheduleId,
  amount,
  installmentName,
}: {
  shareToken: string;
  paymentScheduleId: string;
  amount: number;
  installmentName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/client-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken, paymentScheduleId, amount, installmentName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex-shrink-0 ml-3">
      <button
        onClick={handlePay}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A373] text-white hover:bg-[#c4935f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
        {loading ? "Loading..." : `Pay ${formatCurrency(amount)}`}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Document Section ───

function DocumentSection({
  shareToken,
  proposalTitle,
  contractAcceptance,
  proposalStatus,
  proposalTerms,
}: {
  shareToken: string;
  proposalTitle: string;
  contractAcceptance: ContractAcceptanceType | null;
  proposalStatus: string;
  proposalTerms: string | null;
}) {
  const isSigned = !!contractAcceptance;

  return (
    <div className="space-y-4">
      {/* Proposal document */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#D4A373]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-700">{proposalTitle}</div>
              <div className="text-xs text-stone-400">Catering Proposal</div>
            </div>
          </div>
          <a
            href={`/p/${shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-[#D4A373] bg-[#D4A373]/10 hover:bg-[#D4A373]/20 border border-[#D4A373]/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Proposal
          </a>
        </div>
      </div>

      {/* Contract status */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#D4A373]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-700">Contract</div>
            <div className="text-xs text-stone-400">
              {isSigned ? "Signed and accepted" : "Pending signature"}
            </div>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                isSigned
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-stone-50 text-stone-500 border border-stone-200"
              }`}
            >
              {isSigned ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Signed
                </>
              ) : (
                "Unsigned"
              )}
            </span>
          </div>
        </div>

        {isSigned && contractAcceptance && (
          <div className="ml-13 mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
            <div className="space-y-1 text-xs text-green-700">
              <div className="flex justify-between">
                <span className="text-green-600">Signed by</span>
                <span className="font-medium">{contractAcceptance.accepted_by_name}</span>
              </div>
              {contractAcceptance.accepted_by_email && (
                <div className="flex justify-between">
                  <span className="text-green-600">Email</span>
                  <span className="font-medium">{contractAcceptance.accepted_by_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-green-600">Date</span>
                <span className="font-medium">
                  {format(new Date(contractAcceptance.accepted_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              {contractAcceptance.ip_address && (
                <div className="flex justify-between">
                  <span className="text-green-600">IP Address</span>
                  <span className="font-medium">{contractAcceptance.ip_address}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Terms */}
      {proposalTerms && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Terms & Conditions</h4>
          <p className="text-sm text-stone-500 leading-relaxed whitespace-pre-wrap">{proposalTerms}</p>
        </div>
      )}
    </div>
  );
}

// ─── Event Details Summary ───

function EventDetailsSummary({
  event,
  pricing,
}: {
  event: EventType;
  pricing: PricingDataType | null;
}) {
  return (
    <div className="space-y-4">
      {/* Key details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Date</span>
          </div>
          <div className="text-sm font-medium text-stone-700">
            {format(new Date(event.event_date), "EEE, MMM d, yyyy")}
          </div>
        </div>

        {(event.start_time || event.end_time) && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4A373]" />
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Time</span>
            </div>
            <div className="text-sm font-medium text-stone-700">
              {event.start_time && formatTime(event.start_time)}
              {event.start_time && event.end_time && " - "}
              {event.end_time && formatTime(event.end_time)}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Guests</span>
          </div>
          <div className="text-sm font-medium text-stone-700">{event.guest_count}</div>
        </div>

        {event.venue && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D4A373]" />
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Venue</span>
            </div>
            <div className="text-sm font-medium text-stone-700 truncate">{event.venue}</div>
          </div>
        )}
      </div>

      {/* Menu summary */}
      {pricing && pricing.menuItems.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-2">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#D4A373]" />
              Menu
            </h4>
          </div>
          <div className="divide-y divide-stone-50">
            {pricing.menuItems.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-stone-700">{item.name}</span>
                {item.category && (
                  <span className="text-[11px] font-medium text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar package */}
      {pricing?.barPackage && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-3">
            <Wine className="w-4 h-4 text-[#D4A373]" />
            <div>
              <div className="text-sm font-medium text-stone-700">{pricing.barPackage.label}</div>
              <div className="text-xs text-stone-400">Bar package for {pricing.guestCount} guests</div>
            </div>
          </div>
        </div>
      )}

      {/* Investment summary */}
      {pricing && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Investment Summary</h4>
          <div className="space-y-2.5">
            {pricing.foodCostTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Food & Menu</span>
                <span className="text-stone-700 font-medium">{formatCurrency(pricing.foodCostTotal)}</span>
              </div>
            )}
            {pricing.staffingTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Staffing</span>
                <span className="text-stone-700 font-medium">{formatCurrency(pricing.staffingTotal)}</span>
              </div>
            )}
            {pricing.rentalsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Rentals</span>
                <span className="text-stone-700 font-medium">{formatCurrency(pricing.rentalsTotal)}</span>
              </div>
            )}
            {pricing.barTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Bar</span>
                <span className="text-stone-700 font-medium">{formatCurrency(pricing.barTotal)}</span>
              </div>
            )}
            <div className="border-t border-stone-100 pt-2.5 flex justify-between text-sm">
              <span className="text-stone-500">Service Fee + Tax</span>
              <span className="text-stone-700 font-medium">{formatCurrency(pricing.adminFee + pricing.taxAmount)}</span>
            </div>
            <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline">
              <span className="font-semibold text-stone-700">Total</span>
              <span className="text-xl font-bold text-[#D4A373]">{formatCurrency(pricing.suggestedPrice)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Navigation ───

function PortalTabNav({
  active,
  onChange,
  messageCount,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  messageCount: number;
}) {
  const tabs: { key: TabKey; label: string; icon: ReactNode; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: <CalendarDays className="w-4 h-4" /> },
    { key: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" />, badge: messageCount },
    { key: "payments", label: "Payments", icon: <DollarSign className="w-4 h-4" /> },
    { key: "documents", label: "Documents", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="border-b border-stone-200 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
      <nav className="flex gap-0 min-w-max" role="tablist">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`
                relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150
                ${isActive ? "text-[#D4A373]" : "text-stone-400 hover:text-stone-600"}
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-[#D4A373] text-white">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A373] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Main Portal Client Component ───

export default function PortalClient(props: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const {
    shareToken,
    companyName,
    companyEmail,
    companyPhone,
    logoUrl,
    proposalStatus,
    proposalCreatedAt,
    proposalViewedAt,
    proposalContractAcceptedAt,
    proposalTitle,
    proposalTerms,
    clientMessages,
    event,
    pricing,
    schedules,
    paidPayments,
    contractAcceptance,
    totalDue,
    totalPaid,
    balanceDue,
    hasNewPaymentSystem,
  } = props;

  const firstPaymentAt = paidPayments.length > 0 ? paidPayments[paidPayments.length - 1]?.paid_at : null;
  const visibleMessageCount = clientMessages.filter((m) => m.message).length;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="" className="h-9 object-contain" />
              )}
              <div>
                <h1 className="text-lg font-bold text-stone-800">{companyName}</h1>
                {(companyPhone || companyEmail) && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {[companyPhone, companyEmail].filter(Boolean).join(" - ")}
                  </p>
                )}
              </div>
            </div>
            <a
              href={`/p/${shareToken}`}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#D4A373] hover:text-[#c4935f] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              View Full Proposal
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome section */}
        {event && (
          <div>
            <h2 className="text-2xl font-bold text-stone-800">{event.name}</h2>
            <p className="text-sm text-stone-500 mt-1">
              Welcome, {event.client_name}
              {(proposalStatus === "accepted" || proposalStatus === "booked") && (
                <span className="text-green-600 font-medium"> -- Your event is confirmed!</span>
              )}
            </p>
          </div>
        )}

        {/* Status confirmed banner */}
        {(proposalStatus === "accepted" || proposalStatus === "booked") && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-green-700">Event Confirmed</span>
          </div>
        )}

        {/* Status Tracker */}
        <StatusTracker
          status={proposalStatus}
          createdAt={proposalCreatedAt}
          viewedAt={proposalViewedAt}
          contractAcceptedAt={proposalContractAcceptedAt}
          firstPaymentAt={firstPaymentAt}
        />

        {/* Tabs */}
        <div>
          <PortalTabNav
            active={activeTab}
            onChange={setActiveTab}
            messageCount={visibleMessageCount}
          />

          <div className="pt-6">
            {/* Overview Tab */}
            {activeTab === "overview" && event && (
              <EventDetailsSummary event={event} pricing={pricing} />
            )}
            {activeTab === "overview" && !event && (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <p className="text-sm text-stone-400">Event details are not available.</p>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === "messages" && (
              <MessagingThread
                messages={clientMessages}
                shareToken={shareToken}
                proposalStatus={proposalStatus}
              />
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <PaymentStatusSection
                schedules={schedules}
                paidPayments={paidPayments}
                totalDue={totalDue}
                totalPaid={totalPaid}
                balanceDue={balanceDue}
                hasNewPaymentSystem={hasNewPaymentSystem}
                shareToken={shareToken}
                proposalStatus={proposalStatus}
              />
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <DocumentSection
                shareToken={shareToken}
                proposalTitle={proposalTitle}
                contractAcceptance={contractAcceptance}
                proposalStatus={proposalStatus}
                proposalTerms={proposalTerms}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-stone-400 pt-4 pb-8">
          Powered by Cateros
        </div>
      </div>
    </div>
  );
}
