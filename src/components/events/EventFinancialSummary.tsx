"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PaymentScheduleItem, Payment, PricingData } from "@/types";

type Props = {
  eventId: string;
  proposalTotal: number | null;
  pricingData: PricingData | null;
};

export function EventFinancialSummary({ eventId, proposalTotal, pricingData }: Props) {
  const [scheduleItems, setScheduleItems] = useState<PaymentScheduleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [scheduleRes, paymentsRes] = await Promise.all([
        supabase
          .from("payment_schedules")
          .select("*")
          .eq("event_id", eventId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("payments")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true }),
      ]);
      setScheduleItems(scheduleRes.data ?? []);
      setPayments(paymentsRes.data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="card p-4 mb-6 animate-pulse">
        <div className="h-4 bg-[#2e271f] rounded w-1/3 mb-3" />
        <div className="h-3 bg-[#2e271f] rounded w-1/2 mb-2" />
        <div className="h-3 bg-[#2e271f] rounded w-2/5" />
      </div>
    );
  }

  const total = proposalTotal ?? 0;
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const progressPercent = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 0;

  const now = new Date();
  const nextDue = scheduleItems.find((item) => {
    if (item.status === "paid" || item.status === "waived") return false;
    return true;
  });

  const isOverdue = nextDue?.due_date ? new Date(nextDue.due_date) < now && nextDue.status !== "paid" : false;

  if (!pricingData && scheduleItems.length === 0 && payments.length === 0) {
    return null;
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-1.5 mb-3">
        <DollarSign className="w-3.5 h-3.5 text-[#9c8876]" />
        <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">Financial Summary</span>
      </div>

      {/* Totals Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-0.5">Proposal Total</div>
          <div className="text-sm font-medium text-[#f5ede0]">
            {total > 0 ? formatCurrency(total) : "--"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-0.5">Total Paid</div>
          <div className="text-sm font-medium text-green-400">
            {totalPaid > 0 ? formatCurrency(totalPaid) : "$0.00"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-0.5">Remaining</div>
          <div className={`text-sm font-medium ${remaining > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {formatCurrency(remaining)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] text-[#6b5a4a] mb-1">
            <span>Payment Progress</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#2e271f] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100
                  ? "bg-green-500"
                  : progressPercent > 0
                  ? "bg-brand-500"
                  : "bg-[#2e271f]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Payment Schedule */}
      {scheduleItems.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-2">Payment Schedule</div>
          <div className="space-y-1.5">
            {scheduleItems.map((item) => {
              const itemOverdue = item.due_date && new Date(item.due_date) < now && item.status !== "paid" && item.status !== "waived";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#1a1714]"
                >
                  <div className="flex items-center gap-2">
                    {item.status === "paid" ? (
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                    ) : itemOverdue ? (
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    ) : (
                      <Clock className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    )}
                    <span className={item.status === "paid" ? "text-[#6b5a4a] line-through" : "text-[#f5ede0]"}>
                      {item.installment_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.due_date && (
                      <span className={`flex items-center gap-1 ${itemOverdue ? "text-red-400" : "text-[#6b5a4a]"}`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <span className={`font-medium ${item.status === "paid" ? "text-green-400" : itemOverdue ? "text-red-400" : "text-[#f5ede0]"}`}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Payment Due */}
      {nextDue && total > 0 && (
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${isOverdue ? "bg-red-950/30 border border-red-900/40" : "bg-[#1a1714] border border-[#2e271f]"}`}>
          {isOverdue ? (
            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          ) : (
            <Calendar className="w-3 h-3 text-yellow-400 flex-shrink-0" />
          )}
          <span className={isOverdue ? "text-red-400" : "text-[#9c8876]"}>
            {isOverdue ? "Overdue" : "Next due"}:{" "}
            <span className="font-medium text-[#f5ede0]">{nextDue.installment_name}</span>
            {" -- "}
            {formatCurrency(nextDue.amount)}
            {nextDue.due_date && (
              <> by {new Date(nextDue.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
