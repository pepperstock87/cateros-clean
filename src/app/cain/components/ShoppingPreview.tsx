"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";
import type { CainShoppingList, CainShoppingItem, IngredientCategory } from "@/lib/cain/types";
import { formatCurrency } from "@/lib/utils";

interface ShoppingPreviewProps {
  shoppingList: CainShoppingList;
}

const STATUS_STYLES = {
  sufficient: { icon: CheckCircle2, label: "In Stock", className: "text-emerald-400" },
  partial: { icon: AlertTriangle, label: "Low", className: "text-yellow-400" },
  need_to_order: { icon: Package, label: "Order", className: "text-red-400" },
} as const;

export function ShoppingPreview({ shoppingList }: ShoppingPreviewProps) {
  const { items, totalEstimatedCost, totalItems, categoryCounts } = shoppingList;

  const needOrder = items.filter(
    (i) => i.inventoryStatus === "need_to_order" || i.inventoryStatus === "partial"
  ).length;

  // Group items by category
  const grouped = new Map<IngredientCategory, CainShoppingItem[]>();
  for (const item of items) {
    const list = grouped.get(item.category) || [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#D4A373]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Shopping List
          </h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#D4A373]/15 text-[#D4A373]">
            {totalItems} items
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          {needOrder > 0 && (
            <span className="text-yellow-400">
              {needOrder} to order
            </span>
          )}
          <span>Est. {formatCurrency(totalEstimatedCost)}</span>
        </div>
      </div>

      {/* Category sections */}
      <div className="divide-y divide-[var(--border)]/50">
        {Array.from(grouped.entries()).map(([category, categoryItems]) => (
          <CategorySection
            key={category}
            category={category}
            items={categoryItems}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Category Section ----------

function CategorySection({
  category,
  items,
}: {
  category: IngredientCategory;
  items: CainShoppingItem[];
}) {
  const [open, setOpen] = useState(true);
  const subtotal = items.reduce((s, i) => s + i.estimatedCost, 0);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>{category}</span>
        <span className="text-[10px] text-[var(--text-muted)]">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-muted)]">
          {formatCurrency(subtotal)}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-2">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-[var(--border)]/30">
              {items.map((item) => (
                <tr key={`${item.ingredientName}|${item.unit}`}>
                  <td className="py-1.5 pr-2 text-[var(--text-primary)]">
                    {item.ingredientName}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)] w-24">
                    {item.quantity.toFixed(1)} {item.unit}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--text-muted)] w-20">
                    {formatCurrency(item.estimatedCost)}
                  </td>
                  <td className="py-1.5 w-24 text-right">
                    <InventoryBadge item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Inventory Badge ----------

function InventoryBadge({ item }: { item: CainShoppingItem }) {
  if (!item.inventoryStatus) return null;

  const config = STATUS_STYLES[item.inventoryStatus];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
      {item.inventoryStatus === "partial" && item.shortfall != null && (
        <span className="text-[var(--text-muted)] ml-0.5">
          (-{item.shortfall.toFixed(1)})
        </span>
      )}
    </span>
  );
}
