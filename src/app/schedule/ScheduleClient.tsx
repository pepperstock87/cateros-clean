"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  differenceInMinutes, parseISO,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Lock, Users, AlertTriangle, MapPin, Clock,
  Filter, Check, X, DollarSign, Briefcase, BarChart3,
} from "lucide-react";
import { safeParseDate } from "@/lib/utils";
import type { Event, StaffMember } from "@/types";

// ---------- types ----------

interface StaffDetail {
  id: string; name: string; role: string; email: string | null; phone: string | null;
  hourly_rate: number; pay_type: string;
}

interface AssignmentWithStaff {
  id: string; staff_member_id: string; event_id: string; role: string | null;
  start_time: string | null; end_time: string | null; confirmed: boolean;
  notes: string | null; created_at: string;
  staff_members: StaffDetail | null;
}

type ViewMode = "workforce" | "month" | "week" | "day";

interface Props {
  events: Event[];
  assignments: AssignmentWithStaff[];
  staffMembers: StaffMember[];
  isPro: boolean;
}

// ---------- constants ----------

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  draft: { bg: "bg-gray-600/30", text: "text-gray-300", dot: "bg-gray-400", border: "#6b7280" },
  proposed: { bg: "bg-blue-600/30", text: "text-blue-300", dot: "bg-blue-400", border: "#3b82f6" },
  confirmed: { bg: "bg-green-600/30", text: "text-green-300", dot: "bg-green-400", border: "#22c55e" },
  completed: { bg: "bg-blue-500/30", text: "text-blue-300", dot: "bg-blue-400", border: "#3b82f6" },
  canceled: { bg: "bg-red-600/30", text: "text-red-300", dot: "bg-red-400", border: "#ef4444" },
};

const EVENT_COLORS = [
  "bg-brand-600/40 border-brand-500/60 text-brand-200",
  "bg-blue-600/40 border-blue-500/60 text-blue-200",
  "bg-green-600/40 border-green-500/60 text-green-200",
  "bg-purple-600/40 border-purple-500/60 text-purple-200",
  "bg-amber-600/40 border-amber-500/60 text-amber-200",
  "bg-pink-600/40 border-pink-500/60 text-pink-200",
  "bg-teal-600/40 border-teal-500/60 text-teal-200",
  "bg-orange-600/40 border-orange-500/60 text-orange-200",
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function timeToHour(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

function formatTime12(timeStr: string): string {
  try { return format(new Date(`2000-01-01T${timeStr}`), "h:mm a"); } catch { return timeStr; }
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function calcShiftHours(startTime: string | null, endTime: string | null, eventStart?: string | null, eventEnd?: string | null): number {
  const s = startTime || eventStart;
  const e = endTime || eventEnd;
  if (!s || !e) return 8; // default 8 hours if no times
  try {
    const start = new Date(`2000-01-01T${s}`);
    const end = new Date(`2000-01-01T${e}`);
    const mins = differenceInMinutes(end, start);
    return mins > 0 ? mins / 60 : 8;
  } catch { return 8; }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatPay(rate: number, payType: string | undefined): string {
  if (payType === "salary") {
    return `${formatCurrency(rate)}/yr`;
  }
  return `${formatCurrency(rate)}/hr`;
}

// ---------- component ----------

export function ScheduleClient({ events, assignments, staffMembers, isPro }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("workforce");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [showStaffFilter, setShowStaffFilter] = useState(false);

  const filteredEvents = useMemo(() => {
    if (selectedStaffIds.size === 0) return events;
    const eventIdsWithStaff = new Set(
      assignments.filter((a) => selectedStaffIds.has(a.staff_member_id)).map((a) => a.event_id)
    );
    return events.filter((e) => eventIdsWithStaff.has(e.id));
  }, [events, assignments, selectedStaffIds]);

  // Build event color map for consistent coloring
  const eventColorMap = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e, i) => map.set(e.id, EVENT_COLORS[i % EVENT_COLORS.length]));
    return map;
  }, [events]);

  // Pro gate
  if (!isPro) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">Pro Feature</h2>
          <p className="text-sm text-[#D4A373] mb-6">The Workforce Engine is available on the Pro plan.</p>
          <Link href="/billing" className="btn-primary inline-flex items-center gap-2">Upgrade to Pro</Link>
        </div>
      </div>
    );
  }

  // ---- helpers ----
  const eventsForDay = (day: Date) => filteredEvents.filter((e) => isSameDay(safeParseDate(e.event_date), day));
  const assignmentsForEvent = (eventId: string) => assignments.filter((a) => a.event_id === eventId);
  const assignmentsForStaff = (staffId: string) => assignments.filter((a) => a.staff_member_id === staffId);

  // ---- navigation ----
  function navigateBack() {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "workforce" || viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  }
  function navigateForward() {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "workforce" || viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  }
  function goToToday() { setCurrentDate(new Date()); }
  function getHeaderLabel(): string {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "workforce" || viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      if (ws.getMonth() === we.getMonth()) return `${format(ws, "MMM d")} - ${format(we, "d, yyyy")}`;
      return `${format(ws, "MMM d")} - ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }

  // ---- labor cost calculations ----
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyStats = useMemo(() => {
    const weekEvents = events.filter((e) => {
      const d = safeParseDate(e.event_date);
      return d >= weekStart && d <= weekEnd;
    });
    const weekEventIds = new Set(weekEvents.map((e) => e.id));
    const weekAssignments = assignments.filter((a) => weekEventIds.has(a.event_id));

    let totalHours = 0;
    let totalCost = 0;
    const perStaff = new Map<string, { hours: number; cost: number; shifts: number }>();
    const perEvent = new Map<string, { hours: number; cost: number; staff: number }>();
    const perDay = new Map<string, { hours: number; cost: number; events: number; staff: Set<string> }>();

    for (const a of weekAssignments) {
      const event = weekEvents.find((e) => e.id === a.event_id);
      const rate = a.staff_members?.hourly_rate || 25;
      const hours = calcShiftHours(a.start_time, a.end_time, event?.start_time, event?.end_time);
      const cost = rate * hours;
      totalHours += hours;
      totalCost += cost;

      // Per staff
      const staffEntry = perStaff.get(a.staff_member_id) || { hours: 0, cost: 0, shifts: 0 };
      staffEntry.hours += hours;
      staffEntry.cost += cost;
      staffEntry.shifts += 1;
      perStaff.set(a.staff_member_id, staffEntry);

      // Per event
      const eventEntry = perEvent.get(a.event_id) || { hours: 0, cost: 0, staff: 0 };
      eventEntry.hours += hours;
      eventEntry.cost += cost;
      eventEntry.staff += 1;
      perEvent.set(a.event_id, eventEntry);

      // Per day
      if (event) {
        const dayKey = format(safeParseDate(event.event_date), "yyyy-MM-dd");
        const dayEntry = perDay.get(dayKey) || { hours: 0, cost: 0, events: 0, staff: new Set<string>() };
        dayEntry.hours += hours;
        dayEntry.cost += cost;
        dayEntry.staff.add(a.staff_member_id);
        perDay.set(dayKey, dayEntry);
      }
    }

    // Count unique events per day
    for (const e of weekEvents) {
      const dayKey = format(safeParseDate(e.event_date), "yyyy-MM-dd");
      const dayEntry = perDay.get(dayKey) || { hours: 0, cost: 0, events: 0, staff: new Set<string>() };
      dayEntry.events += 1;
      perDay.set(dayKey, dayEntry);
    }

    return {
      totalHours, totalCost,
      eventCount: weekEvents.length,
      staffCount: perStaff.size,
      unassignedCount: weekEvents.filter((e) => !weekAssignments.some((a) => a.event_id === e.id)).length,
      perStaff, perEvent, perDay,
    };
  }, [events, assignments, weekStart, weekEnd]);

  // Staff filter toggles
  function toggleStaffFilter(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearStaffFilter() { setSelectedStaffIds(new Set()); }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Workforce</h1>
          <p className="text-sm text-[#D4A373] mt-1">Staff scheduling & labor planning</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Staff Filter */}
          <div className="relative">
            <button
              onClick={() => setShowStaffFilter(!showStaffFilter)}
              className={`btn-secondary flex items-center gap-2 text-sm ${selectedStaffIds.size > 0 ? "border-[#D4A373] text-[#D4A373]" : ""}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{selectedStaffIds.size > 0 ? `${selectedStaffIds.size} staff` : "Filter Staff"}</span>
            </button>
            {showStaffFilter && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowStaffFilter(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-64 card p-3 shadow-xl max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#7A8BA8] uppercase tracking-wider">Filter by Staff</span>
                    {selectedStaffIds.size > 0 && (
                      <button onClick={clearStaffFilter} className="text-xs text-[#D4A373] hover:text-[#F4F1ED] transition-colors">Clear all</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {staffMembers.map((s) => (
                      <button key={s.id} onClick={() => toggleStaffFilter(s.id)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#1A2538] transition-colors text-left">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedStaffIds.has(s.id) ? "bg-[#D4A373] border-[#D4A373]" : "border-[#2A3A5C]"}`}>
                          {selectedStaffIds.has(s.id) && <Check className="w-3 h-3 text-[#0C1220]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{s.name}</div>
                          <div className="text-[10px] text-[#7A8BA8]">{s.role} &middot; {formatPay(s.hourly_rate, s.pay_type)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <Link href="/events/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Event</span>
          </Link>
        </div>
      </div>

      {/* View Toggle + Navigation */}
      <div className="card p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex rounded-lg overflow-hidden border border-[#2A3A5C]">
            {(["workforce", "month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors capitalize ${
                  viewMode === mode ? "bg-[#1A2538] text-[#F4F1ED]" : "bg-[#0C1220] text-[#7A8BA8] hover:text-[#F4F1ED]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={navigateBack} className="btn-ghost p-2"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={goToToday} className="btn-secondary text-sm px-3">Today</button>
            <button onClick={navigateForward} className="btn-ghost p-2"><ChevronRight className="w-5 h-5" /></button>
            <h2 className="font-display text-lg font-semibold ml-2 whitespace-nowrap">{getHeaderLabel()}</h2>
          </div>
        </div>

        {/* Active filter chips */}
        {selectedStaffIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-[#7A8BA8]">Showing:</span>
            {staffMembers.filter((s) => selectedStaffIds.has(s.id)).map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#1A2538] border border-[#2A3A5C] text-[#D4A373]">
                {s.name}
                <button onClick={() => toggleStaffFilter(s.id)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button onClick={clearStaffFilter} className="text-xs text-[#7A8BA8] hover:text-[#F4F1ED] underline">Clear</button>
          </div>
        )}

        {/* Views */}
        {viewMode === "workforce" && (
          <WorkforceView
            currentDate={currentDate}
            staffMembers={selectedStaffIds.size > 0 ? staffMembers.filter(s => selectedStaffIds.has(s.id)) : staffMembers}
            events={events}
            assignments={assignments}
            eventColorMap={eventColorMap}
            weeklyStats={weeklyStats}
          />
        )}
        {viewMode === "month" && (
          <MonthView currentDate={currentDate} eventsForDay={eventsForDay} assignmentsForEvent={assignmentsForEvent} onSelectDay={(day) => { setCurrentDate(day); setViewMode("day"); }} />
        )}
        {viewMode === "week" && (
          <WeekView currentDate={currentDate} eventsForDay={eventsForDay} assignmentsForEvent={assignmentsForEvent} />
        )}
        {viewMode === "day" && (
          <DayView currentDate={currentDate} eventsForDay={eventsForDay} assignmentsForEvent={assignmentsForEvent} events={events} assignments={assignments} />
        )}
      </div>

      {/* Summary Bar */}
      <div className="mt-4 card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-[#7A8BA8]">
          <span className="font-semibold text-[#F4F1ED]">{weeklyStats.eventCount}</span> events this week
        </span>
        <span className="text-[#2A3A5C]">|</span>
        <span className="text-[#7A8BA8]">
          <span className="font-semibold text-[#F4F1ED]">{weeklyStats.staffCount}</span> staff assigned
        </span>
        <span className="text-[#2A3A5C]">|</span>
        <span className="text-[#7A8BA8]">
          <span className={`font-semibold ${weeklyStats.unassignedCount > 0 ? "text-orange-400" : "text-green-400"}`}>{weeklyStats.unassignedCount}</span> unassigned
        </span>
        <span className="text-[#2A3A5C]">|</span>
        <span className="text-[#7A8BA8]">
          <span className="font-semibold text-[#F4F1ED]">{Math.round(weeklyStats.totalHours)}h</span> total labor
        </span>
        <span className="text-[#2A3A5C]">|</span>
        <span className="flex items-center gap-1 text-[#7A8BA8]">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-semibold text-green-400">{formatCurrency(weeklyStats.totalCost)}</span> labor cost
        </span>
      </div>
    </div>
  );
}

// ==================== WORKFORCE VIEW ====================

function WorkforceView({
  currentDate, staffMembers, events, assignments, eventColorMap, weeklyStats,
}: {
  currentDate: Date; staffMembers: StaffMember[]; events: Event[];
  assignments: AssignmentWithStaff[]; eventColorMap: Map<string, string>;
  weeklyStats: {
    totalHours: number; totalCost: number; eventCount: number; staffCount: number; unassignedCount: number;
    perStaff: Map<string, { hours: number; cost: number; shifts: number }>;
    perEvent: Map<string, { hours: number; cost: number; staff: number }>;
    perDay: Map<string, { hours: number; cost: number; events: number; staff: Set<string> }>;
  };
}) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate) });
  const today = new Date();

  // Precompute: for each staff + day, find their assignments with event info
  const getStaffDayAssignments = (staffId: string, day: Date) => {
    return assignments.filter((a) => {
      if (a.staff_member_id !== staffId) return false;
      const event = events.find((e) => e.id === a.event_id);
      return event && isSameDay(safeParseDate(event.event_date), day);
    }).map((a) => ({
      ...a,
      event: events.find((e) => e.id === a.event_id)!,
    }));
  };

  // Detect conflicts: staff assigned to 2+ events on the same day
  const hasConflict = (staffId: string, day: Date) => {
    const dayAssignments = getStaffDayAssignments(staffId, day);
    const uniqueEvents = new Set(dayAssignments.map((a) => a.event_id));
    return uniqueEvents.size > 1;
  };

  return (
    <div className="space-y-6">
      {/* Staff × Week Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row: days */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)_100px] gap-0 border-b border-[#2A3A5C]">
            <div className="p-3 text-xs font-medium text-[#7A8BA8] uppercase tracking-wider">Staff Member</div>
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today);
              const dayKey = format(day, "yyyy-MM-dd");
              const dayStats = weeklyStats.perDay.get(dayKey);
              return (
                <div key={day.toISOString()} className={`text-center py-2 px-1 border-l border-[#2A3A5C]/50 ${isToday ? "bg-[#D4A373]/5" : ""}`}>
                  <div className="text-[10px] text-[#7A8BA8] uppercase">{format(day, "EEE")}</div>
                  <div className={`text-sm font-semibold ${isToday ? "text-[#D4A373]" : ""}`}>{format(day, "d")}</div>
                  {dayStats && dayStats.cost > 0 && (
                    <div className="text-[9px] text-green-400/70 mt-0.5">{formatCurrency(dayStats.cost)}</div>
                  )}
                </div>
              );
            })}
            <div className="p-2 border-l border-[#2A3A5C]/50 text-center">
              <div className="text-[10px] text-[#7A8BA8] uppercase tracking-wider">Weekly</div>
              <div className="text-[10px] text-[#7A8BA8]">Total</div>
            </div>
          </div>

          {/* Staff rows */}
          {staffMembers.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#7A8BA8]">
              No staff members yet. <Link href="/staff" className="text-brand-400 hover:text-brand-300">Add staff</Link> to start planning.
            </div>
          ) : (
            staffMembers.map((staff) => {
              const staffStats = weeklyStats.perStaff.get(staff.id);
              return (
                <div key={staff.id} className="grid grid-cols-[200px_repeat(7,1fr)_100px] gap-0 border-b border-[#1A2538] hover:bg-[#182030]/30 transition-colors">
                  {/* Staff info */}
                  <div className="p-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#2A3A5C] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-[#D4A373]">{getInitials(staff.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{staff.name}</div>
                      <div className="text-[10px] text-[#7A8BA8]">{staff.role} &middot; {formatPay(staff.hourly_rate, staff.pay_type)}</div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {weekDays.map((day) => {
                    const dayAssignments = getStaffDayAssignments(staff.id, day);
                    const isToday = isSameDay(day, today);
                    const conflict = hasConflict(staff.id, day);

                    return (
                      <div key={day.toISOString()} className={`border-l border-[#2A3A5C]/30 p-1.5 min-h-[64px] ${isToday ? "bg-[#D4A373]/5" : ""} ${conflict ? "bg-red-900/10" : ""}`}>
                        {dayAssignments.map((a) => {
                          const colorClass = eventColorMap.get(a.event_id) || EVENT_COLORS[0];
                          const hours = calcShiftHours(a.start_time, a.end_time, a.event?.start_time, a.event?.end_time);
                          const cost = (staff.hourly_rate || 25) * hours;
                          return (
                            <Link
                              key={a.id}
                              href={`/events/${a.event_id}`}
                              className={`block rounded-md px-2 py-1 mb-1 border text-[10px] truncate hover:brightness-125 transition-all ${colorClass}`}
                              title={`${a.event?.name} • ${hours.toFixed(1)}h • ${formatCurrency(cost)}`}
                            >
                              <div className="font-medium truncate">{a.event?.name}</div>
                              <div className="flex items-center gap-1.5 opacity-80">
                                {a.start_time && <span>{formatTime12(a.start_time)}</span>}
                                <span>&middot; {hours.toFixed(1)}h</span>
                                <span>&middot; {formatCurrency(cost)}</span>
                              </div>
                            </Link>
                          );
                        })}
                        {conflict && (
                          <div className="flex items-center gap-1 text-[9px] text-red-400 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Conflict
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Weekly total for this staff */}
                  <div className="border-l border-[#2A3A5C]/50 p-2 flex flex-col items-center justify-center">
                    {staffStats ? (
                      <>
                        <div className="text-xs font-semibold">{staffStats.hours.toFixed(1)}h</div>
                        <div className="text-[10px] text-green-400">{formatCurrency(staffStats.cost)}</div>
                        <div className="text-[9px] text-[#7A8BA8]">{staffStats.shifts} shift{staffStats.shifts !== 1 ? "s" : ""}</div>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#7A8BA8]">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Footer: daily totals */}
          {staffMembers.length > 0 && (
            <div className="grid grid-cols-[200px_repeat(7,1fr)_100px] gap-0 bg-[#182030] border-t border-[#2A3A5C]">
              <div className="p-3 text-xs font-semibold text-[#D4A373] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Daily Totals
              </div>
              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayStats = weeklyStats.perDay.get(dayKey);
                return (
                  <div key={day.toISOString()} className="border-l border-[#2A3A5C]/50 p-2 text-center">
                    {dayStats ? (
                      <>
                        <div className="text-xs font-semibold">{dayStats.hours.toFixed(1)}h</div>
                        <div className="text-[10px] text-green-400">{formatCurrency(dayStats.cost)}</div>
                        <div className="text-[9px] text-[#7A8BA8]">{dayStats.staff.size} staff &middot; {dayStats.events} event{dayStats.events !== 1 ? "s" : ""}</div>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#7A8BA8]">—</span>
                    )}
                  </div>
                );
              })}
              <div className="border-l border-[#2A3A5C]/50 p-2 text-center bg-[#1A2538]">
                <div className="text-sm font-bold text-[#F4F1ED]">{Math.round(weeklyStats.totalHours)}h</div>
                <div className="text-xs font-semibold text-green-400">{formatCurrency(weeklyStats.totalCost)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-Event Labor Breakdown */}
      {weeklyStats.perEvent && weeklyStats.perEvent.size > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#D4A373] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Event Labor Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(weeklyStats.perEvent.entries()).map(([eventId, stats]) => {
              const event = events.find((e) => e.id === eventId);
              if (!event) return null;
              const colors = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
              return (
                <Link key={eventId} href={`/events/${eventId}`} className="card p-4 hover:bg-[#1A2538] transition-colors border-l-4" style={{ borderLeftColor: colors.border }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{event.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{event.status}</span>
                  </div>
                  <div className="text-xs text-[#7A8BA8] mb-2">{format(safeParseDate(event.event_date), "EEE, MMM d")}</div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-[#7A8BA8]"><Users className="w-3 h-3" />{stats.staff} staff</span>
                    <span className="flex items-center gap-1 text-[#7A8BA8]"><Clock className="w-3 h-3" />{stats.hours.toFixed(1)}h</span>
                    <span className="flex items-center gap-1 text-green-400 font-semibold"><DollarSign className="w-3 h-3" />{formatCurrency(stats.cost)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MONTH VIEW ====================

function MonthView({ currentDate, eventsForDay, assignmentsForEvent, onSelectDay }: {
  currentDate: Date; eventsForDay: (day: Date) => Event[];
  assignmentsForEvent: (eventId: string) => AssignmentWithStaff[]; onSelectDay: (day: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const allDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs text-[#7A8BA8] font-medium py-2">
            <span className="hidden sm:inline">{day}</span><span className="sm:hidden">{day[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day) => {
          const dayEvents = eventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          return (
            <button key={day.toISOString()} onClick={() => onSelectDay(day)}
              className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 rounded-lg border transition-all text-left flex flex-col ${!isCurrentMonth ? "opacity-30" : ""} ${isToday ? "border-[#D4A373] shadow-[0_0_0_1px_#D4A373]" : "border-[#2A3A5C]/50"} hover:bg-[#1A2538]`}>
              <div className={`text-xs md:text-sm font-medium mb-1 ${isToday ? "text-[#D4A373]" : "text-[#7A8BA8]"}`}>{format(day, "d")}</div>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => {
                  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
                  const ea = assignmentsForEvent(event.id);
                  return (
                    <div key={event.id}><Link href={`/events/${event.id}`} onClick={(e) => e.stopPropagation()}
                      className={`block text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate ${colors.bg} ${colors.text} hover:brightness-125`}>
                      <span className="flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <span className="truncate">{event.name}</span>
                        {ea.length > 0 && <span className="ml-auto flex-shrink-0 opacity-70"><Users className="w-2.5 h-2.5 inline" /><span className="ml-0.5">{ea.length}</span></span>}
                      </span>
                    </Link></div>
                  );
                })}
                {dayEvents.length > 3 && <div className="text-[10px] text-[#7A8BA8] px-1">+{dayEvents.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== WEEK VIEW ====================

function WeekView({ currentDate, eventsForDay, assignmentsForEvent }: {
  currentDate: Date; eventsForDay: (day: Date) => Event[];
  assignmentsForEvent: (eventId: string) => AssignmentWithStaff[];
}) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate) });
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0 border-b border-[#2A3A5C]">
          <div className="p-2" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={`text-center py-2 border-l border-[#2A3A5C]/50 ${isSameDay(day, today) ? "bg-[#D4A373]/5" : ""}`}>
              <div className="text-[10px] text-[#7A8BA8] uppercase">{format(day, "EEE")}</div>
              <div className={`text-sm font-semibold ${isSameDay(day, today) ? "text-[#D4A373]" : ""}`}>{format(day, "d")}</div>
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)] gap-0">
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="h-14 border-b border-[#2A3A5C]/30 flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-[#7A8BA8]">{format(new Date(2000, 0, 1, hour), "h a")}</span>
              </div>
            ))}
          </div>
          {weekDays.map((day) => {
            const dayEvents = eventsForDay(day);
            return (
              <div key={day.toISOString()} className={`relative border-l border-[#2A3A5C]/50 ${isSameDay(day, today) ? "bg-[#D4A373]/5" : ""}`}>
                {HOURS.map((hour) => <div key={hour} className="h-14 border-b border-[#2A3A5C]/30" />)}
                {dayEvents.map((event) => {
                  const startHour = event.start_time ? timeToHour(event.start_time) : 9;
                  const endHour = event.end_time ? timeToHour(event.end_time) : startHour + 2;
                  const topOffset = (startHour - 6) * 56;
                  const height = Math.max((endHour - startHour) * 56, 28);
                  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
                  const ea = assignmentsForEvent(event.id);
                  return (
                    <Link key={event.id} href={`/events/${event.id}`}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden ${colors.bg} border-l-2 hover:brightness-125 z-10`}
                      style={{ top: `${topOffset}px`, height: `${height}px`, borderLeftColor: colors.border }}>
                      <div className={`text-[10px] font-medium truncate ${colors.text}`}>{event.name}</div>
                      {height >= 40 && event.start_time && (
                        <div className="text-[9px] text-[#7A8BA8] mt-0.5">{formatTime12(event.start_time)}{event.end_time && ` - ${formatTime12(event.end_time)}`}</div>
                      )}
                      {height >= 56 && ea.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {ea.slice(0, 4).map((a) => (
                            <div key={a.id} className="w-4 h-4 rounded-full bg-[#2A3A5C] border border-[#0C1220] flex items-center justify-center" title={a.staff_members?.name || "?"}>
                              <span className="text-[7px] text-[#D4A373] font-medium">{getInitials(a.staff_members?.name || "?")}</span>
                            </div>
                          ))}
                          {ea.length > 4 && <span className="text-[8px] text-[#7A8BA8]">+{ea.length - 4}</span>}
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

function DayView({ currentDate, eventsForDay, assignmentsForEvent, events, assignments }: {
  currentDate: Date; eventsForDay: (day: Date) => Event[];
  assignmentsForEvent: (eventId: string) => AssignmentWithStaff[];
  events: Event[]; assignments: AssignmentWithStaff[];
}) {
  const dayEvents = eventsForDay(currentDate);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);
  const sortedEvents = [...dayEvents].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  // Day labor totals
  const dayLabor = useMemo(() => {
    let totalCost = 0;
    let totalHours = 0;
    for (const event of dayEvents) {
      const ea = assignmentsForEvent(event.id);
      for (const a of ea) {
        const rate = a.staff_members?.hourly_rate || 25;
        const hours = calcShiftHours(a.start_time, a.end_time, event.start_time, event.end_time);
        totalCost += rate * hours;
        totalHours += hours;
      }
    }
    return { totalCost, totalHours };
  }, [dayEvents, assignmentsForEvent]);

  return (
    <div>
      {isToday && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#D4A373]/10 border border-[#D4A373]/30 text-sm text-[#D4A373] font-medium">Today</div>
      )}

      {/* Day summary */}
      {sortedEvents.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-4 px-1 text-xs text-[#7A8BA8]">
          <span><span className="font-semibold text-[#F4F1ED]">{sortedEvents.length}</span> event{sortedEvents.length !== 1 ? "s" : ""}</span>
          <span><span className="font-semibold text-[#F4F1ED]">{dayLabor.totalHours.toFixed(1)}h</span> labor</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /><span className="font-semibold text-green-400">{formatCurrency(dayLabor.totalCost)}</span> labor cost</span>
        </div>
      )}

      {sortedEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-[#1A2538] border border-[#2A3A5C] flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-6 h-6 text-[#7A8BA8]" />
          </div>
          <p className="text-sm text-[#7A8BA8] mb-3">No events on {format(currentDate, "MMMM d, yyyy")}</p>
          <Link href={`/events/new?date=${format(currentDate, "yyyy-MM-dd")}`} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />Create Event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event) => {
            const colors = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
            const ea = assignmentsForEvent(event.id);
            // Calculate event labor cost
            let eventCost = 0;
            let eventHours = 0;
            for (const a of ea) {
              const rate = a.staff_members?.hourly_rate || 25;
              const hours = calcShiftHours(a.start_time, a.end_time, event.start_time, event.end_time);
              eventCost += rate * hours;
              eventHours += hours;
            }

            return (
              <div key={event.id} className="card p-0 overflow-hidden border-l-4" style={{ borderLeftColor: colors.border }}>
                <Link href={`/events/${event.id}`} className="block p-5 hover:bg-[#1A2538]/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-base font-semibold truncate">{event.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${colors.bg} ${colors.text}`}>{event.status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#D4A373]">
                        <span>{event.client_name}</span>
                        {event.venue && <span className="flex items-center gap-1 text-[#7A8BA8]"><MapPin className="w-3 h-3" />{event.venue}</span>}
                        {(event.start_time || event.end_time) && (
                          <span className="flex items-center gap-1 text-[#7A8BA8]">
                            <Clock className="w-3 h-3" />
                            {event.start_time && formatTime12(event.start_time)}{event.start_time && event.end_time && " - "}{event.end_time && formatTime12(event.end_time)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[#7A8BA8]"><Users className="w-3 h-3" />{event.guest_count} guests</span>
                      </div>
                    </div>
                    {/* Event labor cost badge */}
                    {ea.length > 0 && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-green-400">{formatCurrency(eventCost)}</div>
                        <div className="text-[10px] text-[#7A8BA8]">{eventHours.toFixed(1)}h &middot; {ea.length} staff</div>
                      </div>
                    )}
                  </div>
                </Link>
                {ea.length > 0 && (
                  <div className="px-5 pb-4 pt-0">
                    <div className="border-t border-[#2A3A5C] pt-3">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Users className="w-3.5 h-3.5 text-[#7A8BA8]" />
                        <span className="text-xs text-[#7A8BA8] font-medium">Assigned Staff ({ea.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ea.map((a) => {
                          const rate = a.staff_members?.hourly_rate || 25;
                          const hours = calcShiftHours(a.start_time, a.end_time, event.start_time, event.end_time);
                          const shiftCost = rate * hours;
                          return (
                            <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#0C1220]/50">
                              <div className="w-7 h-7 rounded-full bg-[#2A3A5C] flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-medium text-[#D4A373]">{getInitials(a.staff_members?.name || "?")}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{a.staff_members?.name || "Unknown"}</div>
                                <div className="flex items-center gap-2 text-[10px] text-[#7A8BA8]">
                                  {a.role && <span>{a.role}</span>}
                                  {a.start_time && <span>{formatTime12(a.start_time)}{a.end_time && ` - ${formatTime12(a.end_time)}`}</span>}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-[11px] font-medium text-green-400">{formatCurrency(shiftCost)}</div>
                                <div className="text-[9px] text-[#7A8BA8]">{hours.toFixed(1)}h @ ${rate}/hr</div>
                              </div>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.confirmed ? "bg-green-400" : "bg-gray-500"}`} title={a.confirmed ? "Confirmed" : "Unconfirmed"} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {ea.length === 0 && (
                  <div className="px-5 pb-4 pt-0">
                    <div className="border-t border-[#2A3A5C] pt-3">
                      <div className="flex items-center gap-2 text-xs text-orange-400/80">
                        <AlertTriangle className="w-3.5 h-3.5" /> No staff assigned to this event
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
