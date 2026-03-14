"use client";

import { useState, useMemo } from "react";
import { Check, ShoppingCart, Printer, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type AggIngredient = {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  sources: string[];
  category: string;
};

type Filter = "all" | "unchecked";

export function ShoppingListClient({ ingredients, totalCost }: { ingredients: AggIngredient[]; totalCost: number }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");

  function toggle(name: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, AggIngredient[]>();
    for (const ing of ingredients) {
      const cat = ing.category || "Miscellaneous";
      const list = map.get(cat) || [];
      list.push(ing);
      map.set(cat, list);
    }
    return map;
  }, [ingredients]);

  const filteredGrouped = useMemo(() => {
    if (filter === "all") return grouped;
    const map = new Map<string, AggIngredient[]>();
    for (const [cat, items] of grouped) {
      const filtered = items.filter((ing) => !checked.has(`${ing.name}|${ing.unit}`));
      if (filtered.length > 0) map.set(cat, filtered);
    }
    return map;
  }, [grouped, filter, checked]);

  if (ingredients.length === 0) {
    return (
      <div className="card p-12 text-center">
        <ShoppingCart className="w-10 h-10 text-[#7A8BA8] mx-auto mb-4" />
        <h2 className="font-medium text-lg mb-2">No items to shop for</h2>
        <p className="text-sm text-[#D4A373] mb-4">No confirmed events with matched recipes in the next 7 days.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/events" className="btn-secondary text-sm">View Events</Link>
          <Link href="/recipes" className="btn-secondary text-sm">View Recipes</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <span className="text-sm text-[#D4A373]">
          {checked.size} of {ingredients.length} items checked · Est. {formatCurrency(totalCost)}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#2A3A5C] text-xs overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 transition-colors ${filter === "all" ? "bg-[#D4A373]/15 text-[#D4A373]" : "text-[#7A8BA8] hover:text-[#D4A373]"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unchecked")}
              className={`px-3 py-1.5 transition-colors ${filter === "unchecked" ? "bg-[#D4A373]/15 text-[#D4A373]" : "text-[#7A8BA8] hover:text-[#D4A373]"}`}
            >
              Remaining
            </button>
          </div>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from(filteredGrouped.entries()).map(([category, items]) => (
          <CategoryGroup
            key={category}
            category={category}
            items={items}
            checked={checked}
            onToggle={toggle}
          />
        ))}
      </div>
    </>
  );
}

// ---------- Category Group ----------

function CategoryGroup({
  category,
  items,
  checked,
  onToggle,
}: {
  category: string;
  items: AggIngredient[];
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const subtotal = items.reduce((s, i) => s + i.estimatedCost, 0);
  const checkedCount = items.filter((i) => checked.has(`${i.name}|${i.unit}`)).length;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#1A2538] transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-[#7A8BA8]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#7A8BA8]" />
        )}
        <span className="text-sm font-medium flex-1">{category}</span>
        <span className="text-[10px] text-[#7A8BA8]">
          {checkedCount}/{items.length} · {formatCurrency(subtotal)}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-[#2A3A5C]">
          {items.map((ing) => {
            const key = `${ing.name}|${ing.unit}`;
            const isChecked = checked.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1A2538] ${isChecked ? "opacity-50" : ""}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? "bg-green-500 border-green-500" : "border-[#7A8BA8]"}`}>
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isChecked ? "line-through" : ""}`}>{ing.name}</div>
                  <div className="text-[10px] text-[#7A8BA8]">
                    For: {ing.sources.join(", ")}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm">{ing.quantity.toFixed(1)} {ing.unit}</div>
                  <div className="text-[10px] text-[#7A8BA8]">{formatCurrency(ing.estimatedCost)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
