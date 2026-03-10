"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

/**
 * Generate production data for an event.
 * Takes the event's menu items, matches them to recipes via menu_item_recipes,
 * and generates prep items, shopping list, and pack list.
 */
export async function generateProduction(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch event with pricing data
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!event) throw new Error("Event not found");

  const pricingData = event.pricing_data as any;
  if (!pricingData?.menuItems?.length) throw new Error("No menu items found");

  const guestCount = pricingData.guestCount || event.guest_count || 100;
  const menuItems = pricingData.menuItems as Array<{ id: string; name: string; quantity: number; costPerPerson: number; category?: string }>;

  // Get current org
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();
  const orgId = profile?.current_organization_id;

  // Fetch menu item -> recipe mappings
  let mappingQuery = supabase
    .from("menu_item_recipes")
    .select("*, recipe:recipes(*)")
    .eq("user_id", user.id);
  if (orgId) mappingQuery = mappingQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
  const { data: mappings } = await mappingQuery;

  // Also fetch all recipes for name-based fallback matching
  let recipesQuery = supabase.from("recipes").select("*").eq("user_id", user.id);
  if (orgId) recipesQuery = recipesQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
  const { data: allRecipes } = await recipesQuery;

  // Create a new production sheet
  const existingSheets = await supabase
    .from("event_production_sheets")
    .select("version")
    .eq("event_id", eventId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existingSheets.data?.[0]?.version || 0) + 1;

  const { data: sheet } = await supabase
    .from("event_production_sheets")
    .insert({ event_id: eventId, version: nextVersion })
    .select()
    .single();

  if (!sheet) throw new Error("Failed to create production sheet");

  // Delete old generated (non-manual) prep items, shopping items
  await supabase.from("event_prep_items").delete().eq("event_id", eventId).eq("is_manual", false);
  await supabase.from("event_shopping_items").delete().eq("event_id", eventId);

  const prepItems: any[] = [];
  const shoppingMap = new Map<string, { quantity: number; unit: string }>();
  let groupOrder = 0;

  for (const menuItem of menuItems) {
    const servingsNeeded = menuItem.quantity || guestCount;

    // Find recipe mappings for this menu item
    const itemMappings = (mappings || []).filter(
      (m: any) => m.menu_item_name.toLowerCase() === menuItem.name.toLowerCase()
    );

    if (itemMappings.length > 0) {
      // Use explicit mappings
      for (const mapping of itemMappings) {
        const recipe = mapping.recipe as any;
        if (!recipe) continue;

        const recipeServings = recipe.servings || 1;
        const scaleFactor = servingsNeeded / recipeServings;
        const qtyPerServing = mapping.quantity_per_serving || 1;

        // Add prep item
        prepItems.push({
          event_id: eventId,
          production_sheet_id: sheet.id,
          menu_item_name: menuItem.name,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          component_name: recipe.name,
          required_quantity: Math.ceil(scaleFactor * qtyPerServing * 100) / 100,
          unit: mapping.unit || "batch",
          station: mapping.station || recipe.station || null,
          prep_notes: mapping.notes || null,
          is_manual: false,
          group_order: groupOrder++,
        });

        // Aggregate ingredients into shopping list
        const ingredients = recipe.ingredients || [];
        for (const ing of ingredients) {
          const key = `${ing.name.toLowerCase()}|${ing.unit}`;
          const existing = shoppingMap.get(key);
          const scaledQty = (ing.quantity || 0) * scaleFactor;
          if (existing) {
            existing.quantity += scaledQty;
          } else {
            shoppingMap.set(key, { quantity: scaledQty, unit: ing.unit || "each" });
          }
        }
      }
    } else {
      // Fallback: match recipe by name
      const matchedRecipe = (allRecipes || []).find(
        (r: any) => r.name.toLowerCase() === menuItem.name.toLowerCase()
      );

      if (matchedRecipe) {
        const recipeServings = matchedRecipe.servings || 1;
        const scaleFactor = servingsNeeded / recipeServings;

        prepItems.push({
          event_id: eventId,
          production_sheet_id: sheet.id,
          menu_item_name: menuItem.name,
          recipe_id: matchedRecipe.id,
          recipe_name: matchedRecipe.name,
          component_name: matchedRecipe.name,
          required_quantity: Math.ceil(scaleFactor * 100) / 100,
          unit: "batch",
          station: matchedRecipe.station || null,
          prep_notes: null,
          is_manual: false,
          group_order: groupOrder++,
        });

        const ingredients = matchedRecipe.ingredients || [];
        for (const ing of ingredients) {
          const key = `${ing.name.toLowerCase()}|${ing.unit}`;
          const existing = shoppingMap.get(key);
          const scaledQty = (ing.quantity || 0) * scaleFactor;
          if (existing) {
            existing.quantity += scaledQty;
          } else {
            shoppingMap.set(key, { quantity: scaledQty, unit: ing.unit || "each" });
          }
        }
      } else {
        // No recipe found — add as manual prep item
        prepItems.push({
          event_id: eventId,
          production_sheet_id: sheet.id,
          menu_item_name: menuItem.name,
          recipe_id: null,
          recipe_name: null,
          component_name: menuItem.name,
          required_quantity: servingsNeeded,
          unit: "portions",
          station: null,
          prep_notes: "No recipe linked — add recipe or manual prep notes",
          is_manual: false,
          group_order: groupOrder++,
        });
      }
    }
  }

  // Insert prep items
  if (prepItems.length > 0) {
    await supabase.from("event_prep_items").insert(prepItems);
  }

  // Insert shopping items
  const shoppingItems = Array.from(shoppingMap.entries()).map(([key, val]) => ({
    event_id: eventId,
    production_sheet_id: sheet.id,
    ingredient_name: key.split("|")[0],
    quantity: Math.ceil(val.quantity * 100) / 100,
    unit: val.unit,
    purchased: false,
  }));

  if (shoppingItems.length > 0) {
    await supabase.from("event_shopping_items").insert(shoppingItems);
  }

  // Generate default pack list from rentals
  const rentals = pricingData.rentals as Array<{ name: string; quantity: number }> | undefined;
  if (rentals?.length) {
    const packItems = rentals.map((r: any) => ({
      event_id: eventId,
      item_name: r.name,
      quantity: r.quantity || 1,
      category: "Rentals",
      packed: false,
    }));
    // Delete old pack items in Rentals category, keep manual ones
    await supabase.from("event_pack_items").delete().eq("event_id", eventId).eq("category", "Rentals");
    await supabase.from("event_pack_items").insert(packItems);
  }

  logAudit({
    userId: user.id,
    action: "generate_production",
    entity: "production",
    entityId: eventId,
    entityName: event.name,
    details: { version: nextVersion, prep_items: prepItems.length, shopping_items: shoppingItems.length },
  });

  revalidatePath(`/events/${eventId}`);
  return { success: true, version: nextVersion };
}

export async function addManualPrepItem(eventId: string, data: {
  menu_item_name: string;
  component_name: string;
  required_quantity: number;
  unit: string;
  station?: string;
  prep_notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("event_prep_items").insert({
    event_id: eventId,
    menu_item_name: data.menu_item_name,
    component_name: data.component_name,
    required_quantity: data.required_quantity,
    unit: data.unit,
    station: data.station || null,
    prep_notes: data.prep_notes || null,
    is_manual: true,
    group_order: 999,
  });

  revalidatePath(`/events/${eventId}`);
}

export async function updatePrepItem(itemId: string, updates: Record<string, any>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("event_prep_items").update(updates).eq("id", itemId);
  revalidatePath("/events");
}

export async function addPackItem(eventId: string, data: {
  item_name: string;
  quantity: number;
  category: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("event_pack_items").insert({
    event_id: eventId,
    item_name: data.item_name,
    quantity: data.quantity,
    category: data.category,
    notes: data.notes || null,
    packed: false,
  });

  revalidatePath(`/events/${eventId}`);
}

export async function togglePackItem(itemId: string, packed: boolean) {
  const supabase = await createClient();
  await supabase.from("event_pack_items").update({ packed }).eq("id", itemId);
}

export async function toggleShoppingItem(itemId: string, purchased: boolean) {
  const supabase = await createClient();
  await supabase.from("event_shopping_items").update({ purchased }).eq("id", itemId);
}

export async function addTimelineItem(eventId: string, data: {
  phase: string;
  task: string;
  sort_order?: number;
  assigned_to?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("event_timeline_items").insert({
    event_id: eventId,
    phase: data.phase,
    task: data.task,
    sort_order: data.sort_order || 0,
    assigned_to: data.assigned_to || null,
    notes: data.notes || null,
    completed: false,
  });

  revalidatePath(`/events/${eventId}`);
}

export async function toggleTimelineItem(itemId: string, completed: boolean) {
  const supabase = await createClient();
  await supabase.from("event_timeline_items").update({ completed }).eq("id", itemId);
}

export async function deleteTimelineItem(itemId: string) {
  const supabase = await createClient();
  await supabase.from("event_timeline_items").delete().eq("id", itemId);
}

// Link a menu item to a recipe
export async function linkMenuItemRecipe(data: {
  menu_item_name: string;
  recipe_id: string;
  quantity_per_serving?: number;
  unit?: string;
  station?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  await supabase.from("menu_item_recipes").insert({
    user_id: user.id,
    menu_item_name: data.menu_item_name,
    recipe_id: data.recipe_id,
    quantity_per_serving: data.quantity_per_serving || 1,
    unit: data.unit || "serving",
    station: data.station || null,
    notes: data.notes || null,
    organization_id: profile?.current_organization_id || null,
  });

  revalidatePath("/events");
}

export async function unlinkMenuItemRecipe(id: string) {
  const supabase = await createClient();
  await supabase.from("menu_item_recipes").delete().eq("id", id);
  revalidatePath("/events");
}

// ═══════════════════════════════════════════════════════════════
// Prep Breakdown — aggregated ingredient + dish + kitchen views
// ═══════════════════════════════════════════════════════════════

export type IngredientBreakdownItem = {
  ingredientName: string;
  totalQuantity: number;
  unit: string;
  dishes: { dishName: string; quantity: number }[];
  inventoryStatus: "in_stock" | "low" | "not_in_stock" | "unknown";
  inventoryAvailable: number;
  needsOrdering: boolean;
};

export type DishBreakdownItem = {
  dishName: string;
  category: string;
  quantityNeeded: number;
  scaleFactor: number;
  recipeServings: number;
  guestCount: number;
  ingredients: { name: string; quantity: number; unit: string }[];
  prepNotes: string | null;
  station: string | null;
  recipeId: string | null;
};

export type KitchenTask = {
  id: string;
  taskName: string;
  station: string;
  dishName: string;
  batchQuantity: number;
  unit: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  prepNotes: string | null;
  completed: boolean;
  sortOrder: number;
};

export type PrepBreakdownData = {
  byIngredient: IngredientBreakdownItem[];
  byDish: DishBreakdownItem[];
  kitchenTasks: KitchenTask[];
  eventName: string;
  eventDate: string;
  guestCount: number;
  clientName: string;
  venue: string | null;
};

/**
 * Get a full prep breakdown for an event — aggregated by ingredient,
 * by dish, and as kitchen production tasks.
 */
export async function getEventPrepBreakdown(eventId: string): Promise<PrepBreakdownData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!event) throw new Error("Event not found");

  const pricingData = event.pricing_data as any;
  const guestCount = pricingData?.guestCount || event.guest_count || 100;
  const menuItems = (pricingData?.menuItems ?? []) as Array<{
    id: string; name: string; quantity: number; costPerPerson: number; category?: string;
  }>;

  // Get org
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();
  const orgId = profile?.current_organization_id;

  // Fetch recipe mappings
  let mappingQuery = supabase
    .from("menu_item_recipes")
    .select("*, recipe:recipes(*)")
    .eq("user_id", user.id);
  if (orgId) mappingQuery = mappingQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
  const { data: mappings } = await mappingQuery;

  // Fetch all recipes for fallback
  let recipesQuery = supabase.from("recipes").select("*").eq("user_id", user.id);
  if (orgId) recipesQuery = recipesQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
  const { data: allRecipes } = await recipesQuery;

  // Fetch existing prep items
  const { data: prepItems } = await supabase
    .from("event_prep_items")
    .select("*")
    .eq("event_id", eventId)
    .order("group_order");

  // Fetch shopping items
  const { data: shoppingItems } = await supabase
    .from("event_shopping_items")
    .select("*")
    .eq("event_id", eventId);

  // Fetch inventory
  let invQuery = supabase.from("inventory").select("*").eq("user_id", user.id);
  if (orgId) invQuery = invQuery.eq("organization_id", orgId);
  const { data: inventory } = await invQuery;

  // Build ingredient map: ingredientKey -> { totalQty, unit, dishes[] }
  const ingredientMap = new Map<string, {
    name: string; totalQuantity: number; unit: string;
    dishes: { dishName: string; quantity: number }[];
  }>();

  // Build dish breakdown
  const byDish: DishBreakdownItem[] = [];
  let taskOrder = 0;
  const kitchenTasks: KitchenTask[] = [];

  for (const menuItem of menuItems) {
    const servingsNeeded = menuItem.quantity || guestCount;

    // Find recipe for this menu item
    const itemMappings = (mappings || []).filter(
      (m: any) => m.menu_item_name.toLowerCase() === menuItem.name.toLowerCase()
    );

    let matchedRecipes: { recipe: any; scaleFactor: number; qtyPerServing: number; station: string | null; notes: string | null }[] = [];

    if (itemMappings.length > 0) {
      for (const mapping of itemMappings) {
        const recipe = mapping.recipe as any;
        if (!recipe) continue;
        const recipeServings = recipe.servings || 1;
        const scaleFactor = servingsNeeded / recipeServings;
        const qtyPerServing = mapping.quantity_per_serving || 1;
        matchedRecipes.push({
          recipe,
          scaleFactor,
          qtyPerServing,
          station: mapping.station || recipe.station || null,
          notes: mapping.notes || null,
        });
      }
    } else {
      const fallback = (allRecipes || []).find(
        (r: any) => r.name.toLowerCase() === menuItem.name.toLowerCase()
      );
      if (fallback) {
        const recipeServings = fallback.servings || 1;
        const scaleFactor = servingsNeeded / recipeServings;
        matchedRecipes.push({
          recipe: fallback,
          scaleFactor,
          qtyPerServing: 1,
          station: fallback.station || null,
          notes: null,
        });
      }
    }

    if (matchedRecipes.length > 0) {
      for (const { recipe, scaleFactor, qtyPerServing, station, notes } of matchedRecipes) {
        const ingredients = (recipe.ingredients || []) as Array<{ name: string; quantity: number; unit: string }>;
        const scaledIngredients = ingredients.map((ing) => ({
          name: ing.name,
          quantity: Math.ceil((ing.quantity || 0) * scaleFactor * 100) / 100,
          unit: ing.unit || "each",
        }));

        byDish.push({
          dishName: menuItem.name,
          category: menuItem.category || "Other",
          quantityNeeded: servingsNeeded,
          scaleFactor,
          recipeServings: recipe.servings || 1,
          guestCount,
          ingredients: scaledIngredients,
          prepNotes: notes || recipe.description || null,
          station,
          recipeId: recipe.id,
        });

        // Aggregate into ingredient map
        for (const ing of scaledIngredients) {
          const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
          const existing = ingredientMap.get(key);
          if (existing) {
            existing.totalQuantity += ing.quantity;
            if (!existing.dishes.find((d) => d.dishName === menuItem.name)) {
              existing.dishes.push({ dishName: menuItem.name, quantity: ing.quantity });
            } else {
              const d = existing.dishes.find((d) => d.dishName === menuItem.name)!;
              d.quantity += ing.quantity;
            }
          } else {
            ingredientMap.set(key, {
              name: ing.name,
              totalQuantity: ing.quantity,
              unit: ing.unit,
              dishes: [{ dishName: menuItem.name, quantity: ing.quantity }],
            });
          }
        }

        // Kitchen task
        kitchenTasks.push({
          id: `task-${taskOrder}`,
          taskName: recipe.name || menuItem.name,
          station: station || "prep_kitchen",
          dishName: menuItem.name,
          batchQuantity: Math.ceil(scaleFactor * qtyPerServing * 100) / 100,
          unit: "batch",
          ingredients: scaledIngredients,
          prepNotes: notes || recipe.description || null,
          completed: false,
          sortOrder: taskOrder++,
        });
      }
    } else {
      // No recipe found
      byDish.push({
        dishName: menuItem.name,
        category: menuItem.category || "Other",
        quantityNeeded: servingsNeeded,
        scaleFactor: 1,
        recipeServings: servingsNeeded,
        guestCount,
        ingredients: [],
        prepNotes: "No recipe linked — add recipe or manual prep notes",
        station: null,
        recipeId: null,
      });

      kitchenTasks.push({
        id: `task-${taskOrder}`,
        taskName: menuItem.name,
        station: "prep_kitchen",
        dishName: menuItem.name,
        batchQuantity: servingsNeeded,
        unit: "portions",
        ingredients: [],
        prepNotes: "No recipe linked",
        completed: false,
        sortOrder: taskOrder++,
      });
    }
  }

  // Also pull in any existing manual prep items that aren't from menu items
  if (prepItems) {
    for (const pi of prepItems as any[]) {
      if (pi.is_manual) {
        const existingDish = byDish.find((d) => d.dishName === pi.menu_item_name);
        if (!existingDish) {
          kitchenTasks.push({
            id: pi.id,
            taskName: pi.component_name,
            station: pi.station || "prep_kitchen",
            dishName: pi.menu_item_name,
            batchQuantity: pi.required_quantity,
            unit: pi.unit,
            ingredients: [],
            prepNotes: pi.prep_notes,
            completed: false,
            sortOrder: taskOrder++,
          });
        }
      }
    }
  }

  // Build ingredient breakdown with inventory status
  const byIngredient: IngredientBreakdownItem[] = Array.from(ingredientMap.values()).map((ing) => {
    const invItem = (inventory ?? []).find(
      (inv: any) => inv.ingredient_name.toLowerCase() === ing.name.toLowerCase()
    );
    const available = invItem ? (invItem.quantity_on_hand as number) : 0;
    let status: "in_stock" | "low" | "not_in_stock" | "unknown" = "unknown";
    if (inventory) {
      if (!invItem || available === 0) {
        status = "not_in_stock";
      } else if (available < ing.totalQuantity) {
        status = "low";
      } else {
        status = "in_stock";
      }
    }
    return {
      ingredientName: ing.name,
      totalQuantity: Math.ceil(ing.totalQuantity * 100) / 100,
      unit: ing.unit,
      dishes: ing.dishes,
      inventoryStatus: status,
      inventoryAvailable: available,
      needsOrdering: status === "not_in_stock" || status === "low",
    };
  }).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

  // Sort kitchen tasks by station
  const stationOrder: Record<string, number> = {
    butchery: 0, garde_manger: 1, prep_kitchen: 2, hot_line: 3, pastry: 4, beverage: 5, packing: 6,
  };
  kitchenTasks.sort((a, b) => {
    const aOrd = stationOrder[a.station] ?? 99;
    const bOrd = stationOrder[b.station] ?? 99;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return a.sortOrder - b.sortOrder;
  });

  return {
    byIngredient,
    byDish,
    kitchenTasks,
    eventName: event.name,
    eventDate: event.event_date,
    guestCount,
    clientName: event.client_name,
    venue: event.venue,
  };
}

// ═══════════════════════════════════════════════════════════════
// Consolidated Cross-Event Prep Breakdown
// ═══════════════════════════════════════════════════════════════

export type ConsolidatedIngredient = {
  ingredientName: string;
  totalQuantity: number;
  unit: string;
  inventoryAvailable: number;
  shortfall: number;
  status: "sufficient" | "partial" | "need_to_order";
  category: string;
  events: { eventId: string; eventName: string; eventDate: string; quantity: number }[];
};

export type ConsolidatedEventSummary = {
  eventId: string;
  eventName: string;
  eventDate: string;
  clientName: string;
  guestCount: number;
  venue: string | null;
  menuItemCount: number;
  status: string;
};

export type ConsolidatedPrepData = {
  ingredients: ConsolidatedIngredient[];
  events: ConsolidatedEventSummary[];
  totalIngredients: number;
  totalNeedOrdering: number;
  totalEvents: number;
};

/**
 * Get a consolidated prep breakdown across all events in a date range.
 * Aggregates ingredients, checks inventory, and returns shortfall data.
 */
export async function getConsolidatedPrepBreakdown(data: {
  startDate: string;
  endDate: string;
}): Promise<ConsolidatedPrepData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get org
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();
  const orgId = profile?.current_organization_id;

  // Fetch all events in date range
  let eventsQuery = supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .gte("event_date", data.startDate)
    .lte("event_date", data.endDate)
    .in("status", ["draft", "proposed", "confirmed"])
    .order("event_date");
  if (orgId) eventsQuery = eventsQuery.eq("organization_id", orgId);
  const { data: events } = await eventsQuery;

  if (!events || events.length === 0) {
    return { ingredients: [], events: [], totalIngredients: 0, totalNeedOrdering: 0, totalEvents: 0 };
  }

  // Fetch recipe mappings
  let mappingQuery = supabase
    .from("menu_item_recipes")
    .select("*, recipe:recipes(*)")
    .eq("user_id", user.id);
  if (orgId) mappingQuery = mappingQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
  const { data: mappings } = await mappingQuery;

  // Fetch all recipes for fallback
  let recipesQuery = supabase.from("recipes").select("*").eq("user_id", user.id);
  if (orgId) recipesQuery = recipesQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
  const { data: allRecipes } = await recipesQuery;

  // Fetch inventory
  let invQuery = supabase.from("inventory").select("*").eq("user_id", user.id);
  if (orgId) invQuery = invQuery.eq("organization_id", orgId);
  const { data: inventory } = await invQuery;

  // Aggregate ingredients across all events
  // key: "ingredientName|unit" -> { totalQuantity, events[] }
  const ingredientMap = new Map<string, {
    name: string;
    totalQuantity: number;
    unit: string;
    events: { eventId: string; eventName: string; eventDate: string; quantity: number }[];
  }>();

  const eventSummaries: ConsolidatedEventSummary[] = [];

  for (const event of events) {
    const pricingData = event.pricing_data as any;
    const guestCount = pricingData?.guestCount || event.guest_count || 100;
    const menuItems = (pricingData?.menuItems ?? []) as Array<{
      id: string; name: string; quantity: number; costPerPerson: number; category?: string;
    }>;

    eventSummaries.push({
      eventId: event.id,
      eventName: event.name,
      eventDate: event.event_date,
      clientName: event.client_name,
      guestCount,
      venue: event.venue,
      menuItemCount: menuItems.length,
      status: event.status,
    });

    for (const menuItem of menuItems) {
      const servingsNeeded = menuItem.quantity || guestCount;

      // Find recipe mappings
      const itemMappings = (mappings || []).filter(
        (m: any) => m.menu_item_name.toLowerCase() === menuItem.name.toLowerCase()
      );

      let matchedRecipes: { recipe: any; scaleFactor: number }[] = [];

      if (itemMappings.length > 0) {
        for (const mapping of itemMappings) {
          const recipe = mapping.recipe as any;
          if (!recipe) continue;
          const recipeServings = recipe.servings || 1;
          const scaleFactor = servingsNeeded / recipeServings;
          matchedRecipes.push({ recipe, scaleFactor });
        }
      } else {
        const fallback = (allRecipes || []).find(
          (r: any) => r.name.toLowerCase() === menuItem.name.toLowerCase()
        );
        if (fallback) {
          const recipeServings = fallback.servings || 1;
          const scaleFactor = servingsNeeded / recipeServings;
          matchedRecipes.push({ recipe: fallback, scaleFactor });
        }
      }

      for (const { recipe, scaleFactor } of matchedRecipes) {
        const ingredients = (recipe.ingredients || []) as Array<{ name: string; quantity: number; unit: string }>;
        for (const ing of ingredients) {
          const scaledQty = Math.ceil((ing.quantity || 0) * scaleFactor * 100) / 100;
          const key = `${ing.name.toLowerCase()}|${(ing.unit || "each").toLowerCase()}`;
          const existing = ingredientMap.get(key);
          if (existing) {
            existing.totalQuantity += scaledQty;
            const eventEntry = existing.events.find((e) => e.eventId === event.id);
            if (eventEntry) {
              eventEntry.quantity += scaledQty;
            } else {
              existing.events.push({
                eventId: event.id,
                eventName: event.name,
                eventDate: event.event_date,
                quantity: scaledQty,
              });
            }
          } else {
            ingredientMap.set(key, {
              name: ing.name,
              totalQuantity: scaledQty,
              unit: ing.unit || "each",
              events: [{
                eventId: event.id,
                eventName: event.name,
                eventDate: event.event_date,
                quantity: scaledQty,
              }],
            });
          }
        }
      }
    }
  }

  // Build final ingredient list with inventory checks
  const CATEGORY_MAP: Record<string, string> = {
    chicken: "Proteins", beef: "Proteins", pork: "Proteins", fish: "Proteins", salmon: "Proteins",
    shrimp: "Proteins", lamb: "Proteins", turkey: "Proteins", bacon: "Proteins", sausage: "Proteins",
    milk: "Dairy", cream: "Dairy", butter: "Dairy", cheese: "Dairy", yogurt: "Dairy", egg: "Dairy",
    lettuce: "Produce", tomato: "Produce", onion: "Produce", garlic: "Produce", potato: "Produce",
    carrot: "Produce", pepper: "Produce", mushroom: "Produce", spinach: "Produce", celery: "Produce",
    lemon: "Produce", lime: "Produce", avocado: "Produce", cucumber: "Produce", zucchini: "Produce",
    broccoli: "Produce", shallot: "Produce", ginger: "Produce", scallion: "Produce", herb: "Produce",
    basil: "Herbs", thyme: "Herbs", rosemary: "Herbs", parsley: "Herbs", cilantro: "Herbs",
    oregano: "Herbs", dill: "Herbs", chive: "Herbs", mint: "Herbs", sage: "Herbs",
    salt: "Spices", cumin: "Spices", paprika: "Spices", cinnamon: "Spices", turmeric: "Spices",
    flour: "Dry Goods", sugar: "Dry Goods", rice: "Dry Goods", pasta: "Dry Goods", bread: "Dry Goods",
    oil: "Oils & Vinegars", vinegar: "Oils & Vinegars", olive: "Oils & Vinegars",
  };

  function categorizeIngredient(name: string): string {
    const lower = name.toLowerCase();
    for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
      if (lower.includes(keyword)) return cat;
    }
    // Check inventory for category
    const invItem = (inventory ?? []).find(
      (inv: any) => inv.ingredient_name.toLowerCase() === lower
    );
    if (invItem?.category) return invItem.category;
    return "Miscellaneous";
  }

  let totalNeedOrdering = 0;
  const ingredients: ConsolidatedIngredient[] = Array.from(ingredientMap.values()).map((ing) => {
    const invItem = (inventory ?? []).find(
      (inv: any) => inv.ingredient_name.toLowerCase() === ing.name.toLowerCase()
    );
    const available = invItem ? (invItem.quantity_on_hand as number) : 0;
    const totalNeeded = Math.ceil(ing.totalQuantity * 100) / 100;
    const shortfall = Math.max(0, Math.ceil((totalNeeded - available) * 100) / 100);

    let status: "sufficient" | "partial" | "need_to_order" = "sufficient";
    if (available === 0 || available < totalNeeded * 0.25) {
      status = "need_to_order";
      totalNeedOrdering++;
    } else if (available < totalNeeded) {
      status = "partial";
      totalNeedOrdering++;
    }

    return {
      ingredientName: ing.name,
      totalQuantity: totalNeeded,
      unit: ing.unit,
      inventoryAvailable: available,
      shortfall,
      status,
      category: categorizeIngredient(ing.name),
      events: ing.events.map((e) => ({ ...e, quantity: Math.ceil(e.quantity * 100) / 100 })),
    };
  }).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

  return {
    ingredients,
    events: eventSummaries,
    totalIngredients: ingredients.length,
    totalNeedOrdering,
    totalEvents: events.length,
  };
}
