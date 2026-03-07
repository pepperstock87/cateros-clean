"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProposalStatusAction, deleteProposalAction } from "@/lib/actions/proposals";
import { generateProposalPDF } from "@/lib/generateProposalPDF";
import { createClient } from "@/lib/supabase/client";
import type { Proposal, Event, BusinessSettings, UserEntitlements } from "@/types";
import { Send, CheckCircle, XCircle, FileText, Trash2, RotateCcw, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { ProposalFollowUp } from "@/components/proposals/ProposalFollowUp";

const statusConfig: Record<Proposal["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "badge-draft" },
  sent: { label: "Sent", className: "badge-proposed" },
  accepted: { label: "Accepted", className: "badge-confirmed" },
  declined: { label: "Declined", className: "badge-canceled" },
};

export function ProposalActions({ proposal, event }: { proposal: Proposal; event: Event | null; clientEmail?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleStatusChange(status: Proposal["status"]) {
    setLoading(true);
    const result = await updateProposalStatusAction(proposal.id, status);
    if (result.error) toast.error(result.error);
    else toast.success(`Proposal marked as ${status}`);
    setLoading(false);
    router.refresh();
  }

  async function handleRegenerate() {
    if (!event?.pricing_data) {
      toast.error("Event has no pricing data");
      return;
    }
    setRegenerating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const [profileRes, entitlementsRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("company_name").eq("id", user!.id).single(),
        fetch("/api/entitlements").then(r => r.json()),
        supabase.from("business_settings").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);

      const entitlements: UserEntitlements = entitlementsRes;
      const businessSettings: BusinessSettings | null = settingsRes.data;

      const doc = await generateProposalPDF(
        event,
        profileRes.data?.company_name ?? "Our Catering Company",
        proposal.custom_message ?? undefined,
        proposal.terms ?? undefined,
        businessSettings,
        entitlements.isPro
      );

      const filename = `proposal-${event.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      doc.save(filename);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    const result = await deleteProposalAction(proposal.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Proposal deleted");
      router.push("/proposals");
    }
  }

  const status = statusConfig[proposal.status];

  const followUpData = {
    id: proposal.id,
    status: proposal.status,
    created_at: proposal.created_at,
    responded_at: (proposal as Proposal & { responded_at?: string | null }).responded_at ?? null,
    client_email: event?.client_email ?? null,
    share_token: proposal.share_token,
  };

  return (
    <div className="space-y-4">
    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
      <span className={`badge ${status.className}`}>{status.label}</span>

      {/* Status transitions */}
      {proposal.status === "draft" && (
        <button
          onClick={() => handleStatusChange("sent")}
          disabled={loading}
          className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
        >
          <Send className="w-3.5 h-3.5" />Mark as Sent
        </button>
      )}

      {proposal.status === "sent" && (
        <>
          <button
            onClick={() => handleStatusChange("accepted")}
            disabled={loading}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <CheckCircle className="w-3.5 h-3.5" />Accepted
          </button>
          <button
            onClick={() => handleStatusChange("declined")}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <XCircle className="w-3.5 h-3.5" />Declined
          </button>
        </>
      )}

      {(proposal.status === "declined" || proposal.status === "accepted") && (
        <button
          onClick={() => handleStatusChange("draft")}
          disabled={loading}
          className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3"
        >
          <RotateCcw className="w-3.5 h-3.5" />Reset to Draft
        </button>
      )}

      {/* Share link */}
      {proposal.share_token && (
        <button
          onClick={async () => {
            const url = `${window.location.origin}/p/${proposal.share_token}`;
            navigator.clipboard.writeText(url);
            toast.success("Share link copied to clipboard");
            if (proposal.status === "draft") {
              await updateProposalStatusAction(proposal.id, "sent");
              toast.success("Proposal marked as sent");
              router.refresh();
            }
          }}
          className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3"
        >
          <Link2 className="w-3.5 h-3.5" />Copy Link
        </button>
      )}

      {/* Regenerate PDF */}
      {event?.pricing_data && (
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3"
        >
          {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          {regenerating ? "Generating..." : "Download PDF"}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="text-[#6b5a4a] hover:text-red-400 transition-colors p-2"
        title="Delete proposal"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>

      {/* Follow-up status — show when proposal has been sent */}
      {(proposal.status === "sent" || proposal.status === "accepted" || proposal.status === "declined") && (
        <ProposalFollowUp proposal={followUpData} />
      )}
    </div>
  );
}
