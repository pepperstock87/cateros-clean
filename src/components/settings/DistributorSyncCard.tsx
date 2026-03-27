"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Package, AlertTriangle } from "lucide-react";
import { getDistributorSyncStatus } from "@/lib/actions/distributors";

interface DistributorSyncData {
  distributorCount: number;
  totalProducts: number;
  recentJobs: Array<{
    id: string;
    distributorName: string;
    jobType: string;
    status: string;
    createdAt: string;
    error: string | null;
  }>;
  pendingOrders: number;
  unreconciledInvoices: number;
}

export function DistributorSyncCard() {
  const [status, setStatus] = useState<DistributorSyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showJobs, setShowJobs] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getDistributorSyncStatus();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load distributor status:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Safety timeout — if fetch hangs for 10s, stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Distributors</h2>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">Loading distributor status...</div>
      </div>
    );
  }

  if (error || (!status && !loading)) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Distributors</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Add distributors to manage catalogs, purchase orders, and invoices.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Go to the Distributors page to add your first distributor.
        </p>
      </div>
    );
  }

  if (!status || status.distributorCount === 0) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Distributors</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Add distributors to manage catalogs, purchase orders, and invoices.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Go to the Distributors page to add your first distributor.
        </p>
      </div>
    );
  }

  const failedJobs = status.recentJobs.filter((j) => j.status === "failed");
  const completedJobs = status.recentJobs.filter((j) => j.status === "completed");

  return (
    <div className="card p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Distributors</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-800/50 text-blue-400">
          {status.distributorCount} connected
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <div className="text-xs text-[var(--text-muted)]">Products</div>
          <div className="text-sm font-medium">{status.totalProducts.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Pending Orders</div>
          <div className="text-sm font-medium">
            {status.pendingOrders > 0 ? (
              <span className="text-yellow-400">{status.pendingOrders}</span>
            ) : (
              <span className="text-green-400">0</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Unreconciled</div>
          <div className="text-sm font-medium">
            {status.unreconciledInvoices > 0 ? (
              <span className="text-yellow-400">{status.unreconciledInvoices} invoice{status.unreconciledInvoices !== 1 ? "s" : ""}</span>
            ) : (
              <span className="text-green-400">All clear</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Recent Syncs</div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {failedJobs.length > 0 && (
              <span className="text-red-400">{failedJobs.length} failed</span>
            )}
            {completedJobs.length > 0 && failedJobs.length === 0 && (
              <span className="text-green-400">{completedJobs.length} ok</span>
            )}
            {status.recentJobs.length === 0 && (
              <span className="text-[var(--text-muted)]">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Recent sync jobs */}
      {status.recentJobs.length > 0 && (
        <div>
          <button
            onClick={() => setShowJobs(!showJobs)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showJobs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Recent Sync Jobs ({status.recentJobs.length})
          </button>

          {showJobs && (
            <div className="mt-3 space-y-1.5">
              {status.recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-md bg-[var(--bg-primary)]/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <JobStatusIcon status={job.status} />
                    <span className="text-[var(--text-primary)]">{job.distributorName}</span>
                    <span className="text-[var(--text-muted)]">{formatJobType(job.jobType)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.error && (
                      <span className="text-red-400 truncate max-w-[150px]" title={job.error}>
                        {job.error}
                      </span>
                    )}
                    <span className="text-[var(--text-muted)] tabular-nums">
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case "processing":
      return <Clock className="w-3.5 h-3.5 text-blue-400" />;
    default:
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
  }
}

function formatJobType(type: string): string {
  switch (type) {
    case "catalog_import": return "Catalog Import";
    case "invoice_import": return "Invoice Import";
    case "order_export": return "Order Export";
    case "price_update": return "Price Update";
    default: return type.replace(/_/g, " ");
  }
}
