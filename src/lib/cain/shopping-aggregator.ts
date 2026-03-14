import type {
  CainShoppingItem,
  CainShoppingList,
  IngredientCategory,
} from "./types";

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface RecipeForAggregation {
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
}

interface InventoryEntry {
  ingredient_name: string;
  quantity_on_hand: number;
  unit: string;
}

// ---------- Aggregation ----------

/**
 * Aggregate recipe ingredients into a deduplicated shopping list,
 * scaled to the event guest count.
 */
export function aggregateIngredients(
  menuItems: Array<{ name: string; quantity?: number }>,
  recipes: Map<string, RecipeForAggregation>,
  guestCount: number
): CainShoppingItem[] {
  const map = new Map<string, CainShoppingItem>();

  for (const menuItem of menuItems) {
    const recipe = recipes.get(menuItem.name.toLowerCase());
    if (!recipe || !recipe.ingredients) continue;

    const servings = menuItem.quantity || guestCount;
    const multiplier = servings / (recipe.servings || 1);

    for (const ing of recipe.ingredients) {
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
      const qty = ing.quantity * multiplier;
      const cost = ing.cost_per_unit * qty;
      const existing = map.get(key);

      if (existing) {
        existing.quantity += qty;
        existing.estimatedCost += cost;
        if (!existing.fromRecipes.includes(recipe.name)) {
          existing.fromRecipes.push(recipe.name);
        }
      } else {
        map.set(key, {
          ingredientName: ing.name,
          quantity: qty,
          unit: ing.unit,
          estimatedCost: cost,
          category: categorizeIngredient(ing.name),
          fromRecipes: [recipe.name],
        });
      }
    }
  }

  // Round quantities and costs
  for (const item of map.values()) {
    item.quantity = Math.round(item.quantity * 100) / 100;
    item.estimatedCost = Math.round(item.estimatedCost * 100) / 100;
  }

  return Array.from(map.values());
}

// ---------- Categorization ----------

const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  Proteins: [
    "chicken", "beef", "pork", "lamb", "salmon", "shrimp", "fish", "turkey",
    "duck", "veal", "bacon", "sausage", "prosciutto", "steak", "filet",
    "lobster", "crab", "scallop", "tuna", "cod", "halibut", "tofu", "tempeh",
  ],
  Dairy: [
    "cream", "butter", "cheese", "milk", "yogurt", "sour cream", "mascarpone",
    "ricotta", "parmesan", "mozzarella", "brie", "cheddar", "gouda",
    "cream cheese", "whipping cream", "half and half", "eggs", "egg",
  ],
  Produce: [
    "lettuce", "tomato", "onion", "garlic", "potato", "carrot", "celery",
    "pepper", "mushroom", "zucchini", "squash", "broccoli", "cauliflower",
    "spinach", "kale", "arugula", "cucumber", "avocado", "lemon", "lime",
    "orange", "apple", "berry", "berries", "strawberry", "blueberry",
    "raspberry", "corn", "asparagus", "green bean", "pea", "cabbage",
    "eggplant", "beet", "radish", "leek", "shallot", "scallion", "fennel",
    "artichoke", "mango", "pineapple", "banana", "grape", "melon",
  ],
  "Herbs & Spices": [
    "basil", "thyme", "rosemary", "oregano", "cilantro", "parsley", "dill",
    "mint", "sage", "tarragon", "chive", "bay leaf", "cumin", "paprika",
    "cinnamon", "nutmeg", "turmeric", "coriander", "cayenne", "chili",
    "pepper flake", "saffron", "cardamom", "clove", "ginger",
    "salt", "black pepper", "white pepper",
  ],
  "Dry Goods": [
    "flour", "sugar", "rice", "pasta", "bread", "noodle", "panko",
    "breadcrumb", "cornstarch", "baking", "yeast", "oat", "quinoa",
    "couscous", "lentil", "bean", "chickpea", "almond", "walnut", "pecan",
    "pistachio", "cashew", "cocoa", "chocolate", "vanilla", "honey",
    "maple syrup", "brown sugar", "powdered sugar", "tortilla", "cracker",
  ],
  "Oils & Vinegars": [
    "olive oil", "vegetable oil", "canola oil", "sesame oil", "coconut oil",
    "truffle oil", "vinegar", "balsamic", "wine vinegar", "apple cider",
    "soy sauce", "fish sauce", "worcestershire", "hot sauce", "mustard",
    "ketchup", "mayo", "mayonnaise", "dressing",
  ],
  Beverages: [
    "wine", "beer", "vodka", "rum", "tequila", "whiskey", "bourbon",
    "champagne", "prosecco", "juice", "soda", "water", "coffee", "tea",
    "sparkling", "tonic", "simple syrup", "grenadine", "bitters",
  ],
  Miscellaneous: [],
};

export function categorizeIngredient(name: string): IngredientCategory {
  const lower = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "Miscellaneous") continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as IngredientCategory;
      }
    }
  }

  return "Miscellaneous";
}

// ---------- Inventory Comparison ----------

/**
 * Annotate shopping items with inventory status.
 */
export function compareWithInventory(
  items: CainShoppingItem[],
  inventory: InventoryEntry[]
): CainShoppingItem[] {
  const invMap = new Map<string, InventoryEntry>();
  for (const entry of inventory) {
    invMap.set(entry.ingredient_name.toLowerCase(), entry);
  }

  return items.map((item) => {
    const inv = invMap.get(item.ingredientName.toLowerCase());
    if (!inv) {
      return {
        ...item,
        inventoryOnHand: 0,
        inventoryStatus: "need_to_order" as const,
        shortfall: item.quantity,
      };
    }

    const onHand = inv.quantity_on_hand;
    if (onHand >= item.quantity) {
      return {
        ...item,
        inventoryOnHand: onHand,
        inventoryStatus: "sufficient" as const,
        shortfall: 0,
      };
    }

    return {
      ...item,
      inventoryOnHand: onHand,
      inventoryStatus: "partial" as const,
      shortfall: Math.round((item.quantity - onHand) * 100) / 100,
    };
  });
}

// ---------- Net Purchase ----------

/**
 * Compute net purchase quantities by subtracting inventory on hand.
 */
export function computeNetPurchaseList(list: CainShoppingList): CainShoppingList {
  let purchaseCost = 0;
  let inventoryCredit = 0;

  const items = list.items.map((item) => {
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
    purchaseCost += item.estimatedCost;
    return { ...item, purchaseQuantity: item.quantity };
  });

  return {
    ...list,
    items,
    purchaseCost: Math.round(purchaseCost * 100) / 100,
    inventoryCredit: Math.round(inventoryCredit * 100) / 100,
  };
}

// ---------- Build Final List ----------

export function buildShoppingList(items: CainShoppingItem[]): CainShoppingList {
  const sorted = [...items].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.ingredientName.localeCompare(b.ingredientName);
  });

  const categoryCounts: Partial<Record<IngredientCategory, number>> = {};
  for (const item of sorted) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  return {
    items: sorted,
    totalEstimatedCost: Math.round(sorted.reduce((s, i) => s + i.estimatedCost, 0) * 100) / 100,
    totalItems: sorted.length,
    categoryCounts,
  };
}
