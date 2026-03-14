import type { Event } from "@/types";

/**
 * Calendar integration utilities for generating ICS files and Google Calendar URLs.
 */

function formatDateForICS(date: string): string {
  return date.replace(/-/g, "");
}

function formatDateTimeForICS(date: string, time: string): string {
  const [h, m] = time.split(":");
  return `${date.replace(/-/g, "")}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateUID(eventId: string): string {
  return `${eventId}-${Date.now()}@cateros`;
}

/**
 * Generates a valid .ics file string from an Event object.
 * Handles events with or without start/end times (all-day events).
 */
export function generateICSFile(event: Event): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cateros//Event Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${generateUID(event.id)}`,
  ];

  // DTSTAMP (creation timestamp in UTC)
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    "T",
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
    "Z",
  ].join("");
  lines.push(`DTSTAMP:${stamp}`);

  // Date / time handling
  if (event.start_time) {
    lines.push(`DTSTART:${formatDateTimeForICS(event.event_date, event.start_time)}`);
    if (event.end_time) {
      lines.push(`DTEND:${formatDateTimeForICS(event.event_date, event.end_time)}`);
    }
  } else {
    // All-day event
    lines.push(`DTSTART;VALUE=DATE:${formatDateForICS(event.event_date)}`);
    const d = new Date(event.event_date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const nextDay = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    lines.push(`DTEND;VALUE=DATE:${nextDay}`);
  }

  // Summary
  lines.push(`SUMMARY:${escapeICS(event.name)}`);

  // Location
  if (event.venue) {
    lines.push(`LOCATION:${escapeICS(event.venue)}`);
  }

  // Description — include client name and notes
  const descParts: string[] = [];
  if (event.client_name) {
    descParts.push(`Client: ${event.client_name}`);
  }
  if (event.notes) {
    descParts.push(event.notes);
  }
  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICS(descParts.join("\n"))}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Builds a Google Calendar event creation URL with pre-filled data.
 * Dates are formatted as YYYYMMDDTHHmmssZ for timed events,
 * or YYYYMMDD for all-day events.
 */
export function buildGoogleCalendarURL(event: Event): string {
  const base = "https://calendar.google.com/calendar/render";

  const title = event.name;

  let startDate: string;
  let endDate: string;

  if (event.start_time) {
    startDate = formatDateTimeForICS(event.event_date, event.start_time) + "Z";
    endDate = event.end_time
      ? formatDateTimeForICS(event.event_date, event.end_time) + "Z"
      : startDate;
  } else {
    // All-day event: use YYYYMMDD format (no time component)
    startDate = formatDateForICS(event.event_date);
    const d = new Date(event.event_date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    endDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }

  const descParts: string[] = [];
  if (event.client_name) descParts.push(`Client: ${event.client_name}`);
  if (event.notes) descParts.push(event.notes);
  const description = descParts.join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startDate}/${endDate}`,
    details: description,
    location: event.venue || "",
  });

  return `${base}?${params.toString()}`;
}
