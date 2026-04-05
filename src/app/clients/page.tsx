import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientList } from "./ClientList";
import { getCurrentOrg } from "@/lib/organizations";
import { getPageLabel } from "@/lib/roleLabels";
import type { Client, Event, PricingData, BusinessType } from "@/types";

export type ClientWithStats = Client & {
  eventCount: number;
  totalRevenue: number;
  lastEventDate: string | null;
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  // Fetch clients from the dedicated clients table
  let clientsQuery = supabase.from("clients").select("*").eq("user_id", user.id);
  if (org?.orgId) clientsQuery = clientsQuery.eq("organization_id", org.orgId);

  const [{ data: clientsData }, profileRes] = await Promise.all([
    clientsQuery.order("created_at", { ascending: false }),
    supabase.from("profiles").select("business_type").eq("id", user.id).single(),
  ]);

  const clients: Client[] = clientsData ?? [];
  const businessType = (profileRes.data?.business_type as BusinessType) || "caterer";
  const pageTitle = getPageLabel(businessType, "/clients", "Clients");

  // Fetch all events to compute per-client stats (event count, revenue, last event)
  let eventsQuery = supabase.from("events").select("*").eq("user_id", user.id);
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);
  const { data: eventsData } = await eventsQuery.order("event_date", { ascending: false });
  const events: Event[] = eventsData ?? [];

  // Build a map of client_id -> stats
  const statsMap = new Map<string, { eventCount: number; totalRevenue: number; lastEventDate: string | null }>();
  for (const event of events) {
    const clientId = (event as any).client_id as string | null;
    if (!clientId) continue;
    const existing = statsMap.get(clientId) ?? { eventCount: 0, totalRevenue: 0, lastEventDate: null };
    existing.eventCount += 1;
    const pricing = event.pricing_data as PricingData | null;
    existing.totalRevenue += pricing?.suggestedPrice ?? 0;
    if (!existing.lastEventDate || event.event_date > existing.lastEventDate) {
      existing.lastEventDate = event.event_date;
    }
    statsMap.set(clientId, existing);
  }

  // Merge stats into clients
  const clientsWithStats: ClientWithStats[] = clients.map((client) => {
    const stats = statsMap.get(client.id) ?? { eventCount: 0, totalRevenue: 0, lastEventDate: null };
    return { ...client, ...stats };
  });

  // Sort by total revenue descending by default
  clientsWithStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">{pageTitle}</h1>
          <p className="text-sm text-[#D4A373] mt-1">
            {clientsWithStats.length} {clientsWithStats.length === 1 ? pageTitle.slice(0, -1).toLowerCase() : pageTitle.toLowerCase()}
          </p>
        </div>
      </div>

      <ClientList clients={clientsWithStats} />
    </div>
  );
}
