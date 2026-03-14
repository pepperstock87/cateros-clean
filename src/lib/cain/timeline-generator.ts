import type { CainTimelineItem } from "./types";

interface TimelineParams {
  startTime?: string;   // "HH:MM" — event start
  endTime?: string;     // "HH:MM" — event end
  serviceStyle?: string;
  eventType?: string;
  guestCount: number;
  menuItemCount?: number;
  hasBar?: boolean;
  hasCeremony?: boolean;
}

/**
 * Generate a structured day-of timeline based on event parameters.
 */
export function generateTimeline(params: TimelineParams): CainTimelineItem[] {
  const {
    startTime = "18:00",
    endTime,
    serviceStyle,
    eventType,
    guestCount,
    menuItemCount = 3,
    hasBar = false,
    hasCeremony = false,
  } = params;

  const style = (serviceStyle || "").toLowerCase();
  const type = (eventType || "").toLowerCase();
  const items: CainTimelineItem[] = [];

  const eventStart = parseTime(startTime);
  const eventEnd = endTime ? parseTime(endTime) : eventStart + 240; // default 4h duration

  // Kitchen arrival: 4-6h before start depending on guest count
  const kitchenLeadHours = guestCount > 150 ? 6 : guestCount > 75 ? 5 : 4;
  const kitchenArrival = eventStart - kitchenLeadHours * 60;

  items.push({
    phase: "prep",
    task: "Kitchen team arrives — begin prep",
    start_time: formatTime(kitchenArrival),
    duration_minutes: kitchenLeadHours * 60 - 120, // prep until setup starts
    assigned_to: "Chef, Cooks",
    notes: `${kitchenLeadHours}h lead time for ${guestCount} guests`,
  });

  // Setup: 2-3h before start
  const setupLeadHours = guestCount > 100 ? 3 : 2;
  const setupStart = eventStart - setupLeadHours * 60;

  items.push({
    phase: "setup",
    task: "Setup crew arrives — venue setup",
    start_time: formatTime(setupStart),
    duration_minutes: setupLeadHours * 60 - 30,
    assigned_to: "Setup Crew",
    notes: "Tables, linens, place settings, buffet stations",
  });

  // Servers arrive: 1.5h before start
  items.push({
    phase: "setup",
    task: "Service staff arrives — briefing & final setup",
    start_time: formatTime(eventStart - 90),
    duration_minutes: 60,
    assigned_to: "Servers, Captain",
  });

  // Bar setup if applicable
  if (hasBar) {
    items.push({
      phase: "setup",
      task: "Bar setup — ice, glassware, garnish prep",
      start_time: formatTime(eventStart - 90),
      duration_minutes: 60,
      assigned_to: "Bartender",
    });
  }

  // Final walkthrough
  items.push({
    phase: "setup",
    task: "Final walkthrough & team briefing",
    start_time: formatTime(eventStart - 30),
    duration_minutes: 15,
    assigned_to: "Captain, Chef",
  });

  // Ceremony (weddings/galas with ceremony)
  if (hasCeremony || type === "wedding") {
    items.push({
      phase: "ceremony",
      task: "Ceremony begins",
      start_time: formatTime(eventStart),
      duration_minutes: 30,
      notes: "Kitchen uses ceremony time for final plating prep",
    });

    // Cocktail hour after ceremony
    items.push({
      phase: "cocktail",
      task: "Cocktail hour — passed appetizers & drinks",
      start_time: formatTime(eventStart + 30),
      duration_minutes: 60,
      assigned_to: "Servers, Bartender",
      notes: style === "cocktail" ? "Main service" : "Transition to dining",
    });
  } else if (style === "cocktail") {
    // Cocktail-style event
    items.push({
      phase: "service",
      task: "Guests arrive — cocktail service begins",
      start_time: formatTime(eventStart),
      duration_minutes: Math.min(eventEnd - eventStart, 180),
      assigned_to: "Servers, Bartender",
      notes: "Passed hors d'oeuvres rotations every 15-20 min",
    });
  } else {
    // Regular event — guests arrive
    items.push({
      phase: "service",
      task: "Guests arrive — welcome drinks",
      start_time: formatTime(eventStart),
      duration_minutes: 30,
      assigned_to: "Servers",
    });
  }

  // Main service timing varies by style
  const serviceStart = hasCeremony || type === "wedding"
    ? eventStart + 90  // after ceremony + cocktail
    : style === "cocktail"
      ? -1  // no separate dinner service
      : eventStart + 30;

  if (serviceStart > 0 && style !== "cocktail") {
    if (style === "buffet" || style === "stations") {
      items.push({
        phase: "service",
        task: "Buffet opens — guests called by table",
        start_time: formatTime(serviceStart),
        duration_minutes: 60,
        assigned_to: "Captain, Servers",
        notes: "Replenish stations every 15 min",
      });

      items.push({
        phase: "service",
        task: "Buffet breakdown — clear stations",
        start_time: formatTime(serviceStart + 60),
        duration_minutes: 15,
        assigned_to: "Servers, Station Attendants",
      });
    } else {
      // Plated / family style
      const courseInterval = 25; // minutes between courses
      const courses = Math.min(menuItemCount, 4);

      for (let i = 0; i < courses; i++) {
        const courseTime = serviceStart + i * courseInterval;
        const courseLabel = i === 0 ? "First course" :
          i === courses - 1 ? "Main course" :
          `Course ${i + 1}`;

        items.push({
          phase: "service",
          task: `${courseLabel} — fire & serve`,
          start_time: formatTime(courseTime),
          duration_minutes: courseInterval,
          assigned_to: i === 0 ? "Chef, Servers" : "Kitchen, Servers",
        });
      }

      // Plate clearing
      const clearTime = serviceStart + courses * courseInterval;
      items.push({
        phase: "service",
        task: "Clear plates — prepare for dessert",
        start_time: formatTime(clearTime),
        duration_minutes: 15,
        assigned_to: "Servers",
      });
    }

    // Dessert service
    const dessertTime = style === "buffet" || style === "stations"
      ? serviceStart + 75
      : serviceStart + (Math.min(menuItemCount, 4) * 25) + 15;

    items.push({
      phase: "dessert",
      task: "Dessert service & coffee",
      start_time: formatTime(dessertTime),
      duration_minutes: 30,
      assigned_to: "Servers",
    });
  }

  // Last call (if bar)
  if (hasBar) {
    items.push({
      phase: "service",
      task: "Last call announced",
      start_time: formatTime(eventEnd - 30),
      duration_minutes: 5,
      assigned_to: "Bartender, Captain",
    });

    items.push({
      phase: "service",
      task: "Bar closes",
      start_time: formatTime(eventEnd - 15),
      duration_minutes: 5,
      assigned_to: "Bartender",
    });
  }

  // Event end
  items.push({
    phase: "service",
    task: "Event concludes — guest departure",
    start_time: formatTime(eventEnd),
    duration_minutes: 15,
    assigned_to: "Captain, Servers",
  });

  // Breakdown
  const breakdownDuration = guestCount > 100 ? 120 : 90;
  items.push({
    phase: "breakdown",
    task: "Breakdown begins — kitchen packout",
    start_time: formatTime(eventEnd + 15),
    duration_minutes: Math.floor(breakdownDuration * 0.6),
    assigned_to: "Chef, Cooks",
    notes: "Pack equipment, clean kitchen area",
  });

  items.push({
    phase: "breakdown",
    task: "FOH breakdown — tables, linens, rentals",
    start_time: formatTime(eventEnd + 15),
    duration_minutes: breakdownDuration,
    assigned_to: "Setup Crew, Servers",
    notes: "Stack rentals for pickup, bag linens",
  });

  items.push({
    phase: "breakdown",
    task: "Final venue walkthrough & departure",
    start_time: formatTime(eventEnd + breakdownDuration),
    duration_minutes: 15,
    assigned_to: "Captain",
  });

  return items;
}

// ---------- Helpers ----------

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatTime(minutes: number): string {
  // Handle negative / overflow
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
