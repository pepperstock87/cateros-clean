import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentOrg } from "@/lib/organizations";
import { ClientDetailClient } from "./ClientDetailClient";
import type { Client, Event, Proposal, PricingData } from "@/types";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  // Fetch client record
  let clientQuery = supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id);
  if (org?.orgId) clientQuery = clientQuery.eq("organization_id", org.orgId);
  const { data: clientData } = await clientQuery.single();

  if (!clientData) notFound();
  const client = clientData as Client;

  // Fetch events for this client (via client_id on events table)
  let eventsQuery = supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .eq("client_id", id);
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);
  const { data: eventsData } = await eventsQuery.order("event_date", {
    ascending: false,
  });
  const events: Event[] = eventsData ?? [];

  // Fetch proposals for those events
  const eventIds = events.map((e) => e.id);
  let proposals: Proposal[] = [];
  if (eventIds.length > 0) {
    let proposalsQuery = supabase
      .from("proposals")
      .select("*, event:events(*)")
      .in("event_id", eventIds);
    if (org?.orgId)
      proposalsQuery = proposalsQuery.eq("organization_id", org.orgId);
    const { data: proposalsData } = await proposalsQuery.order("created_at", {
      ascending: false,
    });
    proposals = (proposalsData ?? []) as Proposal[];
  }

  // Compute financial summary
  const totalRevenue = events.reduce((sum, e) => {
    const pricing = e.pricing_data as PricingData | null;
    return sum + (pricing?.suggestedPrice ?? 0);
  }, 0);
  const totalEvents = events.length;
  const avgEventValue = totalEvents > 0 ? totalRevenue / totalEvents : 0;
  const lastBookedDate = events.length > 0 ? events[0].event_date : null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[#D4A373] hover:text-[#F4F1ED] mb-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      <ClientDetailClient
        client={client}
        events={events}
        proposals={proposals}
        financials={{
          totalRevenue,
          totalEvents,
          avgEventValue,
          lastBookedDate,
        }}
      />
    </div>
  );
}
