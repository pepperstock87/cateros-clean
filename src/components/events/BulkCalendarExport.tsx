"use client";

import { CalendarPlus } from "lucide-react";
import { generateMultiEventICS, downloadICS } from "@/lib/generateICS";

interface BulkCalendarExportProps {
  events: Array<{
    id: string;
    name: string;
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
    client_name?: string | null;
    notes?: string | null;
    status: string;
  }>;
}

export function BulkCalendarExport({ events }: BulkCalendarExportProps) {
  const handleExport = () => {
    const today = new Date().toISOString().split("T")[0];
    const upcomingConfirmed = events.filter(
      (e) => e.event_date >= today && e.status === "confirmed"
    );

    if (upcomingConfirmed.length === 0) {
      alert("No upcoming confirmed events to export.");
      return;
    }

    const ics = generateMultiEventICS(
      upcomingConfirmed.map((e) => ({
        name: e.name,
        date: e.event_date,
        start_time: e.start_time,
        end_time: e.end_time,
        venue: e.venue,
        client_name: e.client_name,
        notes: e.notes,
      }))
    );

    downloadICS(ics, "cateros-events.ics");
  };

  return (
    <button
      onClick={handleExport}
      className="btn-secondary flex items-center gap-2"
      title="Export all upcoming confirmed events to calendar"
    >
      <CalendarPlus className="w-4 h-4" />
      <span className="hidden sm:inline">Export All to Calendar</span>
    </button>
  );
}
