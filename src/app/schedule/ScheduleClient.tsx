"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Users,
  AlertTriangle,
  MapPin,
  Clock,
  Filter,
  Check,
  X,
} from "lucide-react";
import type { Event, StaffMember } from "@/types";

// ---------- types ----------

interface AssignmentWithStaff {
  id: string;
  staff_member_id: string;
  event_id: string;
  role: string | null;
  start_time: string | null;
  end_time: string | null;
  confirmed: boolean;
  notes: string | null;
  created_at: string;
  staff_members: { id: string; name: string; role: string; email: string | null; phone: string | null } | null;
}

type ViewMode = "month" | "week" | "day";

interface Props {
  events: Event[];
  assignments: AssignmentWithStaff[];
  staffMembers: StaffMember[];
  isPro: boolean;
}

// ---------- constants ----------

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-gray-600/30", text: "text-gray-300", dot: "bg-gray-400" },
  proposed: { bg: "bg-blue-600/30", text: "text-blue-300", dot: "bg-blue-400" },
  confirmed: { bg: "bg-green-600/30", text: "text-green-300", dot: "bg-green-400" },
  completed: { bg: "bg-blue-500/30", text: "text-blue-300", dot: "bg-blue-400" },
  canceled: { bg: "bg-red-600/30", text: "text-red-300", dot: "bg-red-400" },
};

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm

function timeToHour(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

function formatTime12(timeStr: string): string {
  try {
    return format(new Date(`2000-01-01T${timeStr}`), "h:mm a");
  } catch {
    return timeStr;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---------- component ----------

export function ScheduleClient({ events, assignments, staffMembers, isPro }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [showStaffFilter, setShowStaffFilter] = useState(false);

  // ---- filtering by selected staff (must be before any early return for hooks rules) ----
  const filteredEvents = useMemo(() => {
    if (selectedStaffIds.size === 0) return events;
    const eventIdsWithStaff = new Set(
      assignments
        .filter((a) => selectedStaffIds.has(a.staff_member_id))
        .map((a) => a.event_id)
    );
    return events.filter((e) => eventIdsWithStaff.has(e.id));
  }, [events, assignments, selectedStaffIds]);

  // Pro gate
  if (!isPro) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">Pro Feature</h2>
          <p className="text-sm text-[#D4A373] mb-6">
            Calendar scheduling is available on the Pro plan. Upgrade to access the visual calendar and advanced scheduling features.
          </p>
          <Link href="/billing" className="btn-primary inline-flex items-center gap-2">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  // ---- helpers ----
  const eventsForDay = (day: Date) =>
    filteredEvents.filter((e) => isSameDay(new Date(e.event_date), day));

  const assignmentsForEvent = (eventId: string) =>
    assignments.filter((a) => a.event_id === eventId);

  // ---- navigation ----
  function navigateBack() {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  }

  function navigateForward() {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function getHeaderLabel(): string {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, "MMM d")} - ${format(we, "d, yyyy")}`;
      }
      return `${format(ws, "MMM d")} - ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }

  // ---- summary stats ----
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthEvents = events.filter((e) => {
    const d = new Date(e.event_date);
    return d >= monthStart && d <= monthEnd;
  });
  const monthAssignedEventIds = new Set(
    assignments
      .filter((a) => monthEvents.some((e) => e.id === a.event_id))
      .map((a) => a.event_id)
  );
  const monthUnassignedCount = monthEvents.filter(
    (e) => !monthAssignedEventIds.has(e.id)
  ).length;
  const monthAssignedStaffIds = new Set(
    assignments
      .filter((a) => monthEvents.some((e) => e.id === a.event_id))
      .map((a) => a.staff_member_id)
  );

  // ---- staff filter toggle ----
  function toggleStaffFilter(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearStaffFilter() {
    setSelectedStaffIds(new Set());
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-[#D4A373] mt-1">Staff scheduling calendar</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Staff Filter Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowStaffFilter(!showStaffFilter)}
              className={`btn-secondary flex items-center gap-2 text-sm ${
                selectedStaffIds.size > 0 ? "border-[#D4A373] text-[#D4A373]" : ""
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectedStaffIds.size > 0
                  ? `${selectedStaffIds.size} staff`
                  : "Filter Staff"}
              </span>
            </button>

            {showStaffFilter && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowStaffFilter(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-40 w-64 card p-3 shadow-xl max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#7A8BA8] uppercase tracking-wider">
                      Filter by Staff
                    </span>
                    {selectedStaffIds.size > 0 && (
                      <button
                        onClick={clearStaffFilter}
                        className="text-xs text-[#D4A373] hover:text-[#F4F1ED] transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {staffMembers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleStaffFilter(s.id)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#1A2538] transition-colors text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            selectedStaffIds.has(s.id)
                              ? "bg-[#D4A373] border-[#D4A373]"
                              : "border-[#2A3A5C]"
                          }`}
                        >
                          {selectedStaffIds.has(s.id) && (
                            <Check className="w-3 h-3 text-[#0C1220]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{s.name}</div>
                          <div className="text-[10px] text-[#7A8BA8]">{s.role}</div>
                        </div>
                      </button>
                    ))}
                    {staffMembers.length === 0 && (
                      <p className="text-xs text-[#7A8BA8] text-center py-4">
                        No staff members yet
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/events/new"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event</span>
          </Link>
        </div>
      </div>

      {/* View Toggle + Navigation */}
      <div className="card p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* View Mode Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-[#2A3A5C]">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  viewMode === mode
                    ? "bg-[#1A2538] text-[#F4F1ED]"
                    : "bg-[#0C1220] text-[#7A8BA8] hover:text-[#F4F1ED]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={navigateBack} className="btn-ghost p-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="btn-secondary text-sm px-3"
            >
              Today
            </button>
            <button onClick={navigateForward} className="btn-ghost p-2">
              <ChevronRight className="w-5 h-5" />
            </button>
            <h2 className="font-display text-lg font-semibold ml-2 whitespace-nowrap">
              {getHeaderLabel()}
            </h2>
          </div>
        </div>

        {/* Active staff filter chips */}
        {selectedStaffIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-[#7A8BA8]">Showing events for:</span>
            {staffMembers
              .filter((s) => selectedStaffIds.has(s.id))
              .map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#1A2538] border border-[#2A3A5C] text-[#D4A373]"
                >
                  {s.name}
                  <button
                    onClick={() => toggleStaffFilter(s.id)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            <button
              onClick={clearStaffFilter}
              className="text-xs text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Calendar Views */}
        {viewMode === "month" && (
          <MonthView
            currentDate={currentDate}
            eventsForDay={eventsForDay}
            assignmentsForEvent={assignmentsForEvent}
            onSelectDay={(day) => {
              setCurrentDate(day);
              setViewMode("day");
            }}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            currentDate={currentDate}
            eventsForDay={eventsForDay}
            assignmentsForEvent={assignmentsForEvent}
          />
        )}
        {viewMode === "day" && (
          <DayView
            currentDate={currentDate}
            eventsForDay={eventsForDay}
            assignmentsForEvent={assignmentsForEvent}
          />
        )}
      </div>

      {/* Summary Bar */}
      <div className="mt-4 card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-[#7A8BA8]">
          <span className="font-semibold text-[#F4F1ED]">{monthEvents.length}</span>{" "}
          event{monthEvents.length !== 1 ? "s" : ""} this month
        </span>
        <span className="text-[#2A3A5C]">|</span>
        <span className="text-[#7A8BA8]">
          <span className="font-semibold text-[#F4F1ED]">{monthAssignedStaffIds.size}</span>{" "}
          staff assigned
        </span>
        <span className="text-[#2A3A5C]">|</span>
        <span className="text-[#7A8BA8]">
          <span className={`font-semibold ${monthUnassignedCount > 0 ? "text-orange-400" : "text-green-400"}`}>
            {monthUnassignedCount}
          </span>{" "}
          unassigned event{monthUnassignedCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ==================== MONTH VIEW ====================

function MonthView({
  currentDate,
  eventsForDay,
  assignmentsForEvent,
  onSelectDay,
}: {
  currentDate: Date;
  eventsForDay: (day: Date) => Event[];
  assignmentsForEvent: (eventId: string) => AssignmentWithStaff[];
  onSelectDay: (day: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs text-[#7A8BA8] font-medium py-2"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day[0]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day) => {
          const dayEvents = eventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`
                min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 rounded-lg border transition-all text-left flex flex-col
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isToday ? "border-[#D4A373] shadow-[0_0_0_1px_#D4A373]" : "border-[#2A3A5C]/50"}
                hover:bg-[#1A2538] hover:border-[#2A3A5C]
              `}
            >
              <div
                className={`text-xs md:text-sm font-medium mb-1 ${
                  isToday ? "text-[#D4A373]" : "text-[#7A8BA8]"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => {
                  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
                  const eventAssignments = assignmentsForEvent(event.id);
                  return (
                    <div key={event.id} className="group relative">
                      <Link
                        href={`/events/${event.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`block text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate ${colors.bg} ${colors.text} hover:brightness-125 transition-all`}
                      >
                        <span className="flex items-center gap-1">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`}
                          />
                          <span className="truncate">{event.name}</span>
                          {eventAssignments.length > 0 && (
                            <span className="ml-auto flex-shrink-0 opacity-70">
                              <Users className="w-2.5 h-2.5 inline" />
                              <span className="ml-0.5">{eventAssignments.length}</span>
                            </span>
                          )}
                        </span>
                      </Link>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-[#7A8BA8] px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== WEEK VIEW ====================

function WeekView({
  currentDate,
  eventsForDay,
  assignmentsForEvent,
}: {
  currentDate: Date;
  eventsForDay: (day: Date) => Event[];
  assignmentsForEvent: (eventId: string) => AssignmentWithStaff[];
}) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate),
  });
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0 border-b border-[#2A3A5C] mb-0">
          <div className="p-2" />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`text-center py-2 border-l border-[#2A3A5C]/50 ${
                  isToday ? "bg-[#D4A373]/5" : ""
                }`}
              >
                <div className="text-[10px] text-[#7A8BA8] uppercase">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    isToday ? "text-[#D4A373]" : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)] gap-0">
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-14 border-b border-[#2A3A5C]/30 flex items-start justify-end pr-2 pt-0.5"
              >
                <span className="text-[10px] text-[#7A8BA8]">
                  {format(new Date(2000, 0, 1, hour), "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = eventsForDay(day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-[#2A3A5C]/50 ${
                  isToday ? "bg-[#D4A373]/5" : ""
                }`}
              >
                {/* Hour gridlines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-14 border-b border-[#2A3A5C]/30"
                  />
                ))}

                {/* Event blocks */}
                {dayEvents.map((event) => {
                  const startHour = event.start_time
                    ? timeToHour(event.start_time)
                    : 9;
                  const endHour = event.end_time
                    ? timeToHour(event.end_time)
                    : startHour + 2;
                  const topOffset = (startHour - 6) * 56; // 56px = h-14
                  const height = Math.max((endHour - startHour) * 56, 28);
                  const colors =
                    STATUS_COLORS[event.status] || STATUS_COLORS.draft;
                  const eventAssignments = assignmentsForEvent(event.id);

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden ${colors.bg} border-l-2 hover:brightness-125 transition-all z-10`}
                      style={{
                        top: `${topOffset}px`,
                        height: `${height}px`,
                        borderLeftColor:
                          event.status === "confirmed"
                            ? "#22c55e"
                            : event.status === "canceled"
                            ? "#ef4444"
                            : event.status === "completed"
                            ? "#3b82f6"
                            : event.status === "draft"
                            ? "#6b7280"
                            : "#3b82f6",
                      }}
                    >
                      <div className={`text-[10px] font-medium truncate ${colors.text}`}>
                        {event.name}
                      </div>
                      {height >= 40 && event.start_time && (
                        <div className="text-[9px] text-[#7A8BA8] mt-0.5">
                          {formatTime12(event.start_time)}
                          {event.end_time && ` - ${formatTime12(event.end_time)}`}
                        </div>
                      )}
                      {height >= 56 && eventAssignments.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                          {eventAssignments.slice(0, 4).map((a) => (
                            <div
                              key={a.id}
                              className="w-4 h-4 rounded-full bg-[#2A3A5C] border border-[#0C1220] flex items-center justify-center"
                              title={a.staff_members?.name || "Unknown"}
                            >
                              <span className="text-[7px] text-[#D4A373] font-medium">
                                {getInitials(a.staff_members?.name || "?")}
                              </span>
                            </div>
                          ))}
                          {eventAssignments.length > 4 && (
                            <span className="text-[8px] text-[#7A8BA8]">
                              +{eventAssignments.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== DAY VIEW ====================

function DayView({
  currentDate,
  eventsForDay,
  assignmentsForEvent,
}: {
  currentDate: Date;
  eventsForDay: (day: Date) => Event[];
  assignmentsForEvent: (eventId: string) => AssignmentWithStaff[];
}) {
  const dayEvents = eventsForDay(currentDate);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  // Sort events by start_time
  const sortedEvents = [...dayEvents].sort((a, b) => {
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div>
      {/* Day header accent */}
      {isToday && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#D4A373]/10 border border-[#D4A373]/30 text-sm text-[#D4A373] font-medium">
          Today
        </div>
      )}

      {sortedEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-[#1A2538] border border-[#2A3A5C] flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-6 h-6 text-[#7A8BA8]" />
          </div>
          <p className="text-sm text-[#7A8BA8] mb-3">
            No events on {format(currentDate, "MMMM d, yyyy")}
          </p>
          <Link
            href={`/events/new?date=${format(currentDate, "yyyy-MM-dd")}`}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event) => {
            const colors =
              STATUS_COLORS[event.status] || STATUS_COLORS.draft;
            const eventAssignments = assignmentsForEvent(event.id);

            return (
              <div
                key={event.id}
                className="card p-0 overflow-hidden border-l-4"
                style={{
                  borderLeftColor:
                    event.status === "confirmed"
                      ? "#22c55e"
                      : event.status === "canceled"
                      ? "#ef4444"
                      : event.status === "completed"
                      ? "#3b82f6"
                      : event.status === "draft"
                      ? "#6b7280"
                      : "#3b82f6",
                }}
              >
                <Link
                  href={`/events/${event.id}`}
                  className="block p-5 hover:bg-[#1A2538]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-base font-semibold truncate">
                          {event.name}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${colors.bg} ${colors.text}`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#D4A373]">
                        <span>{event.client_name}</span>
                        {event.venue && (
                          <span className="flex items-center gap-1 text-[#7A8BA8]">
                            <MapPin className="w-3 h-3" />
                            {event.venue}
                          </span>
                        )}
                        {(event.start_time || event.end_time) && (
                          <span className="flex items-center gap-1 text-[#7A8BA8]">
                            <Clock className="w-3 h-3" />
                            {event.start_time && formatTime12(event.start_time)}
                            {event.start_time && event.end_time && " - "}
                            {event.end_time && formatTime12(event.end_time)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[#7A8BA8]">
                          <Users className="w-3 h-3" />
                          {event.guest_count} guests
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Staff assignments */}
                {eventAssignments.length > 0 && (
                  <div className="px-5 pb-4 pt-0">
                    <div className="border-t border-[#2A3A5C] pt-3">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Users className="w-3.5 h-3.5 text-[#7A8BA8]" />
                        <span className="text-xs text-[#7A8BA8] font-medium">
                          Assigned Staff ({eventAssignments.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {eventAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#0C1220]/50"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#2A3A5C] flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-medium text-[#D4A373]">
                                {getInitials(a.staff_members?.name || "?")}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {a.staff_members?.name || "Unknown"}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#7A8BA8]">
                                {a.role && <span>{a.role}</span>}
                                {a.start_time && (
                                  <span>
                                    {formatTime12(a.start_time)}
                                    {a.end_time && ` - ${formatTime12(a.end_time)}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                a.confirmed ? "bg-green-400" : "bg-gray-500"
                              }`}
                              title={a.confirmed ? "Confirmed" : "Unconfirmed"}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {eventAssignments.length === 0 && (
                  <div className="px-5 pb-4 pt-0">
                    <div className="border-t border-[#2A3A5C] pt-3">
                      <div className="flex items-center gap-2 text-xs text-orange-400/80">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No staff assigned to this event
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Simple calendar icon for empty state (avoids importing from lucide since Calendar is already used)
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
