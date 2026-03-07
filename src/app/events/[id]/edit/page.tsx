"use client";

import { useActionState, useEffect, useState } from "react";
import { updateEventDetailsAction } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Event } from "@/types";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const boundAction = updateEventDetailsAction.bind(null, id);
  const [state, action, pending] = useActionState(boundAction, undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("events").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setEvent(data as Event | null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-8 text-sm text-[#6b5a4a]">Loading...</div>;
  if (!event) return <div className="p-8 text-sm text-red-400">Event not found</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href={`/events/${id}`} className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to event
      </Link>
      <h1 className="font-display text-2xl font-semibold mb-2">Edit Event</h1>
      <p className="text-sm text-[#9c8876] mb-8">Update event details below.</p>

      {state?.error && (
        <div className="bg-red-900/30 border border-red-900/50 text-red-400 text-sm px-3 py-2.5 rounded-lg mb-6">{state.error}</div>
      )}

      <form action={action} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider">Event Details</h2>
          <div>
            <label className="label">Event name *</label>
            <input name="name" className="input" defaultValue={event.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Event date *</label>
              <input name="event_date" type="date" className="input" defaultValue={event.event_date.split("T")[0]} required />
            </div>
            <div>
              <label className="label">Guest count *</label>
              <input name="guest_count" type="number" className="input" defaultValue={event.guest_count} min={1} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start time</label>
              <input name="start_time" type="time" className="input" defaultValue={event.start_time ?? ""} />
            </div>
            <div>
              <label className="label">End time</label>
              <input name="end_time" type="time" className="input" defaultValue={event.end_time ?? ""} />
            </div>
          </div>
          <div>
            <label className="label">Venue</label>
            <input name="venue" className="input" defaultValue={event.venue ?? ""} />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider">Client Information</h2>
          <div>
            <label className="label">Client name *</label>
            <input name="client_name" className="input" defaultValue={event.client_name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client email</label>
              <input name="client_email" type="email" className="input" defaultValue={event.client_email ?? ""} />
            </div>
            <div>
              <label className="label">Client phone</label>
              <input name="client_phone" type="tel" className="input" defaultValue={event.client_phone ?? ""} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider mb-4">Notes</h2>
          <textarea name="notes" className="input resize-none" rows={3} defaultValue={event.notes ?? ""} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary flex items-center gap-2 px-6">
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {pending ? "Saving..." : "Save changes"}
          </button>
          <Link href={`/events/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
