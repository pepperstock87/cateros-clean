"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function ClientResponse({ shareToken, currentStatus }: { shareToken: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleResponse(action: "accepted" | "declined") {
    if (!confirm(action === "accepted"
      ? "Accept this proposal and confirm the event?"
      : "Decline this proposal?"
    )) return;

    setLoading(true);
    try {
      const res = await fetch("/api/proposals/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_token: shareToken, action }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(action);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (status === "accepted") {
    return (
      <div className="card p-8 text-center border-green-900/50">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h3 className="font-display text-xl font-semibold mb-1">Proposal Accepted</h3>
        <p className="text-sm text-[#9c8876]">Thank you! Your caterer has been notified and will be in touch to finalize the details.</p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="card p-8 text-center">
        <XCircle className="w-12 h-12 text-[#9c8876] mx-auto mb-3" />
        <h3 className="font-display text-xl font-semibold mb-1">Proposal Declined</h3>
        <p className="text-sm text-[#9c8876]">Your caterer has been notified. Feel free to reach out if you change your mind.</p>
      </div>
    );
  }

  // Draft or sent — show action buttons
  return (
    <div className="card p-6">
      <h3 className="font-medium text-sm mb-4 text-center">Ready to proceed?</h3>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => handleResponse("accepted")}
          disabled={loading}
          className="btn-primary flex items-center gap-2 px-6 py-3 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Accept Proposal
        </button>
        <button
          onClick={() => handleResponse("declined")}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm"
        >
          <XCircle className="w-4 h-4" />
          Decline
        </button>
      </div>
    </div>
  );
}
