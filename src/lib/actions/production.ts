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
