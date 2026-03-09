"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Loader2, X, Check } from "lucide-react";
import { createRecurringEvents } from "@/lib/actions/events";
import { toast } from "sonner";

type Frequency = "weekly" | "biweekly" | "monthly";

type Props = {
  eventId: string;
  eventName: string;
};

export function RecurringEventButton({ eventId, eventName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Fragment>
      <button onClick={() => setOpen(true)} className="btn-secondary flex items-center gap-2">
        <Repeat className="w-4 h-4" />
        Create Recurring
      </button>
      {open && (
        <RecurringEventModal
          eventId={eventId}
          eventName={eventName}
          onClose={() => setOpen(false)}
        />
      )}
    </Fragment>
  );
}

function RecurringEventModal({
  eventId,
  eventName,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [count, setCount] = useState(4);
  const [startDate, setStartDate] = useState("");

  const previewDates = useMemo(() => {
    if (!startDate) return [];
    const dates: string[] = [];
    const start = new Date(startDate + "T00:00:00");

    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      if (frequency === "weekly") {
        d.setDate(start.getDate() + i * 7);
      } else if (frequency === "biweekly") {
        d.setDate(start.getDate() + i * 14);
      } else {
        d.setMonth(start.getMonth() + i);
      }
      dates.push(d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }));
    }
    return dates;
  }, [startDate, frequency, count]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: count });

    const result = await createRecurringEvents(eventId, {
      frequency,
      count,
      startDate,
    });

    if (result.error) {
      toast.error(result.error);
      if (result.createdSoFar && result.createdSoFar.length > 0) {
        toast.info(`${result.createdSoFar.length} event(s) were created before the error.`);
      }
      setLoading(false);
      setProgress(null);
    } else if (result.eventIds) {
      toast.success(`${result.eventIds.length} recurring events created`);
      router.push("/events");
      router.refresh();
    }
  }

  const frequencyOptions: { value: Frequency; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#0F1729] border border-[#2A3A5C] rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-display text-lg font-semibold mb-1">Create Recurring Events</h2>
        <p className="text-sm text-[#D4A373] mb-5">
          Generate multiple copies of &ldquo;{eventName}&rdquo; on a schedule.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-[#7A8BA8] mb-2">Frequency</label>
            <div className="flex gap-2">
              {frequencyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    frequency === opt.value
                      ? "bg-[#D4A373]/20 border-[#D4A373] text-[#D4A373]"
                      : "bg-[#182030] border-[#2A3A5C] text-[#7A8BA8] hover:border-[#D4A373]/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="block text-xs font-medium text-[#7A8BA8] mb-1">
              Number of Occurrences
            </label>
            <input
              type="number"
              min={1}
              max={52}
              value={count}
              onChange={(e) => setCount(Math.min(52, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-lg bg-[#182030] border border-[#2A3A5C] px-3 py-2 text-sm text-[#F4F1ED] focus:outline-none focus:ring-2 focus:ring-[#D4A373]/40"
            />
            <p className="text-xs text-[#7A8BA8] mt-1">Between 1 and 52 occurrences.</p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-[#7A8BA8] mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-lg bg-[#182030] border border-[#2A3A5C] px-3 py-2 text-sm text-[#F4F1ED] focus:outline-none focus:ring-2 focus:ring-[#D4A373]/40"
            />
          </div>

          {/* Date Preview */}
          {previewDates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#7A8BA8] mb-2">
                Dates to be created ({previewDates.length})
              </label>
              <div className="bg-[#182030] border border-[#2A3A5C] rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                {previewDates.map((date, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-3 h-3 text-[#D4A373] flex-shrink-0" />
                    <span className="text-[#F4F1ED]">{date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {progress && loading && (
            <div className="bg-[#182030] border border-[#2A3A5C] rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-[#D4A373]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating {progress.total} events...</span>
              </div>
            </div>
          )}

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
              disabled={loading || !startDate}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
              Create {count} Event{count !== 1 ? "s" : ""}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
