"use client";

import { CalendarPlus } from "lucide-react";
import { generateICS, downloadICS } from "@/lib/generateICS";

interface CalendarExportProps {
  event: {
    id: string;
    name: string;
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
    client_name?: string | null;
    notes?: string | null;
  };
}

export function CalendarExport({ event }: CalendarExportProps) {
  const handleExport = () => {
    const ics = generateICS({
      name: event.name,
      date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      venue: event.venue,
      client_name: event.client_name,
      notes: event.notes,
    });

    const safeName = event.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    downloadICS(ics, `${safeName}.ics`);
  };

  return (
    <button
      onClick={handleExport}
      className="btn-secondary flex items-center gap-2"
      title="Add to Calendar"
    >
      <CalendarPlus className="w-4 h-4" />
      Add to Calendar
    </button>
  );
}
