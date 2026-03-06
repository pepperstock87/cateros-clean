"use client";

import { deleteEventAction } from "@/lib/actions/events";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${eventName}"? This will also remove linked proposals. This cannot be undone.`)) return;
    const result = await deleteEventAction(eventId);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Event deleted");
      router.push("/events");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-[#6b5a4a] hover:text-red-400 transition-colors p-2"
      title="Delete event"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
