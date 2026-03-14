import type { CainShoppingItem, CainPOLine, CainProcurementDraft } from "./types";

interface DistributorProductOption {
  distributorName: string;
  distributorId: string;
  sku: string;
  productName: string;
  packSize: string;
  unitPrice: number;
  conversionFactor: number;
  conversionUnit: string;
  isPreferred: boolean;
}

/**
 * Build a draft procurement plan from a shopping list and available distributor product mappings.
 */
export function buildProcurementDraft(
  shoppingItems: CainShoppingItem[],
  productOptions: Map<string, DistributorProductOption[]>
): CainProcurementDraft {
  const byDistributor: CainProcurementDraft["byDistributor"] = {};
  const unmappedItems: CainProcurementDraft["unmappedItems"] = [];
  let totalMappedItems = 0;
  let totalEstimatedCost = 0;

  for (const item of shoppingItems) {
    // Use purchase quantity (net of inventory) if available, otherwise full quantity
    const qty = item.purchaseQuantity ?? item.quantity;
    if (qty <= 0) continue; // fully covered by inventory

    const key = item.ingredientName.toLowerCase();
    const options = productOptions.get(key);

    if (!options || options.length === 0) {
      unmappedItems.push({
        ingredientName: item.ingredientName,
        quantity: qty,
        unit: item.unit,
      });
      continue;
    }

    // Pick preferred option, or first available
    const best = options.find((o) => o.isPreferred) || options[0];

    // Calculate quantity in distributor units
    const orderQty = best.conversionFactor > 0
      ? Math.ceil(qty / best.conversionFactor)
      : Math.ceil(qty);

    const extendedPrice = Math.round(orderQty * best.unitPrice * 100) / 100;

    const line: CainPOLine = {
      ingredientName: item.ingredientName,
      quantity: orderQty,
      unit: best.conversionUnit || item.unit,
      distributorName: best.distributorName,
      distributorId: best.distributorId,
      sku: best.sku,
      productName: best.productName,
      packSize: best.packSize,
      unitPrice: best.unitPrice,
      extendedPrice,
      isPreferred: best.isPreferred,
    };

    if (!byDistributor[best.distributorId]) {
      byDistributor[best.distributorId] = {
        distributorName: best.distributorName,
        distributorId: best.distributorId,
        lines: [],
        subtotal: 0,
      };
    }

    byDistributor[best.distributorId].lines.push(line);
    byDistributor[best.distributorId].subtotal += extendedPrice;
    totalMappedItems++;
    totalEstimatedCost += extendedPrice;
  }

  // Round subtotals
  for (const d of Object.values(byDistributor)) {
    d.subtotal = Math.round(d.subtotal * 100) / 100;
  }

  return {
    byDistributor,
    unmappedItems,
    totalDistributors: Object.keys(byDistributor).length,
    totalMappedItems,
    totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
  };
}
