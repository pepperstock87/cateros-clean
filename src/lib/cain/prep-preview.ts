import type { CainPrepItem, CainPrepPreview } from "./types";

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface RecipeForPrep {
  name: string;
  servings: number;
  category?: string;
  station?: string | null;
  ingredients: RecipeIngredient[];
}

interface MenuItemForPrep {
  name: string;
  quantity?: number;
}

const DEFAULT_STATION = "prep_kitchen";

/**
 * Build a prep preview from menu items and matched recipes.
 * Mirrors generateProduction's logic but without DB writes.
 */
export function buildPrepPreview(
  menuItems: MenuItemForPrep[],
  recipes: Map<string, RecipeForPrep>,
  guestCount: number
): CainPrepPreview {
  const allItems: CainPrepItem[] = [];
  const byDish: CainPrepPreview["byDish"] = [];

  for (const menuItem of menuItems) {
    const recipe = recipes.get(menuItem.name.toLowerCase());
    if (!recipe || !recipe.ingredients) continue;

    const servingsNeeded = menuItem.quantity || guestCount;
    const scaleFactor = servingsNeeded / (recipe.servings || 1);
    const dishItems: CainPrepItem[] = [];

    for (const ing of recipe.ingredients) {
      const item: CainPrepItem = {
        menuItemName: menuItem.name,
        recipeName: recipe.name,
        componentName: ing.name,
        quantity: Math.ceil(ing.quantity * scaleFactor * 100) / 100,
        unit: ing.unit,
        station: recipe.station || DEFAULT_STATION,
        prepNotes: null,
      };
      allItems.push(item);
      dishItems.push(item);
    }

    byDish.push({
      dishName: menuItem.name,
      category: recipe.category || "Other",
      scaleFactor: Math.round(scaleFactor * 100) / 100,
      items: dishItems,
    });
  }

  // Group by station
  const byStation: Record<string, CainPrepItem[]> = {};
  for (const item of allItems) {
    const station = item.station || DEFAULT_STATION;
    if (!byStation[station]) byStation[station] = [];
    byStation[station].push(item);
  }

  // Station counts
  const stationCounts: Record<string, number> = {};
  for (const [station, items] of Object.entries(byStation)) {
    stationCounts[station] = items.length;
  }

  return {
    byStation,
    byDish,
    totalTasks: allItems.length,
    stationCounts,
  };
}
