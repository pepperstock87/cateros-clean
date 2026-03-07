"use client";

import { useState } from "react";
import { deleteEventAction } from "@/lib/actions/events";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${eventName}"? This will also remove linked proposals. This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteEventAction(eventId);
    if (result?.error) {
      toast.error(result.error);
      setDeleting(false);
    } else {
      toast.success("Event deleted");
      router.push("/events");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-[#6b5a4a] hover:text-red-400 transition-colors p-2 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Delete event"
    >
      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
