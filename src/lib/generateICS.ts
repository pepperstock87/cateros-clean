/**
 * Generate iCalendar (.ics) file content for event export.
 */

function formatDateForICS(date: string): string {
  // date is "YYYY-MM-DD" — return "YYYYMMDD"
  return date.replace(/-/g, "");
}

function formatDateTimeForICS(date: string, time: string): string {
  // date "YYYY-MM-DD", time "HH:mm" or "HH:mm:ss" — return "YYYYMMDDTHHmmss"
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

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}@cateros`;
}

export function generateICS(event: {
  name: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  client_name?: string | null;
  notes?: string | null;
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CaterOS//Event Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  lines.push(...generateVEVENT(event));

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateMultiEventICS(
  events: Array<{
    name: string;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
    client_name?: string | null;
    notes?: string | null;
  }>
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CaterOS//Event Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push(...generateVEVENT(event));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateVEVENT(event: {
  name: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  client_name?: string | null;
  notes?: string | null;
}): string[] {
  const lines: string[] = ["BEGIN:VEVENT", `UID:${generateUID()}`];

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  lines.push(`DTSTAMP:${stamp}`);

  if (event.start_time) {
    lines.push(`DTSTART:${formatDateTimeForICS(event.date, event.start_time)}`);
    if (event.end_time) {
      lines.push(`DTEND:${formatDateTimeForICS(event.date, event.end_time)}`);
    }
  } else {
    // All-day event
    lines.push(`DTSTART;VALUE=DATE:${formatDateForICS(event.date)}`);
    // All-day events need DTEND to be the next day
    const d = new Date(event.date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const nextDay = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    lines.push(`DTEND;VALUE=DATE:${nextDay}`);
  }

  lines.push(`SUMMARY:${escapeICS(event.name)}`);

  if (event.venue) {
    lines.push(`LOCATION:${escapeICS(event.venue)}`);
  }

  const descParts: string[] = [];
  if (event.client_name) descParts.push(`Client: ${event.client_name}`);
  if (event.notes) descParts.push(event.notes);
  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICS(descParts.join("\n"))}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
