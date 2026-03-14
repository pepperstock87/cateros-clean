"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CheckCircle2, ChevronDown, ChevronUp, UserCheck, UserX } from "lucide-react";
import { getPayrollStatus, type PayrollStatusData } from "@/lib/actions/payroll";

export function PayrollSyncCard() {
  const [status, setStatus] = useState<PayrollStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMappings, setShowMappings] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getPayrollStatus();
      setStatus(data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Payroll (Gusto)</h2>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">Loading payroll status...</div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Payroll (Gusto)</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Connect Gusto to export staff hours and track labor costs automatically.
        </p>
        <a
          href="/api/payroll/connect"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Users className="w-4 h-4" />
          Connect Gusto
        </a>
      </div>
    );
  }

  const activeMappings = status.mappings.filter((m) => m.isActive);

  return (
    <div className="card p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Payroll (Gusto)</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 border border-green-800/50 text-green-400">
          Connected
        </span>
      </div>

      {/* Connection info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-xs text-[var(--text-muted)]">Company</div>
          <div className="text-sm font-medium">{status.companyName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Mapped Staff</div>
          <div className="text-sm font-medium">
            {activeMappings.length} member{activeMappings.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Exports</div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {status.pendingExports > 0 && (
              <span className="text-yellow-400">{status.pendingExports} pending</span>
            )}
            {status.processedExports > 0 && (
              <span className="text-green-400">{status.processedExports} processed</span>
            )}
            {status.pendingExports === 0 && status.processedExports === 0 && (
              <span className="text-[var(--text-muted)]">None yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Employee mappings toggle */}
      {status.mappings.length > 0 && (
        <div>
          <button
            onClick={() => setShowMappings(!showMappings)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showMappings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Employee Mappings ({activeMappings.length} active)
          </button>

          {showMappings && (
            <div className="mt-3 space-y-1.5">
              {status.mappings.map((m) => (
                <div
                  key={m.staffMemberId}
                  className="flex items-center justify-between py-1.5 px-3 rounded-md bg-[var(--bg-primary)]/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {m.isActive ? (
                      <UserCheck className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <UserX className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    )}
                    <span className={m.isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"}>
                      {m.employeeName}
                    </span>
                  </div>
                  <span className="text-[var(--text-muted)] capitalize">{m.employeeType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disconnect link */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <form action="/api/payroll/disconnect" method="POST">
          <button
            type="submit"
            className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
          >
            Disconnect Gusto
          </button>
        </form>
      </div>
    </div>
  );
}
