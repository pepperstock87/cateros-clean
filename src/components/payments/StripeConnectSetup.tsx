"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";

type ConnectStatus = {
  onboarded: boolean;
  accountId: string | null;
  status: "not_started" | "pending" | "active";
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export function StripeConnectSetup() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/connect/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch {
      setError("Could not load Connect status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // If user returned from onboarding, re-check status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "complete" || params.get("connect") === "refresh") {
      fetchStatus();
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start onboarding");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setConnecting(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!status?.accountId) return;
    try {
      // Stripe Express dashboard login link
      const res = await fetch("/api/stripe/connect/status");
      const data = await res.json();
      if (data.accountId) {
        // Open the Stripe Express Dashboard via login link
        window.open(
          `https://connect.stripe.com/express/${data.accountId}`,
          "_blank"
        );
      }
    } catch {
      // Fallback: open Stripe directly
      window.open("https://dashboard.stripe.com", "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[#7A8BA8]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading payment processing status...
      </div>
    );
  }

  // Not started — show CTA
  if (!status || status.status === "not_started") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-[#1a1510]/60 border border-[#344570]">
          <Zap className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium mb-1">
              Collect payments from your clients
            </p>
            <p className="text-xs text-[#D4A373]">
              Connect your Stripe account to accept credit card payments directly
              through client proposals and invoices. Funds are deposited straight
              to your bank account.
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn-primary inline-flex items-center gap-2"
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          {connecting ? "Redirecting to Stripe..." : "Connect with Stripe"}
        </button>

        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }

  // Pending — onboarding started but not complete
  if (status.status === "pending") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-900/20 border border-yellow-800/40">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-200 mb-1">
              Onboarding in progress
            </p>
            <p className="text-xs text-yellow-300/70">
              Your Stripe Connect account has been created but onboarding is not
              yet complete. Please finish setting up your account to start
              accepting payments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="btn-primary inline-flex items-center gap-2"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {connecting ? "Redirecting..." : "Continue Setup"}
          </button>
          <button
            onClick={fetchStatus}
            className="btn-secondary inline-flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Status
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }

  // Active — fully onboarded
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-green-900/20 border border-green-800/40">
        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-200 mb-1">
            Stripe Connect Active
          </p>
          <p className="text-xs text-green-300/70">
            Your account is connected and ready to receive payments from clients.
            Funds from client payments will be deposited directly to your linked
            bank account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusBadge
          label="Charges"
          enabled={status.chargesEnabled ?? false}
        />
        <StatusBadge
          label="Payouts"
          enabled={status.payoutsEnabled ?? false}
        />
        <StatusBadge
          label="Details Submitted"
          enabled={status.detailsSubmitted ?? false}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleOpenDashboard}
          className="btn-secondary inline-flex items-center gap-2 text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Stripe Dashboard
        </button>
        <button
          onClick={fetchStatus}
          className="btn-secondary inline-flex items-center gap-2 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <p className="text-[10px] text-[#7A8BA8]">
        Account ID: {status.accountId}
      </p>
    </div>
  );
}

function StatusBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
        enabled
          ? "bg-green-900/30 border border-green-800/40 text-green-300"
          : "bg-[#1a1510]/60 border border-[#344570] text-[#7A8BA8]"
      }`}
    >
      {enabled ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      {label}
    </div>
  );
}

export default StripeConnectSetup;
