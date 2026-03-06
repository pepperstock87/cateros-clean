import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import type { Proposal } from "@/types";

type ProposalWithEvent = Proposal & {
  event: {
    name: string;
    client_name: string;
    event_date: string;
    guest_count: number;
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
    .select("*, event:events(name, client_name, event_date, guest_count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const proposals: ProposalWithEvent[] = data ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Proposals</h1>
        <p className="text-sm text-[#9c8876] mt-1">Client-facing proposals generated from your events.</p>
      </div>

      {proposals.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No proposals yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Open an event, build pricing, then generate a PDF proposal to create one.</p>
          <Link href="/events" className="btn-primary inline-flex">View events</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proposals.map(proposal => (
            <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="card card-hover p-5 block">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-sm">{proposal.title}</h3>
                <span className={`badge ${statusBadgeClass[proposal.status]}`}>{proposal.status}</span>
              </div>
              {proposal.event && (
                <>
                  <p className="text-xs text-[#9c8876] mb-1">{proposal.event.name}</p>
                  <p className="text-xs text-[#9c8876] mb-3">{proposal.event.client_name}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9c8876]">{format(new Date(proposal.event.event_date), "MMM d, yyyy")}</span>
                    <span className="text-[#9c8876]">{proposal.event.guest_count} guests</span>
                  </div>
                </>
              )}
              <div className="mt-3 pt-3 border-t border-[#2e271f] text-xs text-[#9c8876]">
                Created {format(new Date(proposal.created_at), "MMM d, yyyy")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
