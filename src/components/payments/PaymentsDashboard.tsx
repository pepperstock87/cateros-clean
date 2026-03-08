"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

type PaymentRow = {
  id: string;
  event_id: string;
  amount: number;
  status: string;
  payment_method_type: string | null;
  paid_at: string | null;
  created_at: string;
  platform_fee: number | null;
  event?: { name: string; client_name: string } | null;
};

type Summary = {
  totalCollected: number;
  totalPending: number;
  totalPlatformFees: number;
  recentPayments: PaymentRow[];
};

export function PaymentsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

        // Fetch payments with event info
        const { data: payments } = await supabase
          .from("payments")
          .select("id, event_id, amount, status, payment_method_type, paid_at, created_at, platform_fee, event:events(name, client_name)")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!payments) {
          setSummary({
            totalCollected: 0,
            totalPending: 0,
            totalPlatformFees: 0,
            recentPayments: [],
          });
          return;
        }

        const rows = payments as unknown as PaymentRow[];

        const totalCollected = rows
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalPending = rows
          .filter((p) => p.status === "pending" || p.status === "processing")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalPlatformFees = rows
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + (Number(p.platform_fee) || 0), 0);

        setSummary({
          totalCollected,
          totalPending,
          totalPlatformFees,
          recentPayments: rows.slice(0, 20),
        });
      } catch (err) {
        console.error("Failed to load payments dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-sm text-[#7A8BA8]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading payments...
      </div>
    );
  }

  if (!summary) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Collected"
          value={fmt(summary.totalCollected)}
          color="green"
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending"
          value={fmt(summary.totalPending)}
          color="yellow"
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Platform Fees"
          value={fmt(summary.totalPlatformFees)}
          color="brand"
        />
      </div>

      {/* Recent Payments Table */}
      <div className="card p-4 md:p-6">
        <h3 className="font-semibold text-sm mb-4">Recent Payments</h3>

        {summary.recentPayments.length === 0 ? (
          <p className="text-xs text-[#7A8BA8] py-4 text-center">
            No payments recorded yet. Payments will appear here once clients
            start paying through your proposals.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#344570] text-[#D4A373]">
                  <th className="text-left py-2 pr-4 font-medium">Client</th>
                  <th className="text-left py-2 pr-4 font-medium">Event</th>
                  <th className="text-right py-2 pr-4 font-medium">Amount</th>
                  <th className="text-left py-2 pr-4 font-medium">Method</th>
                  <th className="text-left py-2 pr-4 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentPayments.map((payment) => {
                  const eventData = payment.event as unknown;
                  const event = (
                    Array.isArray(eventData) ? eventData[0] : eventData
                  ) as { name: string; client_name: string } | null;

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-[#344570]/50 hover:bg-[#1a1510]/40"
                    >
                      <td className="py-2.5 pr-4">
                        {event?.client_name || "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <a
                          href={`/events/${payment.event_id}`}
                          className="text-brand-400 hover:underline inline-flex items-center gap-1"
                        >
                          {event?.name || "—"}
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium">
                        {fmt(payment.amount)}
                      </td>
                      <td className="py-2.5 pr-4 capitalize">
                        {payment.payment_method_type || "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="py-2.5 text-[#7A8BA8]">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString()
                          : new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "green" | "yellow" | "brand";
}) {
  const colorClasses = {
    green: "text-green-400 bg-green-900/20 border-green-800/40",
    yellow: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
    brand: "text-brand-400 bg-brand-900/20 border-brand-800/40",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">{icon}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70 mt-1">
        {label}
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-900/40 border-green-800/50 text-green-400",
    pending: "bg-yellow-900/40 border-yellow-800/50 text-yellow-400",
    processing: "bg-blue-900/40 border-blue-800/50 text-blue-400",
    failed: "bg-red-900/40 border-red-800/50 text-red-400",
    refunded: "bg-gray-900/40 border-gray-700/50 text-gray-400",
    partially_refunded: "bg-orange-900/40 border-orange-800/50 text-orange-400",
  };

  return (
    <span
      className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${
        styles[status] || styles.pending
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default PaymentsDashboard;
