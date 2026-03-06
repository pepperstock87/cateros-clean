"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Recipe } from "@/types";

type IngredientDraft = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  cost_per_unit: string;
};

function blankIngredient(): IngredientDraft {
  return { id: crypto.randomUUID(), name: "", quantity: "", unit: "lb", cost_per_unit: "" };
}

function calcCost(ing: IngredientDraft): number {
  return (parseFloat(ing.quantity) || 0) * (parseFloat(ing.cost_per_unit) || 0);
}

export default function RecipeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [servings, setServings] = useState("4");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([blankIngredient()]);
  const [casePrice, setCasePrice] = useState("");
  const [unitsPerCase, setUnitsPerCase] = useState("");
  const [caseUnitType, setCaseUnitType] = useState("");
  const [yieldPercent, setYieldPercent] = useState("100");

  const totalCost = ingredients.reduce((sum, ing) => sum + calcCost(ing), 0);
  const costPerServing = parseFloat(servings) > 0 ? totalCost / parseFloat(servings) : 0;

  const costPerUnit = (parseFloat(casePrice) || 0) / (parseFloat(unitsPerCase) || 1);
  const effectiveCostPerUnit = costPerUnit / ((parseFloat(yieldPercent) || 100) / 100);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) { toast.error("Recipe not found"); router.push("/recipes"); return; }
      const recipe: Recipe = await res.json();
      setName(recipe.name);
      setDescription(recipe.description ?? "");
      setCategory(recipe.category ?? "");
      setServings(String(recipe.servings));
      setIngredients(
        recipe.ingredients.length > 0
          ? recipe.ingredients.map(ing => ({
              id: ing.id,
              name: ing.name,
              quantity: String(ing.quantity),
              unit: ing.unit,
              cost_per_unit: String(ing.cost_per_unit),
            }))
          : [blankIngredient()]
      );
      setCasePrice(recipe.case_price != null ? String(recipe.case_price) : "");
      setUnitsPerCase(recipe.units_per_case != null ? String(recipe.units_per_case) : "");
      setCaseUnitType(recipe.case_unit_type ?? "");
      setYieldPercent(recipe.yield_percent != null ? String(recipe.yield_percent) : "100");
      setLoading(false);
    }
    load();
  }, [id]);

  function updateIngredient(id: string, field: keyof IngredientDraft, value: string) {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Recipe name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          servings: parseFloat(servings),
          ingredients: ingredients
            .filter(ing => ing.name.trim())
            .map(ing => ({
              id: ing.id,
              name: ing.name.trim(),
              quantity: parseFloat(ing.quantity) || 0,
              unit: ing.unit,
              cost_per_unit: parseFloat(ing.cost_per_unit) || 0,
              total_cost: calcCost(ing),
            })),
          total_cost: totalCost,
          cost_per_serving: costPerServing,
          case_price: casePrice ? parseFloat(casePrice) : null,
          units_per_case: unitsPerCase ? parseFloat(unitsPerCase) : null,
          case_unit_type: caseUnitType || null,
          yield_percent: yieldPercent ? parseFloat(yieldPercent) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Recipe saved");
      router.push(`/recipes/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="card p-16 text-center text-[#9c8876] text-sm">Loading…</div>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href={`/recipes/${id}`} className="flex items-center gap-2 text-sm text-[#9c8876] hover:text-[#f5ede0] transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to recipe
        </Link>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="card p-6 mb-4 space-y-4">
        <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider">Details</h2>
        <div>
          <label className="block text-xs text-[#9c8876] mb-1">Recipe name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Piccata" className="input w-full" />
        </div>
        <div>
          <label className="block text-xs text-[#9c8876] mb-1">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional short description" className="input w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#9c8876] mb-1">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Entrée, Appetizer" className="input w-full" />
          </div>
          <div>
            <label className="block text-xs text-[#9c8876] mb-1">Servings *</label>
            <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="1" className="input w-full" />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider">Ingredients</h2>
          <button onClick={() => setIngredients(prev => [...prev, blankIngredient()])} className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add ingredient
          </button>
        </div>
        <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-[#9c8876] uppercase tracking-wider mb-2">
          <span className="col-span-4">Name</span>
          <span className="col-span-2">Qty</span>
          <span className="col-span-2">Unit</span>
          <span className="col-span-3">Cost/unit</span>
          <span className="col-span-1"></span>
        </div>
        <div className="space-y-2">
          {ingredients.map(ing => (
            <div key={ing.id} className="grid grid-cols-12 gap-2 items-center">
              <input type="text" value={ing.name} onChange={e => updateIngredient(ing.id, "name", e.target.value)} placeholder="Ingredient" className="input col-span-4 text-sm" />
              <input type="number" value={ing.quantity} onChange={e => updateIngredient(ing.id, "quantity", e.target.value)} placeholder="0" min="0" step="0.01" className="input col-span-2 text-sm" />
              <select value={ing.unit} onChange={e => updateIngredient(ing.id, "unit", e.target.value)} className="input col-span-2 text-sm">
                {["lb","oz","kg","g","each","cup","tbsp","tsp","liter","ml","case","bunch"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9c8876]">$</span>
                <input type="number" value={ing.cost_per_unit} onChange={e => updateIngredient(ing.id, "cost_per_unit", e.target.value)} placeholder="0.00" min="0" step="0.01" className="input w-full pl-6 text-sm" />
              </div>
              <button onClick={() => setIngredients(prev => prev.length === 1 ? prev : prev.filter(i => i.id !== ing.id))} className="col-span-1 flex justify-center text-[#6b5a4a] hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 mb-4">
        <h2 className="font-medium text-sm text-[#9c8876] uppercase tracking-wider mb-4">Case Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
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
          <div className="mt-4 pt-4 border-t border-[#2e271f] grid grid-cols-2 gap-4">
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
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-brand-300">{formatCurrency(costPerServing)}</div>
            <div className="text-xs text-[#9c8876] mt-0.5">cost per person</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-[#9c8876] mt-0.5">total cost</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{servings || 0}</div>
            <div className="text-xs text-[#9c8876] mt-0.5">servings</div>
          </div>
        </div>
      </div>
    </div>
  );
}
