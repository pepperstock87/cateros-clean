import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { PrepDashboardClient } from "./PrepDashboardClient";

export default async function PrepPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  // Fetch all upcoming events for the event list
  let eventsQuery = supabase
    .from("events")
    .select("id, name, event_date, client_name, guest_count, venue, status, pricing_data")
    .eq("user_id", user.id)
    .in("status", ["draft", "proposed", "confirmed"])
    .order("event_date", { ascending: true });
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);
  const { data: eventsData } = await eventsQuery;

  const events = (eventsData ?? []).map((e: any) => ({
    id: e.id,
    name: e.name,
    event_date: e.event_date,
    client_name: e.client_name,
    guest_count: e.guest_count,
    venue: e.venue,
    status: e.status,
    menuItemCount: (e.pricing_data as any)?.menuItems?.length ?? 0,
  }));

  return <PrepDashboardClient events={events} />;
}
