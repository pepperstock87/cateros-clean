import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ClientList } from "./ClientList";
import { getCurrentOrg } from "@/lib/organizations";
import type { Event, PricingData } from "@/types";

export type ClientData = {
  name: string;
  email: string | null;
  phone: string | null;
  eventCount: number;
  totalRevenue: number;
  mostRecentDate: string;
  statusDistribution: Record<string, number>;
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let eventsQuery = supabase.from("events").select("*").eq("user_id", user.id);
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);
  const { data } = await eventsQuery.order("event_date", { ascending: false });

  const events: Event[] = data ?? [];

  // Group events by client_name (case-insensitive)
  const clientMap = new Map<string, Event[]>();
  for (const event of events) {
    const key = event.client_name.toLowerCase();
    if (!clientMap.has(key)) {
      clientMap.set(key, []);
    }
    clientMap.get(key)!.push(event);
  }

  // Build aggregated client data
  const clients: ClientData[] = [];
  for (const [, clientEvents] of clientMap) {
    // Events are already sorted by event_date descending, so first is most recent
    const mostRecent = clientEvents[0];

    // Find the most recent event that has email/phone
    const withEmail = clientEvents.find((e) => e.client_email);
    const withPhone = clientEvents.find((e) => e.client_phone);

    const totalRevenue = clientEvents.reduce((sum, e) => {
      const pricing = e.pricing_data as PricingData | null;
      return sum + (pricing?.suggestedPrice ?? 0);
    }, 0);

    const statusDistribution: Record<string, number> = {};
    for (const e of clientEvents) {
      statusDistribution[e.status] = (statusDistribution[e.status] ?? 0) + 1;
    }

    clients.push({
      name: mostRecent.client_name,
      email: withEmail?.client_email ?? null,
      phone: withPhone?.client_phone ?? null,
      eventCount: clientEvents.length,
      totalRevenue,
      mostRecentDate: mostRecent.event_date,
      statusDistribution,
    });
  }

  // Sort by total revenue descending
  clients.sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-[#9c8876] mt-1">
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No clients yet</h2>
          <p className="text-sm text-[#9c8876]">
            Clients will appear here once you create events.
          </p>
        </div>
      ) : (
        <ClientList clients={clients} />
      )}
    </div>
  );
}
