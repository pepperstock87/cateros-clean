export interface RentalRecommendation {
  item: string;
  quantity: number;
  unitCost: number;
  category: string;
  rationale: string;
  rentalItemId?: string;
}

interface AvailableRental {
  id: string;
  name: string;
  category: string;
  unitCost: number;
}

const DEFAULT_COSTS: Record<string, number> = {
  "Round Table (60\")": 12,
  "Banquet Table (8')": 14,
  Chair: 3,
  "Table Linen": 8,
  "Napkin": 1.5,
  "Dinner Plate": 1,
  "Salad Plate": 0.75,
  "Water Glass": 0.75,
  "Wine Glass": 0.85,
  "Flatware Set": 1.5,
  "Chafing Dish": 15,
  "Cocktail Table": 10,
  "Cocktail Linen": 6,
};

const OVERAGE = 1.1; // 10% overage for breakage/extra

/**
 * Recommend rental items based on event parameters.
 */
export function recommendRentals(params: {
  guestCount: number;
  serviceStyle?: string;
  eventType?: string;
  venueProvides?: string[];
  menuItemCount?: number;
  availableRentals?: AvailableRental[];
}): RentalRecommendation[] {
  const {
    guestCount,
    serviceStyle,
    venueProvides = [],
    menuItemCount = 4,
    availableRentals = [],
  } = params;

  const style = (serviceStyle || "").toLowerCase();
  const recommendations: RentalRecommendation[] = [];
  const venueSet = new Set(venueProvides.map((v) => v.toLowerCase()));

  // Build cost lookup from available rentals
  const rentalByName = new Map<string, AvailableRental>();
  const rentalByCategory = new Map<string, AvailableRental[]>();
  for (const r of availableRentals) {
    rentalByName.set(r.name.toLowerCase(), r);
    const list = rentalByCategory.get(r.category.toLowerCase()) || [];
    list.push(r);
    rentalByCategory.set(r.category.toLowerCase(), list);
  }

  function findRental(name: string, category: string): { cost: number; id?: string } {
    // Try exact name match first
    const byName = rentalByName.get(name.toLowerCase());
    if (byName) return { cost: byName.unitCost, id: byName.id };
    // Try category match
    const byCat = rentalByCategory.get(category.toLowerCase());
    if (byCat && byCat.length > 0) return { cost: byCat[0].unitCost, id: byCat[0].id };
    // Fall back to default
    return { cost: DEFAULT_COSTS[name] || 5 };
  }

  function venueHas(item: string): boolean {
    return venueSet.has(item.toLowerCase()) || venueSet.has(item.toLowerCase() + "s");
  }

  function add(item: string, quantity: number, category: string, rationale: string) {
    const { cost, id } = findRental(item, category);
    recommendations.push({
      item,
      quantity: Math.ceil(quantity),
      unitCost: cost,
      category,
      rationale,
      rentalItemId: id,
    });
  }

  // --- Tables ---
  if (!venueHas("table") && !venueHas("tables")) {
    if (style === "cocktail") {
      const cocktailTables = Math.ceil(guestCount / 4);
      add("Cocktail Table", cocktailTables, "Tables", `1 cocktail table per 4 guests`);
    } else {
      const roundTables = Math.ceil(guestCount / 8);
      add("Round Table (60\")", roundTables, "Tables", `1 table per 8 guests`);
    }
  }

  // --- Chairs ---
  if (!venueHas("chair") && !venueHas("chairs") && style !== "cocktail") {
    add("Chair", Math.ceil(guestCount * OVERAGE), "Chairs", `1 per guest + 10% overage`);
  }

  // --- Linens ---
  if (!venueHas("linen") && !venueHas("linens")) {
    if (style === "cocktail") {
      const cocktailTables = Math.ceil(guestCount / 4);
      add("Cocktail Linen", cocktailTables, "Linens", `1 per cocktail table`);
    } else {
      const tables = Math.ceil(guestCount / 8);
      add("Table Linen", tables, "Linens", `1 per table`);
    }
    add("Napkin", Math.ceil(guestCount * OVERAGE), "Linens", `1 per guest + 10% overage`);
  }

  // --- Place settings ---
  if (!venueHas("plates") && !venueHas("dinnerware")) {
    const placeCount = Math.ceil(guestCount * OVERAGE);
    add("Dinner Plate", placeCount, "Flatware", `1 per guest + 10% overage`);
    if (menuItemCount > 2) {
      add("Salad Plate", placeCount, "Flatware", `1 per guest + 10% overage`);
    }
    add("Flatware Set", placeCount, "Flatware", `1 set per guest + 10% overage`);
  }

  // --- Glassware ---
  if (!venueHas("glass") && !venueHas("glassware")) {
    const glassCount = Math.ceil(guestCount * 1.15); // 15% overage for glasses
    add("Water Glass", glassCount, "Glassware", `1 per guest + 15% overage`);
    add("Wine Glass", glassCount, "Glassware", `1 per guest + 15% overage`);
  }

  // --- Serving / buffet ---
  if (style === "buffet" || style === "stations") {
    const chafingCount = Math.ceil(menuItemCount / 2);
    add("Chafing Dish", chafingCount, "Serving", `1 per 2 menu items (${style} service)`);
  }

  return recommendations;
}
