"use client";

import { useState } from "react";
import { Check, ShoppingCart, Printer } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type AggIngredient = {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  sources: string[];
};

export function ShoppingListClient({ ingredients, totalCost }: { ingredients: AggIngredient[]; totalCost: number }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (ingredients.length === 0) {
    return (
      <div className="card p-12 text-center">
        <ShoppingCart className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
        <h2 className="font-medium text-lg mb-2">No items to shop for</h2>
        <p className="text-sm text-[#9c8876] mb-4">No confirmed events with matched recipes in the next 7 days.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/events" className="btn-secondary text-sm">View Events</Link>
          <Link href="/recipes" className="btn-secondary text-sm">View Recipes</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#9c8876]">
          {checked.size} of {ingredients.length} items checked · Est. {formatCurrency(totalCost)}
        </span>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>

      <div className="card divide-y divide-[#2e271f]">
        {ingredients.map(ing => {
          const key = `${ing.name}|${ing.unit}`;
          const isChecked = checked.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1c1814] ${isChecked ? "opacity-50" : ""}`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? "bg-green-500 border-green-500" : "border-[#6b5a4a]"}`}>
                {isChecked && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isChecked ? "line-through" : ""}`}>{ing.name}</div>
                <div className="text-[10px] text-[#6b5a4a]">
                  For: {ing.sources.join(", ")}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm">{ing.quantity.toFixed(1)} {ing.unit}</div>
                <div className="text-[10px] text-[#6b5a4a]">{formatCurrency(ing.estimatedCost)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
