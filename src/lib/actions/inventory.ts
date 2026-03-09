"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import type { InventoryItem } from "@/types";

// ─── Fetch all inventory items for user ───
export async function getInventory(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();

  let query = supabase.from("inventory").select("*").eq("user_id", user.id);
  if (org?.orgId) query = query.eq("organization_id", org.orgId);
  const { data, error } = await query.order("ingredient_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryItem[];
}

// ─── Add a new inventory item ───
export async function addInventoryItem(formData: {
  ingredient_name: string;
  quantity_on_hand: number;
  unit: string;
  par_level: number | null;
  vendor: string | null;
  cost_per_unit: number | null;
  category: string;
  location: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();

  const { error } = await supabase.from("inventory").insert({
    user_id: user.id,
    ingredient_name: formData.ingredient_name,
    quantity_on_hand: formData.quantity_on_hand,
    unit: formData.unit,
    par_level: formData.par_level,
    vendor: formData.vendor,
    cost_per_unit: formData.cost_per_unit,
    category: formData.category,
    location: formData.location,
    organization_id: org?.orgId ?? null,
    last_updated: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  return { success: true };
}

// ─── Update an existing inventory item ───
export async function updateInventoryItem(
  id: string,
  formData: {
    ingredient_name: string;
    quantity_on_hand: number;
    unit: string;
    par_level: number | null;
    vendor: string | null;
    cost_per_unit: number | null;
    category: string;
    location: string | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("inventory")
    .update({
      ingredient_name: formData.ingredient_name,
      quantity_on_hand: formData.quantity_on_hand,
      unit: formData.unit,
      par_level: formData.par_level,
      vendor: formData.vendor,
      cost_per_unit: formData.cost_per_unit,
      category: formData.category,
      location: formData.location,
      last_updated: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  return { success: true };
}

// ─── Delete an inventory item ───
export async function deleteInventoryItem(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  return { success: true };
}

// ─── Adjust quantity (add or subtract) ───
export async function adjustQuantity(id: string, adjustment: number, reason?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch current quantity
  const { data: item, error: fetchError } = await supabase
    .from("inventory")
    .select("quantity_on_hand")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !item) throw new Error("Item not found");

  const newQty = Math.max(0, (item.quantity_on_hand as number) + adjustment);

  const { error } = await supabase
    .from("inventory")
    .update({
      quantity_on_hand: newQty,
      last_updated: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  return { success: true, newQuantity: newQty };
}

// ─── Deduct from shopping list for an event ───
export async function deductFromShoppingList(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get shopping items for this event
  const { data: shoppingItems, error: shopError } = await supabase
    .from("event_shopping_items")
    .select("*")
    .eq("event_id", eventId);

  if (shopError) throw new Error(shopError.message);
  if (!shoppingItems || shoppingItems.length === 0) return { deducted: [], shortfall: [] };

  // Get all inventory for user
  const org = await getCurrentOrg();
  let invQuery = supabase.from("inventory").select("*").eq("user_id", user.id);
  if (org?.orgId) invQuery = invQuery.eq("organization_id", org.orgId);
  const { data: inventory } = await invQuery;

  if (!inventory) return { deducted: [], shortfall: shoppingItems.map((s: any) => ({ ingredient_name: s.ingredient_name, needed: s.quantity, available: 0, unit: s.unit })) };

  const deducted: { ingredient_name: string; deducted: number; unit: string }[] = [];
  const shortfall: { ingredient_name: string; needed: number; available: number; unit: string }[] = [];

  for (const shopItem of shoppingItems) {
    // Find matching inventory item (case-insensitive)
    const invItem = inventory.find(
      (inv: any) => inv.ingredient_name.toLowerCase() === shopItem.ingredient_name.toLowerCase()
    );

    if (!invItem) {
      shortfall.push({
        ingredient_name: shopItem.ingredient_name,
        needed: shopItem.quantity,
        available: 0,
        unit: shopItem.unit,
      });
      continue;
    }

    const available = invItem.quantity_on_hand as number;
    const needed = shopItem.quantity as number;

    if (available >= needed) {
      // Full deduction
      await supabase
        .from("inventory")
        .update({
          quantity_on_hand: available - needed,
          last_updated: new Date().toISOString(),
        })
        .eq("id", invItem.id);

      deducted.push({ ingredient_name: shopItem.ingredient_name, deducted: needed, unit: shopItem.unit });
    } else {
      // Partial deduction
      await supabase
        .from("inventory")
        .update({
          quantity_on_hand: 0,
          last_updated: new Date().toISOString(),
        })
        .eq("id", invItem.id);

      if (available > 0) {
        deducted.push({ ingredient_name: shopItem.ingredient_name, deducted: available, unit: shopItem.unit });
      }
      shortfall.push({
        ingredient_name: shopItem.ingredient_name,
        needed: needed - available,
        available,
        unit: shopItem.unit,
      });
    }
  }

  revalidatePath("/inventory");
  return { deducted, shortfall };
}

// ─── Check par levels — items below par ───
export async function checkParLevels(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();

  let query = supabase
    .from("inventory")
    .select("*")
    .eq("user_id", user.id)
    .not("par_level", "is", null);

  if (org?.orgId) query = query.eq("organization_id", org.orgId);

  const { data, error } = await query.order("ingredient_name");
  if (error) throw new Error(error.message);

  // Filter client-side: quantity_on_hand < par_level
  return ((data ?? []) as InventoryItem[]).filter(
    (item) => item.par_level !== null && item.quantity_on_hand < item.par_level
  );
}

// ─── Check inventory against shopping items (for ProductionTab integration) ───
export async function checkInventoryForEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: shoppingItems } = await supabase
    .from("event_shopping_items")
    .select("*")
    .eq("event_id", eventId);

  if (!shoppingItems || shoppingItems.length === 0) return [];

  const org = await getCurrentOrg();
  let invQuery = supabase.from("inventory").select("*").eq("user_id", user.id);
  if (org?.orgId) invQuery = invQuery.eq("organization_id", org.orgId);
  const { data: inventory } = await invQuery;

  return shoppingItems.map((shopItem: any) => {
    const invItem = (inventory ?? []).find(
      (inv: any) => inv.ingredient_name.toLowerCase() === shopItem.ingredient_name.toLowerCase()
    );

    const available = invItem ? (invItem.quantity_on_hand as number) : 0;
    const needed = shopItem.quantity as number;

    let status: "in_stock" | "low" | "not_in_stock";
    if (!invItem || available === 0) {
      status = "not_in_stock";
    } else if (available < needed) {
      status = "low";
    } else {
      status = "in_stock";
    }

    return {
      id: shopItem.id,
      ingredient_name: shopItem.ingredient_name,
      needed,
      available,
      unit: shopItem.unit,
      status,
    };
  });
}
