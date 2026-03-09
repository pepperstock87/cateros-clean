"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, X } from "lucide-react";
import { cloneEventAction } from "@/lib/actions/events";
import { toast } from "sonner";

type Props = {
  eventId: string;
  eventName: string;
  clientName: string;
};

export function CloneEventButton({ eventId, eventName, clientName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Fragment>
      <button onClick={() => setOpen(true)} className="btn-secondary flex items-center gap-2">
        <Copy className="w-4 h-4" />
        Clone
      </button>
      {open && (
        <CloneEventModal
          eventId={eventId}
          eventName={eventName}
          clientName={clientName}
          onClose={() => setOpen(false)}
        />
      )}
    </Fragment>
  );
}

function CloneEventModal({
  eventId,
  eventName,
  clientName,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(`Copy of ${eventName}`);
  const [eventDate, setEventDate] = useState("");
  const [sameClient, setSameClient] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const overrides: Parameters<typeof cloneEventAction>[1] = {
      name: name.trim() || undefined,
      event_date: eventDate || undefined,
    };

    if (!sameClient) {
      overrides.client_name = "";
      overrides.client_id = "";
    }

    const result = await cloneEventAction(eventId, overrides);

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
    } else if (result.eventId) {
      toast.success("Event cloned");
      router.push(`/events/${result.eventId}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#0F1729] border border-[#2A3A5C] rounded-xl p-6 w-full max-w-md shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-display text-lg font-semibold mb-1">Clone Event</h2>
        <p className="text-sm text-[#D4A373] mb-5">
          Create a copy of &ldquo;{eventName}&rdquo; with fresh status and no payments.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#7A8BA8] mb-1">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg bg-[#182030] border border-[#2A3A5C] px-3 py-2 text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:ring-2 focus:ring-[#D4A373]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#7A8BA8] mb-1">New Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg bg-[#182030] border border-[#2A3A5C] px-3 py-2 text-sm text-[#F4F1ED] focus:outline-none focus:ring-2 focus:ring-[#D4A373]/40"
            />
            <p className="text-xs text-[#7A8BA8] mt-1">Leave empty to keep the original date.</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sameClient}
              onChange={(e) => setSameClient(e.target.checked)}
              className="rounded border-[#2A3A5C] bg-[#182030] text-[#D4A373] focus:ring-[#D4A373]/40"
            />
            <span className="text-sm text-[#F4F1ED]">Keep same client ({clientName})</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              Clone Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
