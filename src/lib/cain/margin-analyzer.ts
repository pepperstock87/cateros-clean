import type { CainCostFlag, CainMarginAnalysis, CainShoppingList } from "./types";

interface PricingSummary {
  guestCount: number;
  foodCostTotal: number;
  staffingTotal: number;
  rentalsTotal: number;
  barTotal: number;
  subtotal: number;
  adminFee: number;
  taxAmount: number;
  totalCost: number;
  suggestedPrice: number;
  projectedMargin: number;
  targetMarginPercent: number;
}

interface PastEventSummary {
  guestCount: number;
  totalCost: number;
  suggestedPrice: number;
  foodCostTotal?: number;
}

/**
 * Analyze margin and cost structure for a planned event.
 */
export function analyzeMargin(
  pricing: PricingSummary,
  shoppingList?: CainShoppingList | null
): CainMarginAnalysis {
  const price = pricing.suggestedPrice || 1;
  const foodCostPercent = round((pricing.foodCostTotal / price) * 100);
  const laborCostPercent = round((pricing.staffingTotal / price) * 100);
  const rentalsCostPercent = round((pricing.rentalsTotal / price) * 100);
  const totalCostPerGuest = round(pricing.totalCost / (pricing.guestCount || 1));
  const pricePerGuest = round(price / (pricing.guestCount || 1));
  const marginPercent = round(pricing.projectedMargin);

  // Calculate inventory credit from shopping list
  let inventoryCredit = 0;
  if (shoppingList) {
    for (const item of shoppingList.items) {
      if (item.inventoryStatus === "sufficient") {
        inventoryCredit += item.estimatedCost;
      } else if (item.inventoryStatus === "partial" && item.inventoryOnHand && item.quantity > 0) {
        const coveredFraction = item.inventoryOnHand / item.quantity;
        inventoryCredit += item.estimatedCost * coveredFraction;
      }
    }
    inventoryCredit = round(inventoryCredit);
  }

  const costFlags = detectCostFlags(pricing, foodCostPercent, laborCostPercent, marginPercent);

  return {
    foodCostPercent,
    laborCostPercent,
    rentalsCostPercent,
    totalCostPerGuest,
    pricePerGuest,
    marginPercent,
    costFlags,
    pastEventComparison: null,
    inventoryCredit,
  };
}

/**
 * Compare current event metrics to past events.
 */
export function compareToPastEvents(
  pastEvents: PastEventSummary[]
): CainMarginAnalysis["pastEventComparison"] {
  if (pastEvents.length === 0) return null;

  const margins: number[] = [];
  const pricesPerGuest: number[] = [];
  const foodCostPercents: number[] = [];

  for (const evt of pastEvents) {
    if (evt.suggestedPrice > 0 && evt.totalCost > 0) {
      const margin = ((evt.suggestedPrice - evt.totalCost) / evt.suggestedPrice) * 100;
      margins.push(margin);
      if (evt.guestCount > 0) {
        pricesPerGuest.push(evt.suggestedPrice / evt.guestCount);
      }
      if (evt.foodCostTotal && evt.suggestedPrice > 0) {
        foodCostPercents.push((evt.foodCostTotal / evt.suggestedPrice) * 100);
      }
    }
  }

  return {
    avgMargin: margins.length > 0 ? round(avg(margins)) : null,
    avgPricePerGuest: pricesPerGuest.length > 0 ? round(avg(pricesPerGuest)) : null,
    avgFoodCostPercent: foodCostPercents.length > 0 ? round(avg(foodCostPercents)) : null,
    eventCount: pastEvents.length,
  };
}

/**
 * Add comparison flags when current event deviates from past averages.
 */
export function addComparisonFlags(
  analysis: CainMarginAnalysis,
  comparison: CainMarginAnalysis["pastEventComparison"]
): CainMarginAnalysis {
  if (!comparison) return { ...analysis, pastEventComparison: comparison };

  const flags = [...analysis.costFlags];

  if (comparison.avgMargin !== null && analysis.marginPercent < comparison.avgMargin - 10) {
    flags.push({
      type: "low_margin",
      severity: "warning",
      message: `This event's margin (${analysis.marginPercent}%) is significantly below your average (${comparison.avgMargin}%).`,
      suggestion: "Review pricing or look for cost savings to bring margin in line with your typical events.",
    });
  }

  if (comparison.avgFoodCostPercent !== null && analysis.foodCostPercent > comparison.avgFoodCostPercent + 10) {
    flags.push({
      type: "high_food_cost",
      severity: "warning",
      message: `Food cost (${analysis.foodCostPercent}%) is ${round(analysis.foodCostPercent - comparison.avgFoodCostPercent)}% higher than your average (${comparison.avgFoodCostPercent}%).`,
      suggestion: "Consider simpler preparations, seasonal ingredients, or adjusting portion sizes.",
    });
  }

  return { ...analysis, pastEventComparison: comparison, costFlags: flags };
}

// ---------- Internal ----------

function detectCostFlags(
  pricing: PricingSummary,
  foodCostPercent: number,
  laborCostPercent: number,
  marginPercent: number
): CainCostFlag[] {
  const flags: CainCostFlag[] = [];

  // Margin checks
  if (marginPercent <= 0) {
    flags.push({
      type: "price_below_cost",
      severity: "critical",
      message: `Suggested price ($${round(pricing.suggestedPrice)}) does not cover costs ($${round(pricing.totalCost)}). This event would lose money.`,
      suggestion: "Increase the suggested price, reduce menu complexity, or negotiate costs down.",
    });
  } else if (marginPercent < 20) {
    flags.push({
      type: "low_margin",
      severity: "critical",
      message: `Projected margin is only ${marginPercent}%, well below the ${pricing.targetMarginPercent}% target.`,
      suggestion: "Consider raising the price, simplifying the menu, or reducing staffing to improve margins.",
    });
  } else if (marginPercent < pricing.targetMarginPercent) {
    flags.push({
      type: "low_margin",
      severity: "warning",
      message: `Projected margin (${marginPercent}%) is below your ${pricing.targetMarginPercent}% target.`,
      suggestion: "Small adjustments to pricing or portion sizes could bring this in line.",
    });
  }

  // Food cost checks
  if (foodCostPercent > 45) {
    flags.push({
      type: "high_food_cost",
      severity: "critical",
      message: `Food cost is ${foodCostPercent}% of the price — extremely high for catering.`,
      suggestion: "Swap premium proteins for cost-effective alternatives, reduce course count, or increase the price.",
    });
  } else if (foodCostPercent > 35) {
    flags.push({
      type: "high_food_cost",
      severity: "warning",
      message: `Food cost is ${foodCostPercent}% of the price — above the typical 25-35% range.`,
      suggestion: "Consider seasonal menu swaps or reducing portion sizes slightly.",
    });
  }

  // Labor cost checks
  if (laborCostPercent > 30) {
    flags.push({
      type: "labor_heavy",
      severity: "warning",
      message: `Labor is ${laborCostPercent}% of the price — above the typical 20-30% range.`,
      suggestion: "Consider buffet service (fewer servers needed) or combining setup/service roles.",
    });
  }

  return flags;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function avg(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
