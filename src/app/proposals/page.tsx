import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Proposal, PricingData } from "@/types";

type ProposalWithEvent = Proposal & {
  event: {
    name: string;
    client_name: string;
    event_date: string;
    guest_count: number;
    pricing_data: PricingData | null;
  } | null;
};

const statusBadgeClass: Record<Proposal["status"], string> = {
  draft: "badge-draft",
  sent: "badge-proposed",
  accepted: "badge-confirmed",
  declined: "badge-canceled",
};

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("proposals")
    .select("*, event:events(name, client_name, event_date, guest_count, pricing_data)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const proposals: ProposalWithEvent[] = data ?? [];

  const counts = {
    all: proposals.length,
    draft: proposals.filter(p => p.status === "draft").length,
    sent: proposals.filter(p => p.status === "sent").length,
    accepted: proposals.filter(p => p.status === "accepted").length,
    declined: proposals.filter(p => p.status === "declined").length,
  };

  const acceptedRevenue = proposals
    .filter(p => p.status === "accepted" && p.event?.pricing_data)
    .reduce((sum, p) => sum + (p.event!.pricing_data!.suggestedPrice || 0), 0);

  const pendingRevenue = proposals
    .filter(p => (p.status === "draft" || p.status === "sent") && p.event?.pricing_data)
    .reduce((sum, p) => sum + (p.event!.pricing_data!.suggestedPrice || 0), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Proposals</h1>
          <p className="text-sm text-[#9c8876] mt-1">Client-facing proposals generated from your events.</p>
        </div>
      </div>

      {/* Stats */}
      {proposals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="stat-label mb-1">Total Proposals</div>
            <div className="text-xl font-semibold font-display">{counts.all}</div>
          </div>
          <div className="card p-4">
            <div className="stat-label mb-1">Awaiting Response</div>
            <div className="text-xl font-semibold font-display text-yellow-400">{counts.sent}</div>
          </div>
          <div className="card p-4">
            <div className="stat-label mb-1">Accepted Revenue</div>
            <div className="text-xl font-semibold font-display text-green-400">{formatCurrency(acceptedRevenue)}</div>
          </div>
          <div className="card p-4">
            <div className="stat-label mb-1">Pending Revenue</div>
            <div className="text-xl font-semibold font-display text-brand-300">{formatCurrency(pendingRevenue)}</div>
          </div>
        </div>
      )}

      {/* Status tabs */}
      {proposals.length > 0 && (
        <div className="flex items-center gap-1 mb-6 text-xs">
          {(["all", "draft", "sent", "accepted", "declined"] as const).map(status => (
            <span
              key={status}
              className={`px-3 py-1.5 rounded-lg font-medium border ${
                counts[status] > 0
                  ? "border-[#2e271f] text-[#9c8876]"
                  : "border-transparent text-[#6b5a4a]"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
            </span>
          ))}
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No proposals yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Open an event, build pricing, then click "Generate Proposal" to create one.</p>
          <Link href="/events" className="btn-primary inline-flex">View events</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e271f]">
                {["Proposal", "Client", "Event Date", "Amount", "Status", "Created", ""].map(h => (
                  <th key={h} className="text-left text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map(proposal => {
                const pricing = proposal.event?.pricing_data;
                return (
                  <tr key={proposal.id} className="border-b border-[#1c1814] hover:bg-[#1c1814] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-sm max-w-[200px]">
                      <Link href={`/proposals/${proposal.id}`} className="hover:text-brand-400 transition-colors truncate block">
                        {proposal.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#9c8876]">
                      {proposal.event?.client_name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#9c8876] whitespace-nowrap">
                      {proposal.event ? format(new Date(proposal.event.event_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {pricing ? formatCurrency(pricing.suggestedPrice) : <span className="text-[#6b5a4a]">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${statusBadgeClass[proposal.status]}`}>{proposal.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#9c8876] whitespace-nowrap">
                      {format(new Date(proposal.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/proposals/${proposal.id}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
