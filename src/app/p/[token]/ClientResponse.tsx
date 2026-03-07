"use client";

import { useState } from "react";
import { CheckCircle, XCircle, MessageSquare, RotateCcw, Loader2 } from "lucide-react";

type Props = {
  shareToken: string;
  currentStatus: string;
  clientMessages?: Array<{ from: string; message: string; action?: string; created_at: string }>;
};

export function ClientResponse({ shareToken, currentStatus, clientMessages = [] }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [revisionSent, setRevisionSent] = useState(false);

  async function handleResponse(action: "accepted" | "declined" | "revision_requested") {
    if (action === "accepted" && !confirm("Accept this proposal and confirm the event?")) return;
    if (action === "declined" && !confirm("Decline this proposal?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/proposals/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_token: shareToken, action, message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "revision_requested") {
          setRevisionSent(true);
          setMessage("");
          setShowMessage(false);
        } else {
          setStatus(action);
        }
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
        <p className="text-sm text-[#f5ede0] mb-2">Thank you! Your event has been confirmed.</p>
        <p className="text-sm text-[#9c8876]">The catering team will be in touch shortly to finalize all the details. We look forward to making your event special.</p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="card p-8 text-center">
        <XCircle className="w-12 h-12 text-[#9c8876] mx-auto mb-3" />
        <h3 className="font-display text-xl font-semibold mb-1">Proposal Declined</h3>
        <p className="text-sm text-[#f5ede0] mb-2">Thank you for your response.</p>
        <p className="text-sm text-[#9c8876]">The catering team has been notified. If you change your mind or would like to discuss adjustments, please don&apos;t hesitate to reach out.</p>
      </div>
    );
  }

  if (revisionSent) {
    return (
      <div className="card p-8 text-center">
        <RotateCcw className="w-12 h-12 text-brand-400 mx-auto mb-3" />
        <h3 className="font-display text-xl font-semibold mb-1">Revision Requested</h3>
        <p className="text-sm text-[#9c8876]">Your caterer has been notified and will update the proposal. Check back soon!</p>
      </div>
    );
  }

  // Show previous messages from this thread
  const visibleMessages = clientMessages.filter(m => m.message);

  return (
    <div className="space-y-4">
      {/* Previous messages */}
      {visibleMessages.length > 0 && (
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3">Messages</h3>
          <div className="space-y-3">
            {visibleMessages.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${m.from === "client" ? "bg-brand-950/50 border border-brand-800/30" : "bg-[#1a1714] border border-[#2e271f]"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-[#9c8876] uppercase">
                    {m.from === "client" ? "You" : "Caterer"}
                  </span>
                  <span className="text-[10px] text-[#6b5a4a]">
                    {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-[#f5ede0]">{m.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response area */}
      <div className="card p-6">
        <h3 className="font-medium text-sm mb-4 text-center">Ready to proceed?</h3>

        {/* Optional message field */}
        {showMessage ? (
          <div className="mb-4">
            <textarea
              className="w-full bg-[#1a1714] border border-[#2e271f] rounded-lg p-3 text-sm text-[#f5ede0] placeholder-[#6b5a4a] focus:outline-none focus:border-brand-500 resize-none"
              rows={3}
              placeholder="Add a message for your caterer (optional)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowMessage(true)}
            className="flex items-center gap-1.5 text-xs text-[#9c8876] hover:text-[#f5ede0] transition-colors mx-auto mb-4"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Add a message
          </button>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleResponse("accepted")}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Accept Proposal
          </button>
          <button
            onClick={() => handleResponse("revision_requested")}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 px-4 py-3 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Request Revision
          </button>
          <button
            onClick={() => handleResponse("declined")}
            disabled={loading}
            className="text-[#6b5a4a] hover:text-red-400 transition-colors flex items-center gap-1.5 px-3 py-3 text-sm"
          >
            <XCircle className="w-4 h-4" />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
