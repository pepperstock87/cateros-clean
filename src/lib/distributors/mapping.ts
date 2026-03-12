// Distributor Product Mapping Service
//
// Manages the many-to-many relationship between distributor SKUs
// and Cateros inventory items (ingredients).
// One ingredient can map to SKUs from multiple distributors.
// One SKU can map to multiple ingredients (e.g., a combo case).

import { createClient } from "@/lib/supabase/server";
import type { DistributorProductMapping, DistributorProduct } from "./types";

/**
 * Get all mappings for a distributor's products.
 */
export async function getProductMappings(params: {
  userId: string;
  orgId: string | null;
  distributorId?: string;
}): Promise<Array<DistributorProductMapping & { product?: DistributorProduct }>> {
  const supabase = await createClient();
  let q = supabase
    .from("distributor_product_mappings")
    .select("*, distributor_products(*)");

  if (params.orgId) q = q.eq("organization_id", params.orgId);
  if (params.distributorId) {
    q = q.eq("distributor_products.distributor_id", params.distributorId);
  }

  const { data } = await q.order("ingredient_name");
  return (data ?? []).map((row: any) => ({
    ...row,
    product: row.distributor_products || undefined,
  }));
}

/**
 * Get preferred distributor product for an ingredient.
 */
export async function getPreferredProduct(params: {
  orgId: string | null;
  inventoryItemId: string;
}): Promise<(DistributorProductMapping & { product: DistributorProduct }) | null> {
  const supabase = await createClient();
  let q = supabase
    .from("distributor_product_mappings")
    .select("*, distributor_products(*)")
    .eq("inventory_item_id", params.inventoryItemId)
    .eq("is_preferred", true);

  if (params.orgId) q = q.eq("organization_id", params.orgId);

  const { data } = await q.limit(1).maybeSingle();
  if (!data) return null;

  return {
    ...data,
    product: (data as any).distributor_products,
  } as any;
}

/**
 * Get all distributor options for an ingredient (for comparison).
 */
export async function getProductOptions(params: {
  orgId: string | null;
  inventoryItemId: string;
}): Promise<Array<DistributorProductMapping & { product: DistributorProduct; distributorName: string }>> {
  const supabase = await createClient();
  let q = supabase
    .from("distributor_product_mappings")
    .select("*, distributor_products(*, distributors(name))")
    .eq("inventory_item_id", params.inventoryItemId);

  if (params.orgId) q = q.eq("organization_id", params.orgId);

  const { data } = await q;
  return (data ?? []).map((row: any) => ({
    ...row,
    product: row.distributor_products,
    distributorName: row.distributor_products?.distributors?.name || "Unknown",
  }));
}

/**
 * Create or update a product mapping.
 */
export async function upsertProductMapping(params: {
  orgId: string | null;
  distributorProductId: string;
  inventoryItemId: string | null;
  ingredientName: string;
  conversionFactor?: number;
  conversionUnit?: string;
  isPreferred?: boolean;
  notes?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // If setting as preferred, unset other preferred mappings for this ingredient
  if (params.isPreferred && params.inventoryItemId) {
    await supabase
      .from("distributor_product_mappings")
      .update({ is_preferred: false, updated_at: new Date().toISOString() })
      .eq("inventory_item_id", params.inventoryItemId)
      .eq("is_preferred", true);
  }

  const { data, error } = await supabase
    .from("distributor_product_mappings")
    .upsert(
      {
        organization_id: params.orgId,
        distributor_product_id: params.distributorProductId,
        inventory_item_id: params.inventoryItemId,
        ingredient_name: params.ingredientName,
        conversion_factor: params.conversionFactor ?? 1,
        conversion_unit: params.conversionUnit ?? null,
        is_preferred: params.isPreferred ?? false,
        notes: params.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "distributor_product_id,inventory_item_id" }
    )
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

/**
 * Remove a product mapping.
 */
export async function removeProductMapping(mappingId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("distributor_product_mappings").delete().eq("id", mappingId);
}

/**
 * Auto-suggest mappings by matching distributor product names to inventory ingredient names.
 * Uses fuzzy name matching. Returns suggestions, not automatic mappings.
 */
export async function suggestMappings(params: {
  userId: string;
  orgId: string | null;
  distributorId: string;
  limit?: number;
}): Promise<Array<{
  distributorProduct: DistributorProduct;
  suggestedInventoryItem: { id: string; ingredientName: string; similarity: number } | null;
}>> {
  const supabase = await createClient();

  // Get unmapped distributor products
  const { data: products } = await supabase
    .from("distributor_products")
    .select("*")
    .eq("distributor_id", params.distributorId)
    .eq("is_active", true)
    .limit(params.limit ?? 50);

  if (!products || products.length === 0) return [];

  // Get inventory items
  let invQuery = supabase
    .from("inventory")
    .select("id, ingredient_name")
    .eq("user_id", params.userId);
  if (params.orgId) invQuery = invQuery.eq("organization_id", params.orgId);

  const { data: inventory } = await invQuery;
  if (!inventory || inventory.length === 0) {
    return products.map((p) => ({ distributorProduct: p as DistributorProduct, suggestedInventoryItem: null }));
  }

  // Simple name matching
  return products.map((product) => {
    const prodName = (product.name || "").toLowerCase();

    let bestMatch: { id: string; ingredientName: string; similarity: number } | null = null;
    let bestScore = 0;

    for (const inv of inventory) {
      const invName = (inv.ingredient_name || "").toLowerCase();
      const score = calculateSimilarity(prodName, invName);
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = { id: inv.id, ingredientName: inv.ingredient_name, similarity: score };
      }
    }

    return { distributorProduct: product as DistributorProduct, suggestedInventoryItem: bestMatch };
  });
}

/**
 * Simple word-overlap similarity score (0-1).
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) matches++;
    // Partial match: check if any word in B contains this word
    else {
      for (const bWord of wordsB) {
        if (bWord.includes(word) || word.includes(bWord)) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  return matches / Math.max(wordsA.size, wordsB.size);
}
