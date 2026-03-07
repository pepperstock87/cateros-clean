"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Lock, X, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Event, UserEntitlements } from "@/types";

interface StaffAssignment {
  id: string;
  staff_member_id: string;
  event_id: string;
  role: string;
  start_time: string | null;
  end_time: string | null;
  confirmed: boolean;
  staff_members: { name: string } | null;
}

export default function SchedulePage() {
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      fetch("/api/entitlements").then(r => r.json()),
      supabase.from("events").select("*").order("event_date"),
      supabase
        .from("event_staff_assignments")
        .select("id, staff_member_id, event_id, role, start_time, end_time, confirmed, staff_members(name)")
        .order("created_at"),
    ]).then(([ent, { data: eventsData }, { data: assignmentsData }]) => {
      setEntitlements(ent);
      setEvents(eventsData || []);
      setAssignments((assignmentsData as unknown as StaffAssignment[]) || []);
    });
  }, []);

  const isPro = entitlements?.isPro || false;

  if (!isPro && entitlements) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">Pro Feature</h2>
          <p className="text-sm text-[#9c8876] mb-6">
            Calendar scheduling is available on the Pro plan. Upgrade to access the visual calendar and advanced scheduling features.
          </p>
          <Link href="/billing" className="btn-primary inline-flex items-center gap-2">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const calendarDays = [...Array(firstDayOfWeek).fill(null), ...daysInMonth];

  const eventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.event_date), day));
  };

  const assignmentsForEvent = (eventId: string): StaffAssignment[] => {
    return assignments.filter(a => a.event_id === eventId);
  };

  const conflictsForDay = (day: Date): { staffName: string; staffMemberId: string }[] => {
    const dayEvents = eventsForDay(day);
    if (dayEvents.length < 2) return [];

    const dayEventIds = new Set(dayEvents.map(e => e.id));
    const dayAssignments = assignments.filter(a => dayEventIds.has(a.event_id));

    // Group by staff_member_id
    const staffEventMap = new Map<string, { name: string; eventIds: Set<string> }>();
    for (const a of dayAssignments) {
      const existing = staffEventMap.get(a.staff_member_id);
      if (existing) {
        existing.eventIds.add(a.event_id);
      } else {
        staffEventMap.set(a.staff_member_id, {
          name: a.staff_members?.name || "Unknown",
          eventIds: new Set([a.event_id]),
        });
      }
    }

    const conflicts: { staffName: string; staffMemberId: string }[] = [];
    for (const [staffMemberId, entry] of staffEventMap) {
      if (entry.eventIds.size > 1) {
        conflicts.push({ staffName: entry.name, staffMemberId });
      }
    }
    return conflicts;
  };

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];
  const selectedDayConflicts = selectedDay ? conflictsForDay(selectedDay) : [];

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-600 text-gray-200",
    proposed: "bg-blue-600 text-blue-100",
    confirmed: "bg-green-600 text-green-100",
    completed: "bg-purple-600 text-purple-100",
    canceled: "bg-red-600 text-red-100",
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-[#9c8876] mt-1">Calendar view of your events</p>
        </div>
        <Link href="/events/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Event</span>
        </Link>
      </div>

      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="btn-ghost p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-secondary text-sm px-3"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="btn-ghost p-2"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-xs md:text-sm text-[#6b5a4a] font-medium py-2">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day[0]}</span>
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

            const dayEvents = eventsForDay(day);
            const dayConflicts = conflictsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`
                  aspect-square p-1 md:p-2 rounded-lg border transition-all text-left relative
                  ${!isSameMonth(day, currentDate) ? "opacity-30" : ""}
                  ${isToday ? "border-brand-400 bg-brand-950" : "border-[#2e271f]"}
                  ${isSelected ? "bg-brand-900 border-brand-400" : "hover:bg-[#1c1814]"}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-xs md:text-sm font-medium mb-1 ${isToday ? "text-brand-300" : ""}`}>
                    {format(day, "d")}
                  </div>
                  {dayConflicts.length > 0 && (
                    <div className="w-2 h-2 rounded-full bg-orange-400 mb-1" title="Scheduling conflict" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(event => {
                    const eventAssignments = assignmentsForEvent(event.id);
                    return (
                      <div key={event.id}>
                        <div
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${STATUS_COLORS[event.status]}`}
                        >
                          {event.name}
                        </div>
                        {eventAssignments.length > 0 && (
                          <div className="flex items-center gap-0.5 px-1 text-[10px] text-[#6b5a4a]">
                            <Users className="w-2.5 h-2.5" />
                            <span>{eventAssignments.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-[#6b5a4a]">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDay(null)}>
          <div className="card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display text-xl font-semibold">{format(selectedDay, "MMMM d, yyyy")}</h3>
                <p className="text-sm text-[#9c8876]">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="btn-ghost p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDayConflicts.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-orange-400/10 border border-orange-400/30">
                <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Scheduling conflict
                </div>
                {selectedDayConflicts.map(c => (
                  <p key={c.staffMemberId} className="text-xs text-orange-400/80 ml-6">
                    {c.staffName} is assigned to multiple events on this day
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-[#6b5a4a] text-center py-8">No events on this day</p>
              ) : (
                selectedDayEvents.map(event => {
                  const eventAssignments = assignmentsForEvent(event.id);
                  return (
                    <div key={event.id} className="card p-4">
                      <Link
                        href={`/events/${event.id}`}
                        className="block hover:bg-[#1c1814] transition-colors -m-4 p-4 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{event.name}</h4>
                            <p className="text-sm text-[#9c8876]">{event.client_name}</p>
                            {(event.start_time || event.end_time) && (
                              <p className="text-xs text-[#6b5a4a] mt-1">
                                {event.start_time && format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")}
                                {event.start_time && event.end_time && " - "}
                                {event.end_time && format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[event.status]}`}>
                            {event.status}
                          </span>
                        </div>
                      </Link>

                      {eventAssignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#2e271f]">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Users className="w-3.5 h-3.5 text-[#6b5a4a]" />
                            <span className="text-xs text-[#6b5a4a] font-medium">
                              Staff ({eventAssignments.length})
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {eventAssignments.map(a => {
                              const isConflict = selectedDayConflicts.some(
                                c => c.staffMemberId === a.staff_member_id
                              );
                              return (
                                <div key={a.id} className="flex items-center gap-2">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      a.confirmed ? "bg-green-400" : "bg-gray-500"
                                    }`}
                                    title={a.confirmed ? "Confirmed" : "Not confirmed"}
                                  />
                                  <span className="text-[10px] text-[#6b5a4a] truncate">
                                    {a.staff_members?.name || "Unknown"}
                                  </span>
                                  {a.role && (
                                    <span className="text-[10px] text-[#6b5a4a]/60">
                                      ({a.role})
                                    </span>
                                  )}
                                  {(a.start_time || a.end_time) && (
                                    <span className="text-[10px] text-[#6b5a4a]/60 ml-auto flex-shrink-0">
                                      {a.start_time && format(new Date(`2000-01-01T${a.start_time}`), "h:mm a")}
                                      {a.start_time && a.end_time && " - "}
                                      {a.end_time && format(new Date(`2000-01-01T${a.end_time}`), "h:mm a")}
                                    </span>
                                  )}
                                  {isConflict && (
                                    <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <Link
              href={`/events/new?date=${format(selectedDay, "yyyy-MM-dd")}`}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Event on {format(selectedDay, "MMM d")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
