"use client";

import { useState } from "react";
import { createRecipeAction } from "@/lib/actions/recipes";
import { useActionState } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { RecipeIngredient } from "@/types";

const UNITS = ["oz", "lb", "g", "kg", "cup", "qt", "gal", "each", "bunch", "pkg", "tsp", "tbsp"] as const;

export default function NewRecipePage() {
  const [state, action, pending] = useActionState(createRecipeAction, { error: "" });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [servingsValue, setServingsValue] = useState("4");
  const [casePrice, setCasePrice] = useState("");
  const [unitsPerCase, setUnitsPerCase] = useState("");
  const [caseUnitType, setCaseUnitType] = useState("");
  const [yieldPercent, setYieldPercent] = useState("100");

  const totalCost = ingredients.reduce((s, i) => s + (i.quantity * i.cost_per_unit), 0);
  const costPerServing = parseFloat(servingsValue) > 0 ? totalCost / parseFloat(servingsValue) : 0;
  const costPerUnit = (parseFloat(casePrice) || 0) / (parseFloat(unitsPerCase) || 1);
  const effectiveCostPerUnit = costPerUnit / ((parseFloat(yieldPercent) || 100) / 100);

  const addIngredient = () => setIngredients(p => [...p, {
    id: crypto.randomUUID(),
    name: "",
    quantity: 0,
    unit: "oz",
    cost_per_unit: 0,
    total_cost: 0
  }]);

  const updateIngredient = (idx: number, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients(p => p.map((ing, i) => {
      if (i !== idx) return ing;
      const updated = { ...ing, [field]: value };
      if (field === "quantity" || field === "cost_per_unit") {
        updated.total_cost = updated.quantity * updated.cost_per_unit;
      }
      return updated;
    }));
  };

  const removeIngredient = (idx: number) => setIngredients(p => p.filter((_, i) => i !== idx));

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-3 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All recipes
      </Link>
      <h1 className="font-display text-xl md:text-2xl font-semibold">New Recipe</h1>
      <p className="text-sm text-[#9c8876] mt-1 mb-6">Add a recipe with ingredients and costing.</p>

      <form action={action} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Recipe Name</label>
            <input type="text" name="name" required className="input" placeholder="e.g., Grilled Chicken Breast" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Servings</label>
              <input type="number" name="servings" required min="1" className="input" placeholder="4" value={servingsValue} onChange={e => setServingsValue(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <select name="category" required className="input">
                <option value="">Select...</option>
                <option value="Entrees">Entrees</option>
                <option value="Appetizers">Appetizers</option>
                <option value="Sides">Sides</option>
                <option value="Desserts">Desserts</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <textarea name="description" rows={3} className="input" placeholder="Brief description..." />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Ingredients</h2>
            <button type="button" onClick={addIngredient} className="btn-secondary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" />Add ingredient
            </button>
          </div>

          <input type="hidden" name="ingredients" value={JSON.stringify(ingredients)} />

          {ingredients.length === 0 ? (
            <p className="text-sm text-[#6b5a4a] text-center py-6">No ingredients yet</p>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={e => updateIngredient(idx, "name", e.target.value)}
                    className="input flex-1"
                    placeholder="Ingredient name"
                  />
                  <input
                    type="number"
                    value={ing.quantity || ""}
                    onChange={e => updateIngredient(idx, "quantity", parseFloat(e.target.value) || 0)}
                    className="input w-24"
                    placeholder="Qty"
                    step="0.01"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredient(idx, "unit", e.target.value)}
                    className="input w-24"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a]">$</span>
                    <input
                      type="number"
                      value={ing.cost_per_unit || ""}
                      onChange={e => updateIngredient(idx, "cost_per_unit", parseFloat(e.target.value) || 0)}
                      className="input w-28 pl-7"
                      placeholder="Cost"
                      step="0.01"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider mb-4">Case Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#9c8876] mb-1">Case Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9c8876]">$</span>
                <input type="number" value={casePrice} onChange={e => setCasePrice(e.target.value)} className="input w-full pl-6 text-sm" placeholder="0.00" step="0.01" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9c8876] mb-1">Units per Case</label>
              <input type="number" value={unitsPerCase} onChange={e => setUnitsPerCase(e.target.value)} className="input w-full text-sm" placeholder="0" min="1" step="1" />
            </div>
            <div>
              <label className="block text-xs text-[#9c8876] mb-1">Unit Type</label>
              <select value={caseUnitType} onChange={e => setCaseUnitType(e.target.value)} className="input w-full text-sm">
                <option value="">Select...</option>
                {["lb", "oz", "each", "liter", "kg", "g", "cup", "gal", "qt"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9c8876] mb-1">Yield %</label>
              <input type="number" value={yieldPercent} onChange={e => setYieldPercent(e.target.value)} className="input w-full text-sm" placeholder="100" min="1" max="100" step="1" />
            </div>
          </div>
          {casePrice && unitsPerCase && (
            <div className="mt-4 pt-4 border-t border-[#2e271f] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-semibold text-brand-300">{formatCurrency(costPerUnit)}</div>
                <div className="text-xs text-[#9c8876]">cost per {caseUnitType || "unit"}</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-brand-300">{formatCurrency(effectiveCostPerUnit)}</div>
                <div className="text-xs text-[#9c8876]">effective cost (after yield)</div>
              </div>
            </div>
          )}
          <input type="hidden" name="case_price" value={casePrice} />
          <input type="hidden" name="units_per_case" value={unitsPerCase} />
          <input type="hidden" name="case_unit_type" value={caseUnitType} />
          <input type="hidden" name="yield_percent" value={yieldPercent} />
        </div>

        {/* Live cost summary */}
        {ingredients.some(i => i.quantity > 0 && i.cost_per_unit > 0) && (
          <div className="card p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-brand-300">{formatCurrency(costPerServing)}</div>
                <div className="text-xs text-[#9c8876] mt-0.5">cost per serving</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{formatCurrency(totalCost)}</div>
                <div className="text-xs text-[#9c8876] mt-0.5">total cost</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{servingsValue || 0}</div>
                <div className="text-xs text-[#9c8876] mt-0.5">servings</div>
              </div>
            </div>
          </div>
        )}

        {state?.error && (
          <div className="card p-4 bg-red-900/20 border-red-800/50">
            <p className="text-sm text-red-300">{state.error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Creating..." : "Create Recipe"}
          </button>
        </div>
      </form>
    </div>
  );
}
