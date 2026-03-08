"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { Users, Clock } from "lucide-react";
import { DashboardViewToggle } from "./DashboardViewToggle";
import { addDays, endOfWeek, endOfMonth } from "date-fns";

const STATUS_CLASSES: Record<string, string> = {
  draft: "badge-draft",
  proposed: "badge-proposed",
  confirmed: "badge-confirmed",
  completed: "badge-completed",
  canceled: "badge-canceled",
};

interface TimelineEvent {
  id: string;
  name: string;
  client_name: string;
  event_date: string;
  start_time: string | null;
  status: string;
  guest_count: number;
}

interface UpcomingEventsTimelineProps {
  events: TimelineEvent[];
}

type DateGroup = {
  label: string;
  events: TimelineEvent[];
};

function groupEventsByDate(events: TimelineEvent[]): DateGroup[] {
  const groups: Record<string, TimelineEvent[]> = {
    Today: [],
    Tomorrow: [],
    "This Week": [],
    Later: [],
  };

  for (const event of events) {
    const date = parseISO(event.event_date);
    if (isToday(date)) {
      groups["Today"].push(event);
    } else if (isTomorrow(date)) {
      groups["Tomorrow"].push(event);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      groups["This Week"].push(event);
    } else {
      groups["Later"].push(event);
    }
  }

  return Object.entries(groups)
    .filter(([, evts]) => evts.length > 0)
    .map(([label, evts]) => ({ label, events: evts }));
}

function filterByView(events: TimelineEvent[], view: string): TimelineEvent[] {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  switch (view) {
    case "today":
      return events.filter(e => e.event_date.startsWith(todayStr));
    case "week":
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      return events.filter(e => e.event_date <= weekEnd);
    case "month":
      const monthEnd = endOfMonth(now).toISOString();
      return events.filter(e => e.event_date <= monthEnd);
    case "all":
    default:
      return events;
  }
}

export function UpcomingEventsTimeline({ events }: UpcomingEventsTimelineProps) {
  const [view, setView] = useState("all");

  const filtered = filterByView(events, view).slice(0, 10);
  const grouped = groupEventsByDate(filtered);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider">
          Upcoming Events
        </h2>
        <DashboardViewToggle activeView={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#7A8BA8]">No events in this time range</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] md:text-xs font-semibold text-[#D4A373] uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-[#2A3A5C]" />
                <span className="text-[10px] text-[#7A8BA8]">{group.events.length}</span>
              </div>

              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[#2A3A5C]" />

                <div className="space-y-2">
                  {group.events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#1A2538] transition-colors border border-[#2A3A5C] relative ml-0"
                    >
                      {/* Timeline dot */}
                      <div className="w-[14px] h-[14px] rounded-full border-2 border-[#2A3A5C] bg-[#182030] flex-shrink-0 mt-0.5 relative z-10 flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          event.status === "confirmed" ? "bg-green-400" :
                          event.status === "proposed" ? "bg-blue-400" :
                          event.status === "draft" ? "bg-[#D4A373]" :
                          "bg-[#7A8BA8]"
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-xs md:text-sm truncate text-[#F4F1ED]">
                            {event.name}
                          </span>
                          <span className={`${STATUS_CLASSES[event.status]} text-[10px] md:text-xs whitespace-nowrap flex-shrink-0`}>
                            {event.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] md:text-xs text-[#7A8BA8]">
                          <span className="font-medium text-[#D4A373]">
                            {format(parseISO(event.event_date), "EEE, MMM d")}
                          </span>
                          {event.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.start_time}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.guest_count}
                          </span>
                          <span className="truncate">{event.client_name}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
