import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { FilteredEventsView } from "@/components/events/FilteredEventsView";
import { EventsExport } from "@/components/events/EventsExport";
import { getUserEntitlements } from "@/lib/entitlements";
import type { Event } from "@/types";

export default async function EventsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [eventsRes, profileRes] = await Promise.all([
    supabase.from("events").select("*").eq("user_id", user.id).order("event_date", { ascending: false }),
    supabase.from("profiles").select("company_name").eq("id", user.id).single(),
  ]);
  const events: Event[] = eventsRes.data ?? [];
  const companyName = profileRes.data?.company_name ?? "My Company";
  const { isPro } = await getUserEntitlements();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Events</h1>
          <p className="text-sm text-[#9c8876] mt-1">{events.length} total events</p>
        </div>
        <div className="flex items-center gap-3">
          {events.length > 0 && <EventsExport events={events} companyName={companyName} isPro={isPro} />}
          <Link href="/events/new" className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New event</Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card p-16 text-center">
          <CalendarDays className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No events yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Create your first event to start pricing.</p>
          <Link href="/events/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create first event</Link>
        </div>
      ) : (
        <FilteredEventsView events={events} companyName={companyName} />
      )}
    </div>
  );
}
