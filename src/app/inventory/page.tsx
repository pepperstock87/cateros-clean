import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import type { InventoryItem } from "@/types";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let query = supabase.from("inventory").select("*").eq("user_id", user.id);
  if (org?.orgId) query = query.eq("organization_id", org.orgId);
  const { data } = await query.order("ingredient_name");
  const items: InventoryItem[] = data ?? [];

  // Fetch events for "Deduct from Event" feature
  const { data: eventsData } = await supabase
    .from("events")
    .select("id, name, event_date, status")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "proposed", "draft"])
    .order("event_date", { ascending: true })
    .limit(50);

  const events = eventsData ?? [];

  return <InventoryClient items={items} events={events} />;
}
