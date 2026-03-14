export interface StaffRecommendation {
  role: string;
  headcount: number;
  hours: number;
  hourlyRate: number;
  rationale: string;
  staffMemberIds?: string[];
}

interface AvailableStaff {
  id: string;
  name: string;
  role: string;
  hourlyRate: number;
}

const DEFAULT_RATES: Record<string, number> = {
  server: 25,
  cook: 30,
  chef: 35,
  bartender: 20,
  captain: 25,
  "prep cook": 22,
  "setup crew": 18,
};

const SERVER_RATIOS: Record<string, number> = {
  plated: 20,
  buffet: 35,
  cocktail: 25,
  stations: 30,
  "family style": 25,
};

/**
 * Recommend staffing levels based on event parameters and industry standards.
 */
export function recommendStaffing(params: {
  guestCount: number;
  serviceStyle?: string;
  eventType?: string;
  eventDurationHours?: number;
  menuItemCount?: number;
  hasBar?: boolean;
  availableStaff?: AvailableStaff[];
}): StaffRecommendation[] {
  const {
    guestCount,
    serviceStyle,
    eventDurationHours = 5,
    menuItemCount = 4,
    hasBar = false,
    availableStaff = [],
  } = params;

  const recommendations: StaffRecommendation[] = [];
  const serviceHours = eventDurationHours;
  const totalHours = serviceHours + 2; // +2 for setup/breakdown

  // Build rate lookup from available staff
  const rateByRole = new Map<string, number>();
  const staffByRole = new Map<string, AvailableStaff[]>();
  for (const s of availableStaff) {
    const role = s.role.toLowerCase();
    if (!rateByRole.has(role)) rateByRole.set(role, s.hourlyRate);
    const list = staffByRole.get(role) || [];
    list.push(s);
    staffByRole.set(role, list);
  }

  function getRate(role: string): number {
    return rateByRole.get(role.toLowerCase()) || DEFAULT_RATES[role.toLowerCase()] || 25;
  }

  function matchStaff(role: string, count: number): string[] | undefined {
    const matches = staffByRole.get(role.toLowerCase());
    if (!matches || matches.length === 0) return undefined;
    return matches.slice(0, count).map((s) => s.id);
  }

  // --- Servers ---
  const style = (serviceStyle || "").toLowerCase();
  const serverRatio = SERVER_RATIOS[style] || 20;
  const serverCount = Math.max(1, Math.ceil(guestCount / serverRatio));
  recommendations.push({
    role: "Server",
    headcount: serverCount,
    hours: serviceHours,
    hourlyRate: getRate("server"),
    rationale: `1 server per ${serverRatio} guests (${style || "default"} service)`,
    staffMemberIds: matchStaff("server", serverCount),
  });

  // --- Lead Chef ---
  recommendations.push({
    role: "Lead Chef",
    headcount: 1,
    hours: totalHours,
    hourlyRate: getRate("chef"),
    rationale: "Minimum 1 lead chef per event",
    staffMemberIds: matchStaff("chef", 1),
  });

  // --- Cooks ---
  const cookCount = Math.max(0, Math.ceil(guestCount / 45) - 1); // -1 for lead chef
  if (cookCount > 0) {
    recommendations.push({
      role: "Cook",
      headcount: cookCount,
      hours: totalHours,
      hourlyRate: getRate("cook"),
      rationale: `1 cook per 45 guests (${guestCount} guests)`,
      staffMemberIds: matchStaff("cook", cookCount),
    });
  }

  // --- Event Captain ---
  if (guestCount > 50) {
    recommendations.push({
      role: "Event Captain",
      headcount: 1,
      hours: totalHours,
      hourlyRate: getRate("captain"),
      rationale: "1 captain for events over 50 guests",
      staffMemberIds: matchStaff("captain", 1),
    });
  }

  // --- Bartenders ---
  if (hasBar) {
    const barRatio = 50; // full bar default
    const bartenderCount = Math.max(1, Math.ceil(guestCount / barRatio));
    recommendations.push({
      role: "Bartender",
      headcount: bartenderCount,
      hours: serviceHours,
      hourlyRate: getRate("bartender"),
      rationale: `1 bartender per ${barRatio} guests (full bar)`,
      staffMemberIds: matchStaff("bartender", bartenderCount),
    });
  }

  // --- Buffet station attendants ---
  if (style === "buffet" || style === "stations") {
    const stationCount = Math.max(1, Math.ceil(menuItemCount / 3));
    recommendations.push({
      role: "Station Attendant",
      headcount: stationCount,
      hours: serviceHours,
      hourlyRate: getRate("server"),
      rationale: `1 attendant per 3 menu items (${style} service)`,
      staffMemberIds: matchStaff("server", stationCount),
    });
  }

  // --- Setup/Breakdown Crew ---
  const crewCount = guestCount > 100 ? 3 : 2;
  recommendations.push({
    role: "Setup Crew",
    headcount: crewCount,
    hours: 3, // setup + breakdown time
    hourlyRate: getRate("setup crew"),
    rationale: `${crewCount} crew for setup and breakdown`,
    staffMemberIds: matchStaff("setup crew", crewCount),
  });

  return recommendations;
}
