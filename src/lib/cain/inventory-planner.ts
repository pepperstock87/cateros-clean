import type { CainShoppingItem, CainShoppingList } from "./types";

interface UpcomingEventDemand {
  eventName: string;
  eventDate: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface InventoryConflict {
  ingredientName: string;
  unit: string;
  thisEventNeeds: number;
  otherEventsNeed: number;
  totalDemand: number;
  available: number;
  shortfall: number;
  conflictingEvents: string[];
}

/**
 * Compute net purchase quantities by subtracting inventory on hand.
 */
export function computeNetPurchaseList(shoppingList: CainShoppingList): CainShoppingList {
  let purchaseCost = 0;
  let inventoryCredit = 0;

  const items = shoppingList.items.map((item) => {
    if (item.inventoryStatus === "sufficient") {
      inventoryCredit += item.estimatedCost;
      return { ...item, purchaseQuantity: 0 };
    }

    if (item.inventoryStatus === "partial" && item.shortfall !== undefined) {
      const purchaseQuantity = Math.round(item.shortfall * 100) / 100;
      const costPerUnit = item.quantity > 0 ? item.estimatedCost / item.quantity : 0;
      const purchaseItemCost = Math.round(costPerUnit * purchaseQuantity * 100) / 100;
      inventoryCredit += item.estimatedCost - purchaseItemCost;
      purchaseCost += purchaseItemCost;
      return { ...item, purchaseQuantity };
    }

    // need_to_order or no inventory data — purchase full quantity
    purchaseCost += item.estimatedCost;
    return { ...item, purchaseQuantity: item.quantity };
  });

  return {
    ...shoppingList,
    items,
    purchaseCost: Math.round(purchaseCost * 100) / 100,
    inventoryCredit: Math.round(inventoryCredit * 100) / 100,
  };
}

/**
 * Detect when upcoming events compete for the same inventory.
 */
export function detectInventoryConflicts(
  thisEventItems: CainShoppingItem[],
  upcomingDemand: UpcomingEventDemand[]
): InventoryConflict[] {
  const conflicts: InventoryConflict[] = [];

  // Group upcoming demand by ingredient
  const demandMap = new Map<string, { total: number; events: Set<string> }>();
  for (const d of upcomingDemand) {
    const key = d.ingredientName.toLowerCase();
    const entry = demandMap.get(key) || { total: 0, events: new Set<string>() };
    entry.total += d.quantity;
    entry.events.add(d.eventName);
    demandMap.set(key, entry);
  }

  for (const item of thisEventItems) {
    const key = item.ingredientName.toLowerCase();
    const otherDemand = demandMap.get(key);
    if (!otherDemand) continue;

    const available = item.inventoryOnHand ?? 0;
    const totalDemand = item.quantity + otherDemand.total;

    if (totalDemand > available && available > 0) {
      conflicts.push({
        ingredientName: item.ingredientName,
        unit: item.unit,
        thisEventNeeds: item.quantity,
        otherEventsNeed: Math.round(otherDemand.total * 100) / 100,
        totalDemand: Math.round(totalDemand * 100) / 100,
        available,
        shortfall: Math.round((totalDemand - available) * 100) / 100,
        conflictingEvents: Array.from(otherDemand.events),
      });
    }
  }

  return conflicts.sort((a, b) => b.shortfall - a.shortfall);
}
