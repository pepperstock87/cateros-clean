"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Search,
  Download,
  ExternalLink,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { PaymentScheduleItem, UserProfile } from "@/types";

type PaymentWithEvent = {
  id: string;
  organization_id: string | null;
  event_id: string;
  amount: number;
  currency: string;
  payment_method_type: string | null;
  status: string;
  paid_at: string | null;
  platform_fee: number | null;
  stripe_transfer_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  events: { id: string; name: string; client_name: string } | null;
};

type Props = {
  profile: Pick<UserProfile, "id" | "email" | "full_name" | "stripe_connect_account_id" | "stripe_connect_onboarded">;
  payments: PaymentWithEvent[];
  allPayments: PaymentWithEvent[];
  paymentSchedules: PaymentScheduleItem[];
};

export function PayoutsClient({ profile, payments, allPayments, paymentSchedules }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "refunded" | "pending">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Summary calculations
  const summary = useMemo(() => {
    const paidPayments = allPayments.filter((p) => p.status === "paid");
    const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const platformFees = paidPayments.reduce((sum, p) => sum + (p.platform_fee ?? 0), 0);
    const netPayouts = totalCollected - platformFees;
    const pendingPayments = allPayments.filter((p) => p.status === "pending" || p.status === "processing");
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    return { totalCollected, platformFees, netPayouts, pendingAmount };
  }, [allPayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let result = statusFilter === "all" ? allPayments : allPayments.filter((p) => p.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.events?.name?.toLowerCase().includes(q) ||
          p.events?.client_name?.toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      result = result.filter((p) => {
        const d = p.paid_at || p.created_at;
        return d >= dateFrom;
      });
    }

    if (dateTo) {
      result = result.filter((p) => {
        const d = p.paid_at || p.created_at;
        return d <= dateTo + "T23:59:59";
      });
    }

    return result;
  }, [allPayments, statusFilter, search, dateFrom, dateTo]);

  function handleReceiptDownload(paymentId: string) {
    try {
      window.open(`/api/stripe/receipt?paymentId=${paymentId}`, "_blank");
    } catch {
      toast.error("Failed to download receipt");
    }
  }

  const isConnected = profile.stripe_connect_account_id && profile.stripe_connect_onboarded;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-[#D4A373]" />
          Payouts
        </h1>
        <p className="text-sm text-[#D4A373] mt-1">Track payments, fees, and payouts</p>
      </div>

      {/* Connect Status Banner */}
      {!isConnected && (
        <div className="bg-[#111827] border border-[#D4A373]/40 rounded-lg p-5 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#D4A373]/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#D4A373]" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">Stripe Connect Not Set Up</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Set up Stripe Connect to receive direct payouts from client payments. Without it, payments are held in your platform account.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-[#D4A373] hover:text-[#e0b68a] transition-colors"
            >
              Set up in Settings <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Collected</span>
          </div>
          <div className="font-display text-xl font-semibold">{formatCurrency(summary.totalCollected)}</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Platform Fees</span>
          </div>
          <div className="font-display text-xl font-semibold">{formatCurrency(summary.platformFees)}</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-[#D4A373]" />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Net Payouts</span>
          </div>
          <div className="font-display text-xl font-semibold text-[#D4A373]">{formatCurrency(summary.netPayouts)}</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Pending</span>
          </div>
          <div className="font-display text-xl font-semibold">{formatCurrency(summary.pendingAmount)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by event name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-muted)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="From"
            />
            <span className="text-[var(--text-muted)] text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Date</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Event</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Method</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Platform Fee</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Transfer ID</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    <Wallet className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>No payments found</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : new Date(payment.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                    </td>
                    <td className="px-4 py-3">
                      {payment.events ? (
                        <Link
                          href={`/events/${payment.event_id}`}
                          className="text-[var(--text-primary)] hover:text-[#D4A373] transition-colors"
                        >
                          {payment.events.name}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-muted)]">Unknown event</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)] capitalize">
                        {payment.payment_method_type?.replace("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      {payment.platform_fee != null ? formatCurrency(payment.platform_fee) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {payment.stripe_transfer_id
                          ? payment.stripe_transfer_id.substring(0, 16) + "..."
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.status === "paid" && (
                        <button
                          onClick={() => handleReceiptDownload(payment.id)}
                          className="text-[var(--text-muted)] hover:text-[#D4A373] transition-colors"
                          title="Download receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
        Amounts shown in cents are converted to dollars. Platform fees are deducted before payout.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-900/40 text-green-400 border-green-800/50",
    refunded: "bg-red-900/40 text-red-400 border-red-800/50",
    partially_refunded: "bg-orange-900/40 text-orange-400 border-orange-800/50",
    pending: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    processing: "bg-blue-900/40 text-blue-400 border-blue-800/50",
    failed: "bg-red-900/40 text-red-400 border-red-800/50",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${
        styles[status] ?? "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)]"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
