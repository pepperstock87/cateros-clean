import type { CainEventPattern } from "./types";

interface PastEventData {
  id: string;
  name: string;
  event_date: string;
  guest_count: number;
  venue: string | null;
  status: string;
  notes: string | null;
  pricing_data: {
    menuItems?: Array<{ name: string; costPerPerson?: number }>;
    staffing?: Array<{ role: string; headcount?: number; hours?: number }>;
    suggestedPrice?: number;
    totalCost?: number;
    projectedMargin?: number;
    foodCostTotal?: number;
    guestCount?: number;
  } | null;
}

interface CurrentParams {
  eventType?: string;
  serviceStyle?: string;
  guestCount: number;
  menuItemCount?: number;
}

/**
 * Score how similar a past event is to current parameters (0-100).
 */
export function scoreSimilarity(current: CurrentParams, past: PastEventData): number {
  let score = 0;

  // Guest count proximity: ±20% = high match, degrades linearly
  const pastGuests = past.guest_count || 0;
  if (pastGuests > 0 && current.guestCount > 0) {
    const ratio = Math.min(pastGuests, current.guestCount) / Math.max(pastGuests, current.guestCount);
    score += Math.round(ratio * 30); // max 30 points
  }

  // Event type match from notes/name heuristic
  if (current.eventType) {
    const searchText = `${past.name} ${past.notes || ""}`.toLowerCase();
    const type = current.eventType.toLowerCase();
    if (searchText.includes(type)) {
      score += 25;
    } else {
      // Partial matches
      const typeAliases: Record<string, string[]> = {
        wedding: ["wedding", "reception", "bridal"],
        corporate: ["corporate", "business", "meeting", "conference", "lunch"],
        birthday: ["birthday", "celebration", "party"],
        gala: ["gala", "fundraiser", "charity", "formal"],
        cocktail: ["cocktail", "reception", "mixer"],
      };
      const aliases = typeAliases[type] || [type];
      if (aliases.some((a) => searchText.includes(a))) {
        score += 15;
      }
    }
  }

  // Menu complexity similarity
  const pastMenuCount = past.pricing_data?.menuItems?.length || 0;
  const currentMenuCount = current.menuItemCount || 3;
  if (pastMenuCount > 0) {
    const menuRatio = Math.min(pastMenuCount, currentMenuCount) / Math.max(pastMenuCount, currentMenuCount);
    score += Math.round(menuRatio * 10); // max 10 points
  }

  // Successful event bonus (healthy margin > 25%)
  const margin = past.pricing_data?.projectedMargin;
  if (margin !== undefined && margin !== null && margin > 25) {
    score += 10;
  }

  // Completed event bonus (vs draft)
  if (past.status === "completed") {
    score += 10;
  } else if (past.status === "confirmed") {
    score += 5;
  }

  // Recent event bonus (within last 6 months)
  const daysSince = (Date.now() - new Date(past.event_date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 180) {
    score += 10;
  } else if (daysSince < 365) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Score and rank past events, extract reusable patterns from the top matches.
 */
export function extractPatterns(
  pastEvents: PastEventData[],
  current: CurrentParams
): CainEventPattern[] {
  const scored = pastEvents
    .map((evt) => ({ evt, score: scoreSimilarity(current, evt) }))
    .filter((x) => x.score > 20) // minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(({ evt, score }) => {
    const pricing = evt.pricing_data;

    // Extract menu highlights
    const menuHighlights = (pricing?.menuItems || [])
      .slice(0, 5)
      .map((m) => m.name);

    // Build staffing summary
    const staffing = pricing?.staffing || [];
    const staffingSummary = staffing.length > 0
      ? staffing.map((s) => `${s.headcount || 1} ${s.role}`).join(", ")
      : "No staffing data";

    // Price per guest
    const price = pricing?.suggestedPrice;
    const guests = pricing?.guestCount || evt.guest_count;
    const pricePerGuest = price && guests ? Math.round((price / guests) * 100) / 100 : null;

    // Margin
    const margin = pricing?.projectedMargin ?? null;

    return {
      eventId: evt.id,
      eventName: evt.name,
      eventDate: evt.event_date,
      similarityScore: score,
      guestCount: evt.guest_count,
      margin,
      menuHighlights,
      staffingSummary,
      pricePerGuest,
    };
  });
}
