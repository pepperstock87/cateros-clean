"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, generateId } from "@/lib/utils";
import type { PaymentScheduleItem, Payment, PaymentScheduleStatus } from "@/types";
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Copy,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  eventId: string;
  proposalId?: string;
  totalPrice: number;
  organizationId: string | null;
};

type PaymentMethod = "card" | "cash" | "check" | "bank_transfer" | "venmo" | "zelle" | "other";

type LocalInstallment = {
  localId: string;
  installment_name: string;
  amount: number;
  percentage: number | null;
  due_date: string;
  status: PaymentScheduleStatus;
  sort_order: number;
  /** If persisted, holds the DB id */
  dbId?: string;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<PaymentScheduleStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  due: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  waived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPreset(
  preset: "50_50" | "deposit_balance" | "3_installments",
  total: number,
  eventDate?: string
): LocalInstallment[] {
  const today = new Date().toISOString().split("T")[0];
  const midDate = eventDate
    ? new Date(
        new Date().getTime() +
          (new Date(eventDate).getTime() - new Date().getTime()) / 2
      )
        .toISOString()
        .split("T")[0]
    : today;
  const finalDate = eventDate || today;

  switch (preset) {
    case "50_50":
      return [
        {
          localId: generateId(),
          installment_name: "First Payment",
          amount: Math.round(total * 50) / 100,
          percentage: 50,
          due_date: today,
          status: "pending",
          sort_order: 0,
        },
        {
          localId: generateId(),
          installment_name: "Final Payment",
          amount: total - Math.round(total * 50) / 100,
          percentage: 50,
          due_date: finalDate,
          status: "pending",
          sort_order: 1,
        },
      ];
    case "deposit_balance":
      return [
        {
          localId: generateId(),
          installment_name: "Deposit",
          amount: Math.round(total * 30) / 100,
          percentage: 30,
          due_date: today,
          status: "pending",
          sort_order: 0,
        },
        {
          localId: generateId(),
          installment_name: "Balance Due",
          amount: total - Math.round(total * 30) / 100,
          percentage: 70,
          due_date: finalDate,
          status: "pending",
          sort_order: 1,
        },
      ];
    case "3_installments": {
      const third = Math.round((total / 3) * 100) / 100;
      const remainder = Math.round((total - third * 2) * 100) / 100;
      return [
        {
          localId: generateId(),
          installment_name: "Deposit",
          amount: third,
          percentage: 33.33,
          due_date: today,
          status: "pending",
          sort_order: 0,
        },
        {
          localId: generateId(),
          installment_name: "Midpoint Payment",
          amount: third,
          percentage: 33.33,
          due_date: midDate,
          status: "pending",
          sort_order: 1,
        },
        {
          localId: generateId(),
          installment_name: "Final Payment",
          amount: remainder,
          percentage: 33.34,
          due_date: finalDate,
          status: "pending",
          sort_order: 2,
        },
      ];
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentScheduleManager({
  eventId,
  proposalId,
  totalPrice,
  organizationId,
}: Props) {
  // Data state
  const [installments, setInstallments] = useState<LocalInstallment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordingForId, setRecordingForId] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch schedule items
      let scheduleQuery = supabase
        .from("payment_schedule_items")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true });
      if (organizationId) {
        scheduleQuery = scheduleQuery.eq("organization_id", organizationId);
      }
      const { data: scheduleData, error: scheduleError } = await scheduleQuery;

      if (scheduleError) {
        console.error("Error fetching schedule:", scheduleError);
      } else if (scheduleData && scheduleData.length > 0) {
        setInstallments(
          (scheduleData as PaymentScheduleItem[]).map((item) => ({
            localId: item.id,
            dbId: item.id,
            installment_name: item.installment_name,
            amount: item.amount,
            percentage: item.percentage,
            due_date: item.due_date || "",
            status: item.status,
            sort_order: item.sort_order,
          }))
        );
      }

      // Fetch payments
      let paymentsQuery = supabase
        .from("payments")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (organizationId) {
        paymentsQuery = paymentsQuery.eq("organization_id", organizationId);
      }
      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      } else if (paymentsData) {
        setPayments(paymentsData as Payment[]);
      }
    } catch (err) {
      console.error("Failed to fetch payment data:", err);
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  }, [eventId, organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const totalScheduled = installments.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const balanceRemaining = totalPrice - totalPaid;
  const progressPercent =
    totalPrice > 0 ? Math.min((totalPaid / totalPrice) * 100, 100) : 0;

  const nextDue = installments.find(
    (i) => i.status === "pending" || i.status === "due"
  );

  // ---------------------------------------------------------------------------
  // Schedule management
  // ---------------------------------------------------------------------------

  function applyPreset(preset: "50_50" | "deposit_balance" | "3_installments") {
    const items = buildPreset(preset, totalPrice);
    setInstallments(items);
    setDirty(true);
  }

  function addCustomInstallment() {
    const remaining = totalPrice - totalScheduled;
    setInstallments((prev) => [
      ...prev,
      {
        localId: generateId(),
        installment_name: `Payment ${prev.length + 1}`,
        amount: Math.max(remaining, 0),
        percentage: null,
        due_date: new Date().toISOString().split("T")[0],
        status: "pending",
        sort_order: prev.length,
      },
    ]);
    setDirty(true);
  }

  function updateInstallment(
    localId: string,
    field: keyof LocalInstallment,
    value: string | number
  ) {
    setInstallments((prev) =>
      prev.map((i) =>
        i.localId === localId
          ? { ...i, [field]: field === "amount" ? Number(value) : value }
          : i
      )
    );
    setDirty(true);
  }

  function removeInstallment(localId: string) {
    setInstallments((prev) => prev.filter((i) => i.localId !== localId));
    setDirty(true);
  }

  async function saveSchedule() {
    setSaving(true);
    try {
      const supabase = createClient();

      // Delete existing schedule items for this event
      let deleteQuery = supabase
        .from("payment_schedule_items")
        .delete()
        .eq("event_id", eventId);
      if (organizationId) {
        deleteQuery = deleteQuery.eq("organization_id", organizationId);
      }
      await deleteQuery;

      // Insert new schedule items
      if (installments.length > 0) {
        const rows = installments.map((item, idx) => ({
          organization_id: organizationId,
          event_id: eventId,
          proposal_id: proposalId || null,
          installment_name: item.installment_name,
          amount: item.amount,
          percentage: item.percentage,
          due_date: item.due_date || null,
          status: item.status,
          sort_order: idx,
        }));

        const { data: inserted, error } = await supabase
          .from("payment_schedule_items")
          .insert(rows)
          .select();

        if (error) {
          toast.error("Failed to save schedule: " + error.message);
          return;
        }

        // Update local state with DB ids
        if (inserted) {
          setInstallments(
            (inserted as PaymentScheduleItem[]).map((item) => ({
              localId: item.id,
              dbId: item.id,
              installment_name: item.installment_name,
              amount: item.amount,
              percentage: item.percentage,
              due_date: item.due_date || "",
              status: item.status,
              sort_order: item.sort_order,
            }))
          );
        }
      }

      setDirty(false);
      toast.success("Payment schedule saved");
    } catch (err) {
      console.error("Save schedule error:", err);
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Record manual payment
  // ---------------------------------------------------------------------------

  async function handleRecordPayment(formData: FormData) {
    setRecordingPayment(true);
    try {
      const amount = parseFloat(formData.get("amount") as string);
      if (!amount || amount <= 0) {
        toast.error("Enter a valid amount");
        return;
      }

      const method = formData.get("method") as string;
      const note = formData.get("note") as string;
      const scheduleItemId = recordingForId || null;

      const supabase = createClient();

      const { data: inserted, error } = await supabase
        .from("payments")
        .insert({
          organization_id: organizationId,
          event_id: eventId,
          proposal_id: proposalId || null,
          payment_schedule_id: scheduleItemId,
          amount,
          currency: "usd",
          payment_method_type: method,
          status: "paid" as const,
          paid_at: new Date().toISOString(),
          metadata: note ? { note } : {},
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to record payment: " + error.message);
        return;
      }

      // Add to local payments list
      if (inserted) {
        setPayments((prev) => [...prev, inserted as Payment]);
      }

      // Mark corresponding schedule item as paid
      if (scheduleItemId) {
        const matchingItem = installments.find(
          (i) => i.dbId === scheduleItemId
        );
        if (matchingItem) {
          await supabase
            .from("payment_schedule_items")
            .update({ status: "paid" })
            .eq("id", scheduleItemId);

          setInstallments((prev) =>
            prev.map((i) =>
              i.dbId === scheduleItemId ? { ...i, status: "paid" } : i
            )
          );
        }
      }

      setShowRecordForm(false);
      setRecordingForId(null);
      toast.success("Payment recorded");
    } catch (err) {
      console.error("Record payment error:", err);
      toast.error("Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Stripe payment link
  // ---------------------------------------------------------------------------

  async function generateStripeLink(installment: LocalInstallment) {
    if (!installment.dbId) {
      toast.error("Save the schedule first before generating a payment link");
      return;
    }

    setGeneratingLink(installment.localId);
    try {
      const res = await fetch("/api/stripe/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          scheduleItemId: installment.dbId,
          amount: installment.amount,
          installmentName: installment.installment_name,
          organizationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to generate payment link");
        return;
      }

      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      toast.success("Payment link copied to clipboard");
    } catch (err) {
      console.error("Generate link error:", err);
      toast.error("Failed to generate payment link");
    } finally {
      setGeneratingLink(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Record form helpers
  // ---------------------------------------------------------------------------

  function openRecordForm(scheduleItemId?: string) {
    setRecordingForId(scheduleItemId || null);
    setShowRecordForm(true);
  }

  function getDefaultAmount(): number {
    if (recordingForId) {
      const item = installments.find((i) => i.dbId === recordingForId);
      return item?.amount || 0;
    }
    return balanceRemaining > 0 ? balanceRemaining : 0;
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-center gap-2 py-8 text-[#9c8876]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading payment schedule...</span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="card p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-sm flex items-center gap-2 text-[#f5ede0]">
          <CreditCard className="w-4 h-4 text-[#9c8876]" />
          Payment Schedule
        </h2>
        {dirty && (
          <button
            onClick={saveSchedule}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Payment Progress Section                                            */}
      {/* ------------------------------------------------------------------ */}

      <div>
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-[#9c8876] mb-1.5">
            <span>Payment Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2 bg-[#1a1714] rounded-full overflow-hidden border border-[#2e271f]">
            <div
              className="h-full rounded-full transition-all duration-500 bg-green-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1714] rounded-lg p-3 text-center border border-[#2e271f]">
            <div className="text-xs text-[#9c8876] mb-1">Total Due</div>
            <div className="text-sm font-semibold text-[#f5ede0]">
              {formatCurrency(totalPrice)}
            </div>
          </div>
          <div className="bg-[#1a1714] rounded-lg p-3 text-center border border-[#2e271f]">
            <div className="text-xs text-[#9c8876] mb-1">Total Paid</div>
            <div className="text-sm font-semibold text-green-400">
              {formatCurrency(totalPaid)}
            </div>
          </div>
          <div className="bg-[#1a1714] rounded-lg p-3 text-center border border-[#2e271f]">
            <div className="text-xs text-[#9c8876] mb-1">Balance</div>
            <div
              className={`text-sm font-semibold ${
                balanceRemaining > 0 ? "text-yellow-400" : "text-green-400"
              }`}
            >
              {formatCurrency(balanceRemaining)}
            </div>
          </div>
        </div>

        {/* Next payment callout */}
        {nextDue && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-orange-400 font-medium">
                Next Payment Due
              </div>
              <div className="text-sm text-[#f5ede0] truncate">
                {nextDue.installment_name} &mdash;{" "}
                {formatCurrency(nextDue.amount)}
                {nextDue.due_date && (
                  <span className="text-[#9c8876]">
                    {" "}
                    &middot; {nextDue.due_date}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Schedule Builder Section                                            */}
      {/* ------------------------------------------------------------------ */}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">
            Installments
          </div>
          {totalScheduled !== totalPrice && installments.length > 0 && (
            <span className="text-[10px] text-yellow-400">
              Scheduled: {formatCurrency(totalScheduled)} / Total:{" "}
              {formatCurrency(totalPrice)}
            </span>
          )}
        </div>

        {/* Empty state with quick setup */}
        {installments.length === 0 && (
          <div className="p-6 rounded-lg border border-dashed border-[#2e271f] text-center">
            <DollarSign className="w-8 h-8 text-[#6b5a4a] mx-auto mb-2" />
            <div className="text-sm text-[#9c8876] mb-4">
              No payment schedule set up yet
            </div>
            <div className="text-xs text-[#6b5a4a] mb-3">Quick Setup</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => applyPreset("50_50")}
                className="text-xs px-3 py-1.5 rounded-md bg-[#1a1714] border border-[#2e271f] text-[#f5ede0] hover:border-brand-600 transition-colors"
              >
                50/50 Split
              </button>
              <button
                onClick={() => applyPreset("deposit_balance")}
                className="text-xs px-3 py-1.5 rounded-md bg-[#1a1714] border border-[#2e271f] text-[#f5ede0] hover:border-brand-600 transition-colors"
              >
                Deposit + Balance
              </button>
              <button
                onClick={() => applyPreset("3_installments")}
                className="text-xs px-3 py-1.5 rounded-md bg-[#1a1714] border border-[#2e271f] text-[#f5ede0] hover:border-brand-600 transition-colors"
              >
                3 Installments
              </button>
            </div>
          </div>
        )}

        {/* Installment rows */}
        {installments.length > 0 && (
          <div className="space-y-2">
            {/* Quick setup row (when schedule exists) */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] text-[#6b5a4a] uppercase tracking-wider">
                Quick Setup:
              </span>
              <button
                onClick={() => applyPreset("50_50")}
                className="text-[10px] px-2 py-1 rounded bg-[#1c1814] border border-[#2e271f] text-[#9c8876] hover:text-[#f5ede0] transition-colors"
              >
                50/50
              </button>
              <button
                onClick={() => applyPreset("deposit_balance")}
                className="text-[10px] px-2 py-1 rounded bg-[#1c1814] border border-[#2e271f] text-[#9c8876] hover:text-[#f5ede0] transition-colors"
              >
                Deposit + Balance
              </button>
              <button
                onClick={() => applyPreset("3_installments")}
                className="text-[10px] px-2 py-1 rounded bg-[#1c1814] border border-[#2e271f] text-[#9c8876] hover:text-[#f5ede0] transition-colors"
              >
                3 Installments
              </button>
            </div>

            {installments.map((item) => (
              <div
                key={item.localId}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1714] border border-[#2e271f] group"
              >
                {/* Status badge */}
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${
                    STATUS_COLORS[item.status]
                  }`}
                >
                  {item.status}
                </span>

                {/* Editable fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                  <input
                    type="text"
                    className="input text-sm"
                    value={item.installment_name}
                    onChange={(e) =>
                      updateInstallment(
                        item.localId,
                        "installment_name",
                        e.target.value
                      )
                    }
                    placeholder="Installment name"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      className="input text-sm pl-6"
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateInstallment(
                          item.localId,
                          "amount",
                          e.target.value
                        )
                      }
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] w-3.5 h-3.5 pointer-events-none" />
                    <input
                      type="date"
                      className="input text-sm pl-8"
                      value={item.due_date}
                      onChange={(e) =>
                        updateInstallment(
                          item.localId,
                          "due_date",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status !== "paid" && item.dbId && (
                    <>
                      <button
                        onClick={() => openRecordForm(item.dbId)}
                        className="p-1.5 rounded text-[#6b5a4a] hover:text-green-400 hover:bg-green-500/10 transition-colors"
                        title="Record payment"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => generateStripeLink(item)}
                        disabled={generatingLink === item.localId}
                        className="p-1.5 rounded text-[#6b5a4a] hover:text-brand-400 hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                        title="Send payment link"
                      >
                        {generatingLink === item.localId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  )}
                  {item.status === "paid" && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <button
                    onClick={() => removeInstallment(item.localId)}
                    className="p-1.5 rounded text-[#6b5a4a] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove installment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add custom installment */}
            <button
              onClick={addCustomInstallment}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add installment
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Payment Recording Section                                           */}
      {/* ------------------------------------------------------------------ */}

      {showRecordForm ? (
        <div className="rounded-lg border border-[#2e271f] bg-[#1c1814] p-4">
          <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3">
            Record Payment
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleRecordPayment(formData);
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">
                    $
                  </span>
                  <input
                    name="amount"
                    type="number"
                    className="input pl-6 text-sm"
                    placeholder="0.00"
                    defaultValue={getDefaultAmount() || ""}
                    min={0}
                    step={0.01}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="label">Method</label>
                <select
                  name="method"
                  className="input text-sm"
                  defaultValue="card"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Note</label>
              <input
                name="note"
                className="input text-sm"
                placeholder="Payment note (optional)"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={recordingPayment}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm py-1.5 px-3 rounded-md transition-colors disabled:opacity-50"
              >
                {recordingPayment ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
                {recordingPayment ? "Recording..." : "Record Payment"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRecordForm(false);
                  setRecordingForId(null);
                }}
                className="text-sm py-1.5 px-3 rounded-md border border-[#2e271f] text-[#9c8876] hover:text-[#f5ede0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => openRecordForm()}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Record payment
        </button>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Payment History                                                      */}
      {/* ------------------------------------------------------------------ */}

      {payments.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">
            Payment History
          </div>
          <div className="space-y-2">
            {payments.map((p) => {
              const matchedInstallment = p.payment_schedule_id
                ? installments.find((i) => i.dbId === p.payment_schedule_id)
                : null;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1714] border border-[#2e271f]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DollarSign className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#f5ede0]">
                        {formatCurrency(p.amount)}
                      </div>
                      <div className="text-[10px] text-[#6b5a4a] truncate">
                        {p.payment_method_type || "unknown"}
                        {p.paid_at &&
                          ` \u00b7 ${new Date(p.paid_at).toLocaleDateString()}`}
                        {matchedInstallment &&
                          ` \u00b7 ${matchedInstallment.installment_name}`}
                        {(() => {
                          const meta = p.metadata as Record<string, unknown> | null;
                          return meta && meta.note ? ` \u00b7 ${String(meta.note)}` : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${
                      p.status === "paid"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : p.status === "failed"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : p.status === "refunded" ||
                          p.status === "partially_refunded"
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
