"use client";

import { updateEventStatusAction } from "@/lib/actions/events";
import { toast } from "sonner";

const STATUSES = ["draft", "proposed", "confirmed", "completed", "canceled"] as const;
const STATUS_COLORS: Record<string, string> = {
  draft: "text-[#9c8876]", proposed: "text-blue-400",
  confirmed: "text-green-400", completed: "text-brand-400", canceled: "text-red-400",
};

export function EventStatusSelect({ eventId, currentStatus }: { eventId: string; currentStatus: string }) {
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const result = await updateEventStatusAction(eventId, e.target.value);
    if (result?.error) toast.error(result.error);
    else toast.success(`Status updated to ${e.target.value}`);
  }

  return (
    <select defaultValue={currentStatus} onChange={handleChange}
      className={`bg-[#1c1814] border border-[#2e271f] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-brand-500 transition-colors capitalize ${STATUS_COLORS[currentStatus] ?? ""}`}>
      {STATUSES.map(s => <option key={s} value={s} className="text-[#f5ede0] capitalize">{s}</option>)}
    </select>
  );
}
