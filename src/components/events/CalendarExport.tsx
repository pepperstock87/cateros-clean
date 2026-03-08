"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, Download, ExternalLink, ChevronDown } from "lucide-react";
import { buildGoogleCalendarURL } from "@/lib/calendar";
import type { Event } from "@/types";

interface CalendarExportProps {
  event: {
    id: string;
    name: string;
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
    client_name?: string | null;
    client_email?: string | null;
    notes?: string | null;
    guest_count?: number;
    status?: string;
  };
}

export function CalendarExport({ event }: CalendarExportProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownloadICS = () => {
    // Download via the API endpoint which generates the ICS server-side
    window.location.href = `/api/events/${event.id}/ics`;
    setOpen(false);
  };

  const handleGoogleCalendar = () => {
    const url = buildGoogleCalendarURL(event as Event);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="btn-secondary flex items-center gap-2"
        title="Add to Calendar"
      >
        <CalendarPlus className="w-4 h-4" />
        Add to Calendar
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="py-1">
            <button
              onClick={handleDownloadICS}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Download className="w-4 h-4" />
              Download .ics
            </button>
            <button
              onClick={handleGoogleCalendar}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              Add to Google Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
