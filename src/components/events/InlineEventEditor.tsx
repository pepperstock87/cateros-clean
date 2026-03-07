"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Clock, Users, MapPin, Mail, Phone, FileText } from "lucide-react";
import { InlineEditField } from "./InlineEditField";

type EventData = {
  id: string;
  name: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  guest_count: number;
  venue: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
};

type Props = {
  event: EventData;
};

export function InlineEventEditor({ event }: Props) {
  const router = useRouter();

  async function patchField(field: string, value: string) {
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || "Failed to update";
      toast.error(msg);
      throw new Error(msg);
    }

    toast.success("Updated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Event Details */}
      <div>
        <h2 className="font-medium text-sm mb-3 text-[#9c8876]">Event Details</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Date</span>
            </div>
            <InlineEditField
              value={event.event_date}
              type="date"
              onSave={(v) => patchField("event_date", v)}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Start Time</span>
            </div>
            <InlineEditField
              value={event.start_time || ""}
              type="time"
              onSave={(v) => patchField("start_time", v)}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">End Time</span>
            </div>
            <InlineEditField
              value={event.end_time || ""}
              type="time"
              onSave={(v) => patchField("end_time", v)}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Guests</span>
            </div>
            <InlineEditField
              value={String(event.guest_count)}
              type="number"
              onSave={(v) => patchField("guest_count", v)}
            />
          </div>

          <div className="card p-4 col-span-2">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Venue</span>
            </div>
            <InlineEditField
              value={event.venue || ""}
              type="text"
              onSave={(v) => patchField("venue", v)}
            />
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div>
        <h2 className="font-medium text-sm mb-3 text-[#9c8876]">Client Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Client Name</span>
            </div>
            <InlineEditField
              value={event.client_name}
              type="text"
              onSave={(v) => patchField("client_name", v)}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Mail className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Email</span>
            </div>
            <InlineEditField
              value={event.client_email || ""}
              type="text"
              onSave={(v) => patchField("client_email", v)}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Phone className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Phone</span>
            </div>
            <InlineEditField
              value={event.client_phone || ""}
              type="text"
              onSave={(v) => patchField("client_phone", v)}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h2 className="font-medium text-sm mb-3 text-[#9c8876]">Notes</h2>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-[#9c8876]" />
            <span className="stat-label text-[10px] uppercase tracking-wider text-[#9c8876]">Event Notes</span>
          </div>
          <InlineEditField
            value={event.notes || ""}
            type="textarea"
            onSave={(v) => patchField("notes", v)}
          />
        </div>
      </div>
    </div>
  );
}
