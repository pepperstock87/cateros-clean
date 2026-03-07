"use client";

import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle, Send, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type ProposalFollowUpProps = {
  proposal: {
    id: string;
    status: string;
    created_at: string;
    responded_at: string | null;
    client_email: string | null;
    share_token: string | null;
  };
};

export function ProposalFollowUp({ proposal }: ProposalFollowUpProps) {
  const [sending, setSending] = useState(false);

  const daysSinceSent = Math.floor(
    (Date.now() - new Date(proposal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const hasResponded = !!proposal.responded_at;
  const needsFollowUp = !hasResponded && daysSinceSent >= 3 && proposal.status === "sent";

  async function handleSendReminder() {
    if (!proposal.share_token) {
      toast.error("No share link available for this proposal");
      return;
    }

    setSending(true);
    try {
      // Copy share link as a reminder action
      const url = `${window.location.origin}/p/${proposal.share_token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied — send it to your client as a reminder");
    } catch {
      toast.error("Failed to copy reminder link");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#9c8876]" />
        Follow-Up Status
      </h3>

      <div className="space-y-3">
        {/* Days since sent */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9c8876]">Sent</span>
          <span className="text-sm">
            {daysSinceSent === 0
              ? "Today"
              : daysSinceSent === 1
              ? "1 day ago"
              : `${daysSinceSent} days ago`}
          </span>
        </div>

        {/* Response status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9c8876]">Client Response</span>
          {hasResponded ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-green-900/40 text-green-400 border border-green-800/40">
              <CheckCircle className="w-3 h-3" />
              Responded
            </span>
          ) : proposal.status === "accepted" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-green-900/40 text-green-400 border border-green-800/40">
              <CheckCircle className="w-3 h-3" />
              Accepted
            </span>
          ) : proposal.status === "declined" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-red-900/40 text-red-400 border border-red-800/40">
              <CheckCircle className="w-3 h-3" />
              Declined
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-[#2e271f] text-[#9c8876]">
              Awaiting response
            </span>
          )}
        </div>

        {/* Client email */}
        {proposal.client_email && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9c8876]">Client Email</span>
            <span className="text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#9c8876]" />
              {proposal.client_email}
            </span>
          </div>
        )}

        {/* Follow up recommended badge */}
        {needsFollowUp && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-800/40 bg-yellow-950/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-xs text-yellow-400 font-medium">
              Follow up recommended — no response in {daysSinceSent} days
            </span>
          </div>
        )}

        {/* Send reminder button */}
        {proposal.status === "sent" && !hasResponded && (
          <button
            onClick={handleSendReminder}
            disabled={sending}
            className="btn-secondary w-full flex items-center justify-center gap-1.5 text-sm py-2"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sending ? "Copying..." : "Send Reminder"}
          </button>
        )}
      </div>
    </div>
  );
}
