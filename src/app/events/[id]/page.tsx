import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Users, CalendarDays, Mail, ClipboardList } from "lucide-react";
import { PricingEngine } from "@/components/events/PricingEngine";
import { EventStatusSelect } from "@/components/events/EventStatusSelect";
import { GenerateProposalButton } from "@/components/proposals/GenerateProposalButton";
import type { Event, PricingData } from "@/types";

type Props = { params: Promise<{ id: string }> };

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase.from("events").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!event) notFound();

  const e = event as Event;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All events
          </Link>
          <h1 className="font-display text-2xl font-semibold truncate">{e.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[#9c8876]">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{format(new Date(e.event_date), "EEEE, MMMM d, yyyy")}</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{e.guest_count} guests</span>
            {e.venue && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{e.venue}</span>}
            {e.client_email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{e.client_email}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <EventStatusSelect eventId={e.id} currentStatus={e.status} />
          {e.pricing_data && <GenerateProposalButton event={e} />}
          <Link href={`/events/${e.id}/beo`} className="btn-secondary flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />BEO Sheet
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold mb-1">Pricing Engine</h2>
        <p className="text-sm text-[#9c8876]">Build your cost model. Calculations update in real time.</p>
      </div>

      <PricingEngine eventId={e.id} guestCount={e.guest_count} initialPricing={e.pricing_data as PricingData | null} />
    </div>
  );
}
