import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Plus, CalendarDays } from "lucide-react";
import type { Event, PricingData } from "@/types";

const STATUS_CLASSES: Record<string, string> = {
  draft: "badge-draft", proposed: "badge-proposed",
  confirmed: "badge-confirmed", completed: "badge-completed", canceled: "badge-canceled",
};

export default async function EventsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("events").select("*").eq("user_id", user.id).order("event_date", { ascending: false });
  const events: Event[] = data ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Events</h1>
          <p className="text-sm text-[#9c8876] mt-1">{events.length} total events</p>
        </div>
        <Link href="/events/new" className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New event</Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-16 text-center">
          <CalendarDays className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No events yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Create your first event to start pricing.</p>
          <Link href="/events/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create first event</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#2e271f]">
              {["Event", "Client", "Date", "Guests", "Revenue", "Margin", "Status", ""].map(h => (
                <th key={h} className="text-left text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {events.map(event => {
                const p = event.pricing_data as PricingData | null;
                return (
                  <tr key={event.id} className="border-b border-[#1c1814] hover:bg-[#1c1814] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-sm max-w-[180px]">
                      <Link href={`/events/${event.id}`} className="hover:text-brand-400 transition-colors truncate block">{event.name}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#9c8876]">{event.client_name}</td>
                    <td className="px-5 py-3.5 text-sm text-[#9c8876] whitespace-nowrap">{format(new Date(event.event_date), "MMM d, yyyy")}</td>
                    <td className="px-5 py-3.5 text-sm text-[#9c8876]">{event.guest_count}</td>
                    <td className="px-5 py-3.5 text-sm">{p ? formatCurrency(p.suggestedPrice) : <span className="text-[#6b5a4a]">—</span>}</td>
                    <td className="px-5 py-3.5 text-sm">{p ? formatPercent(p.projectedMargin) : <span className="text-[#6b5a4a]">—</span>}</td>
                    <td className="px-5 py-3.5"><span className={STATUS_CLASSES[event.status] ?? "badge-draft"}>{event.status}</span></td>
                    <td className="px-5 py-3.5">
                      <Link href={`/events/${event.id}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Open →</Link>
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
