"use client";

import { createEventAction } from "@/lib/actions/events";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewEventPage() {
  const [state, action, pending] = useActionState(createEventAction, undefined);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Events
      </Link>
      <h1 className="font-display text-2xl font-semibold mb-2">New Event</h1>
      <p className="text-sm text-[#9c8876] mb-8">Fill in event details. Add full pricing on the next screen.</p>

      {state?.error && (
        <div className="bg-red-900/30 border border-red-900/50 text-red-400 text-sm px-3 py-2.5 rounded-lg mb-6">{state.error}</div>
      )}

      <form action={action} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider">Event Details</h2>
          <div>
            <label className="label">Event name *</label>
            <input name="name" className="input" placeholder="Smith-Johnson Wedding Reception" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Event date *</label>
              <input name="event_date" type="date" className="input" min={today} required />
            </div>
            <div>
              <label className="label">Guest count *</label>
              <input name="guest_count" type="number" className="input" placeholder="120" min={1} required />
            </div>
          </div>
          <div>
            <label className="label">Venue</label>
            <input name="venue" className="input" placeholder="Grand Ballroom, The Riverside Hotel" />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider">Client Information</h2>
          <div>
            <label className="label">Client name *</label>
            <input name="client_name" className="input" placeholder="Sarah & Michael Smith" required />
          </div>
          <div>
            <label className="label">Client email</label>
            <input name="client_email" type="email" className="input" placeholder="client@email.com" />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider mb-4">Notes</h2>
          <textarea name="notes" className="input resize-none" rows={3} placeholder="Dietary restrictions, special requests, parking notes..." />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary flex items-center gap-2 px-6">
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {pending ? "Creating..." : "Create event & add pricing →"}
          </button>
          <Link href="/events" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
