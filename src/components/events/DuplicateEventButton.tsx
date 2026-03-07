"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { duplicateEventAction } from "@/lib/actions/events";
import { toast } from "sonner";

export function DuplicateEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const result = await duplicateEventAction(eventId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.eventId) {
      toast.success("Event duplicated");
      router.push(`/events/${result.eventId}`);
    }
    setLoading(false);
  }

  return (
    <button onClick={handleDuplicate} disabled={loading} className="btn-secondary flex items-center gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
      Duplicate
    </button>
  );
}
