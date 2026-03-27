/**
 * Calendar Sync — ICS/iCal feed generation for Cateros events
 * NO external dependencies — generates ICS format manually
 */

import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types";

// ─── TYPES ───

export interface CalendarEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  allDay?: boolean;
}

// ─── ICS GENERATION ───

/**
 * Escape special characters in ICS format (RFC 5545)
 * Escapes: backslash, semicolon, comma, newline
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Format an ISO date string (YYYY-MM-DD) to ICS date format (YYYYMMDD)
 */
function formatDateForICS(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * Format ISO date + time (HH:mm) to ICS datetime format (YYYYMMDDTHHmmss)
 */
function formatDateTimeForICS(date: string, time: string): string {
  const dateOnly = date.replace(/-/g, "");
  const [h, m] = time.split(":");
  return `${dateOnly}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

/**
 * Generate a current UTC timestamp for DTSTAMP (RFC 5545)
 */
function generateDTStamp(): string {
  const now = new Date();
  return [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    "T",
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
    "Z",
  ].join("");
}

/**
 * Generate a single event ICS file (VEVENT wrapper)
 */
function generateVEVENT(event: CalendarEvent): string {
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${generateDTStamp()}`,
  ];

  // Date/time handling
  if (!event.allDay && event.startTime) {
    lines.push(`DTSTART:${formatDateTimeForICS(event.startDate, event.startTime)}`);
    if (event.endTime) {
      lines.push(`DTEND:${formatDateTimeForICS(event.startDate, event.endTime)}`);
    } else {
      // If no end time, assume 1 hour duration
      const [h, m] = event.startTime.split(":");
      let endH = parseInt(h) + 1;
      let endM = m;
      if (endH >= 24) endH = 23;
      lines.push(`DTEND:${formatDateTimeForICS(event.startDate, `${endH.toString().padStart(2, "0")}:${endM}`)}`);
    }
  } else {
    // All-day event: use VALUE=DATE, end date is next day
    lines.push(`DTSTART;VALUE=DATE:${formatDateForICS(event.startDate)}`);
    const d = new Date(event.startDate);
    d.setDate(d.getDate() + 1);
    const nextDay = d.toISOString().split("T")[0];
    lines.push(`DTEND;VALUE=DATE:${formatDateForICS(nextDay)}`);
  }

  lines.push(`SUMMARY:${escapeICS(event.title)}`);

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/**
 * Generate a single event ICS file
 */
export function generateICS(event: CalendarEvent): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cateros//Event Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Cateros Event",
    "X-WR-TIMEZONE:UTC",
  ];

  lines.push(generateVEVENT(event));

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Generate a multi-event calendar feed (VCALENDAR with multiple VEVENTs)
 */
export function generateCalendarFeed(events: CalendarEvent[], calendarName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cateros//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  // Add each event
  for (const event of events) {
    lines.push(generateVEVENT(event));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ─── DATABASE HELPERS ───

/**
 * Convert a Cateros Event to a CalendarEvent
 */
export async function eventToCalendarEvent(eventId: string, userId: string): Promise<CalendarEvent | null> {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .single();

  if (error || !event) {
    console.error("Failed to fetch event:", error?.message);
    return null;
  }

  const eventDate = event.event_date instanceof Date ? event.event_date.toISOString().split("T")[0] : event.event_date.split("T")[0];

  const description: string[] = [];
  if (event.client_name) description.push(`Client: ${event.client_name}`);
  if (event.guest_count) description.push(`Guests: ${event.guest_count}`);
  if (event.notes) description.push(event.notes);

  return {
    uid: `${eventId}@cateros.com`,
    title: event.name,
    description: description.length > 0 ? description.join("\n") : undefined,
    location: event.venue || undefined,
    startDate: eventDate,
    startTime: event.start_time || undefined,
    endTime: event.end_time || undefined,
    allDay: !event.start_time,
  };
}

/**
 * Generate full calendar feed for all user's events
 */
export async function generateUserCalendarFeed(userId: string, orgId: string | null): Promise<string> {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "canceled")
    .order("event_date", { ascending: true });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data: events, error } = await query;

  if (error || !events) {
    console.error("Failed to fetch events:", error?.message);
    return generateCalendarFeed([], "Empty Calendar");
  }

  const calendarEvents: CalendarEvent[] = [];

  for (const event of events) {
    const eventDate = event.event_date instanceof Date ? event.event_date.toISOString().split("T")[0] : event.event_date.split("T")[0];

    const description: string[] = [];
    if (event.client_name) description.push(`Client: ${event.client_name}`);
    if (event.guest_count) description.push(`Guests: ${event.guest_count}`);
    if (event.notes) description.push(event.notes);

    calendarEvents.push({
      uid: `${event.id}@cateros.com`,
      title: event.name,
      description: description.length > 0 ? description.join("\n") : undefined,
      location: event.venue || undefined,
      startDate: eventDate,
      startTime: event.start_time || undefined,
      endTime: event.end_time || undefined,
      allDay: !event.start_time,
    });
  }

  const userEmail = (await supabase.auth.getUser()).data.user?.email || "user";
  return generateCalendarFeed(calendarEvents, `Cateros Events — ${userEmail}`);
}
