"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { EventFilters, type EventFilterState } from "./EventFilters";
import { EventsTable } from "./EventsTable";
import type { Event } from "@/types";

type Props = {
  events: Event[];
  companyName?: string;
};

function getQuarterRange(date: Date): { start: Date; end: Date } {
  const month = date.getMonth();
  const quarterStart = month - (month % 3);
  const start = new Date(date.getFullYear(), quarterStart, 1);
  const end = new Date(date.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

function filterByDateRange(events: Event[], dateRange: string): Event[] {
  if (dateRange === "all") return events;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (dateRange) {
    case "upcoming":
      return events.filter((e) => new Date(e.event_date) >= today);
    case "past":
      return events.filter((e) => new Date(e.event_date) < today);
    case "this_month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      return events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= monthStart && d <= monthEnd;
      });
    }
    case "this_quarter": {
      const { start, end } = getQuarterRange(today);
      return events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= start && d <= end;
      });
    }
    default:
      return events;
  }
}

export function FilteredEventsView({ events, companyName }: Props) {
  const searchParams = useSearchParams();
  const clientParam = searchParams.get("client") ?? "";

  const [filters, setFilters] = useState<EventFilterState>({
    search: clientParam,
    status: "all",
    dateRange: "all",
  });

  const handleFilterChange = useCallback((newFilters: EventFilterState) => {
    setFilters(newFilters);
  }, []);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((e) => e.status === filters.status);
    }

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.client_name.toLowerCase().includes(q) ||
          (e.venue && e.venue.toLowerCase().includes(q))
      );
    }

    // Date range filter
    result = filterByDateRange(result, filters.dateRange);

    return result;
  }, [events, filters]);

  return (
    <div>
      <EventFilters onFilterChange={handleFilterChange} initialSearch={clientParam} />

      <p className="text-sm text-[#9c8876] mb-4">
        Showing {filteredEvents.length} of {events.length} events
      </p>

      {filteredEvents.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#6b5a4a] text-sm">No events match your filters.</p>
        </div>
      ) : (
        <EventsTable events={filteredEvents} />
      )}
    </div>
  );
}
