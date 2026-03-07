import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  Users,
  Star,
  StickyNote,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ClientNotesForm } from "./ClientNotesForm";
import type { Event, PricingData } from "@/types";

type Props = { params: Promise<{ name: string }> };

const statusColors: Record<string, string> = {
  draft: "bg-[#2e271f] text-[#9c8876]",
  proposed: "bg-blue-900/30 text-blue-400",
  confirmed: "bg-emerald-900/30 text-emerald-400",
  completed: "bg-green-900/30 text-green-400",
  canceled: "bg-red-900/30 text-red-400",
};

export default async function ClientDetailPage({ params }: Props) {
  const { name } = await params;
  const clientName = decodeURIComponent(name);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch events for this client
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .ilike("client_name", clientName)
    .order("event_date", { ascending: false });

  const events: Event[] = data ?? [];
  if (events.length === 0) notFound();

  // Fetch client notes
  const { data: notesRow } = await supabase
    .from("client_notes")
    .select("notes")
    .eq("user_id", user.id)
    .eq("client_name", clientName)
    .single();

  const savedNotes = notesRow?.notes ?? "";

  // Compute stats
  const totalRevenue = events.reduce((sum, e) => {
    const pricing = e.pricing_data as PricingData | null;
    return sum + (pricing?.suggestedPrice ?? 0);
  }, 0);

  const dates = events.map((e) => e.event_date).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const isRepeat = events.length > 1;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold truncate">
              {clientName}
            </h1>
            {isRepeat && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-900/30 text-amber-400 text-xs font-medium">
                <Star className="w-3 h-3" />
                Repeat Client
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-[#9c8876]" />
            <span className="stat-label">Total Events</span>
          </div>
          <div className="text-lg font-semibold">{events.length}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#9c8876]" />
            <span className="stat-label">Total Revenue</span>
          </div>
          <div className="text-lg font-semibold text-brand-300">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
            <span className="stat-label">First Event</span>
          </div>
          <div className="text-sm font-medium">
            {format(new Date(firstDate + "T00:00:00"), "MMM d, yyyy")}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
            <span className="stat-label">Last Event</span>
          </div>
          <div className="text-sm font-medium">
            {format(new Date(lastDate + "T00:00:00"), "MMM d, yyyy")}
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-1">Events</h2>
        <p className="text-sm text-[#9c8876] mb-4">
          All events for this client
        </p>
        <div className="space-y-3">
          {events.map((event) => {
            const pricing = event.pricing_data as PricingData | null;
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="card p-4 flex items-center justify-between gap-4 hover:border-[#9c8876]/40 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {event.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[event.status] ?? "bg-[#2e271f] text-[#9c8876]"}`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9c8876]">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {format(
                        new Date(event.event_date + "T00:00:00"),
                        "MMM d, yyyy"
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.guest_count} guests
                    </span>
                    {pricing && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(pricing.suggestedPrice)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6b5a4a] group-hover:text-[#9c8876] transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Notes section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="w-4 h-4 text-[#9c8876]" />
          <h2 className="font-display text-lg font-semibold">Notes</h2>
        </div>
        <ClientNotesForm clientName={clientName} initialNotes={savedNotes} />
      </div>
    </div>
  );
}
