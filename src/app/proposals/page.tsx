import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { getPageLabel } from "@/lib/roleLabels";
import type { BusinessType } from "@/types";
import ProposalsContent, { type ProposalWithEvent } from "./ProposalsContent";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let proposalsQuery = supabase.from("proposals").select("*, event:events(name, client_name, event_date, guest_count, pricing_data)").eq("user_id", user.id);
  if (org?.orgId) proposalsQuery = proposalsQuery.eq("organization_id", org.orgId);

  const [{ data }, profileRes] = await Promise.all([
    proposalsQuery.order("created_at", { ascending: false }),
    supabase.from("profiles").select("business_type").eq("id", user.id).single(),
  ]);

  const proposals: ProposalWithEvent[] = data ?? [];
  const businessType = (profileRes.data?.business_type as BusinessType) || "caterer";
  const pageTitle = getPageLabel(businessType, "/proposals", "Proposals");

  const counts: Record<string, number> = {
    all: proposals.length,
    draft: proposals.filter(p => p.status === "draft").length,
    sent: proposals.filter(p => ["sent", "viewed"].includes(p.status)).length,
    booked: proposals.filter(p => ["approved", "signed", "deposit_paid", "booked"].includes(p.status)).length,
    declined: proposals.filter(p => ["declined", "expired"].includes(p.status)).length,
  };

  const bookedRevenue = proposals
    .filter(p => ["approved", "signed", "deposit_paid", "booked"].includes(p.status) && p.event?.pricing_data)
    .reduce((sum, p) => sum + (p.event!.pricing_data!.suggestedPrice || 0), 0);

  const pendingRevenue = proposals
    .filter(p => (p.status === "draft" || p.status === "sent") && p.event?.pricing_data)
    .reduce((sum, p) => sum + (p.event!.pricing_data!.suggestedPrice || 0), 0);

  return <ProposalsContent proposals={proposals} pageTitle={pageTitle} counts={counts} bookedRevenue={bookedRevenue} pendingRevenue={pendingRevenue} />;
}
