"use client";

import { useState, useMemo } from "react";
import { Check, ChefHat, DollarSign, Filter, ShoppingCart, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type RecipeItem = {
  id: string;
  name: string;
  category: string | null;
  cost_per_serving: number;
  selling_price: number;
  servings: number;
};

const CATEGORY_ORDER = ["Appetizers", "Mains", "Sides", "Desserts", "Beverages", "Salads", "Soups", "Breads"];

function getCategoryOrder(cat: string | null) {
  if (!cat) return 999;
  const idx = CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === cat.toLowerCase());
  return idx >= 0 ? idx : 500;
}

function getMargin(recipe: RecipeItem) {
  if (!recipe.selling_price || recipe.selling_price === 0) return 0;
  return ((recipe.selling_price - recipe.cost_per_serving) / recipe.selling_price) * 100;
}

function marginColor(margin: number) {
  if (margin >= 60) return "text-green-400";
  if (margin >= 40) return "text-yellow-400";
  return "text-red-400";
}

function suggestRecipes(recipes: RecipeItem[], eventType: string): Set<string> {
  const suggested = new Set<string>();
  const type = eventType.toLowerCase();

  // Simple heuristic: suggest recipes based on event type
  const categorySuggestions: Record<string, string[]> = {
    wedding: ["Appetizers", "Mains", "Sides", "Desserts"],
    corporate: ["Appetizers", "Mains", "Sides"],
    birthday: ["Mains", "Sides", "Desserts"],
    brunch: ["Mains", "Sides", "Beverages"],
    cocktail: ["Appetizers", "Beverages"],
    buffet: ["Appetizers", "Mains", "Sides", "Desserts"],
  };

  const matchedCategories = Object.entries(categorySuggestions).find(([key]) =>
    type.includes(key)
  )?.[1] || ["Appetizers", "Mains", "Sides", "Desserts"];

  recipes.forEach((r) => {
    if (r.category && matchedCategories.some((c) => c.toLowerCase() === r.category?.toLowerCase())) {
      suggested.add(r.id);
    }
  });

  return suggested;
}

export function MenuBuilder({
  eventType,
  guestCount,
  recipes,
}: {
  eventType: string;
  guestCount: number;
  recipes: RecipeItem[];
}) {
  const suggested = useMemo(() => suggestRecipes(recipes, eventType), [recipes, eventType]);
  const [selected, setSelected] = useState<Set<string>>(new Set(suggested));
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = [...new Set(recipes.map((r) => r.category).filter(Boolean))] as string[];
    return cats.sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (categoryFilter === "all") return recipes;
    if (categoryFilter === "uncategorized") return recipes.filter((r) => !r.category);
    return recipes.filter((r) => r.category === categoryFilter);
  }, [recipes, categoryFilter]);

  const groupedRecipes = useMemo(() => {
    const groups: Record<string, RecipeItem[]> = {};
    filteredRecipes.forEach((r) => {
      const cat = r.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => getCategoryOrder(a) - getCategoryOrder(b)
    );
  }, [filteredRecipes]);

  const toggleRecipe = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedRecipes = recipes.filter((r) => selected.has(r.id));
  const totalFoodCost = selectedRecipes.reduce((sum, r) => sum + r.cost_per_serving * guestCount, 0);
  const totalPerGuest = selectedRecipes.reduce((sum, r) => sum + r.cost_per_serving, 0);
  const totalSellingPerGuest = selectedRecipes.reduce((sum, r) => sum + (r.selling_price || r.cost_per_serving), 0);
  const suggestedPrice = totalSellingPerGuest * guestCount;
  const overallMargin = suggestedPrice > 0 ? ((suggestedPrice - totalFoodCost) / suggestedPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-[#9c8876]">
          <Users className="w-4 h-4" />
          <span>{guestCount} guests</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#9c8876]">
          <ChefHat className="w-4 h-4" />
          <span className="capitalize">{eventType || "Event"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#9c8876]">
          <ShoppingCart className="w-4 h-4" />
          <span>{selected.size} items selected</span>
        </div>

        {/* Category filter */}
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6b5a4a]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#1a1714] border border-[#2e271f] rounded-lg px-3 py-1.5 text-sm text-[#f5ede0] focus:outline-none focus:border-brand-600"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            {recipes.some((r) => !r.category) && (
              <option value="uncategorized">Uncategorized</option>
            )}
          </select>
        </div>
      </div>

      {/* Recipe groups */}
      <div className="space-y-6">
        {groupedRecipes.map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((recipe) => {
                const isSelected = selected.has(recipe.id);
                const margin = getMargin(recipe);
                const totalCostForGuests = recipe.cost_per_serving * guestCount;

                return (
                  <button
                    key={recipe.id}
                    onClick={() => toggleRecipe(recipe.id)}
                    className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? "bg-brand-950 border-brand-800/60"
                        : "bg-[#1a1714] border-[#2e271f] hover:border-[#3a3228]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm text-[#f5ede0] leading-tight">
                        {recipe.name}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ml-2 transition-colors ${
                          isSelected
                            ? "bg-brand-600 border-brand-600"
                            : "border-[#3a3228] bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6b5a4a]">Cost/serving</span>
                        <span className="text-[#9c8876]">{formatCurrency(recipe.cost_per_serving)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6b5a4a]">Total ({guestCount} guests)</span>
                        <span className="text-[#f5ede0]">{formatCurrency(totalCostForGuests)}</span>
                      </div>
                      {recipe.selling_price > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#6b5a4a]">Margin</span>
                          <span className={`font-semibold ${marginColor(margin)}`}>
                            {margin.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {groupedRecipes.length === 0 && (
          <div className="card p-12 text-center">
            <ChefHat className="w-8 h-8 text-[#3a3228] mx-auto mb-3" />
            <p className="text-sm text-[#6b5a4a]">No recipes match the current filter</p>
          </div>
        )}
      </div>

      {/* Running Total Footer */}
      <div className="card p-5 sticky bottom-4 border-brand-800/30 bg-[#1a1714]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-brand-400" />
          <h3 className="font-medium text-sm">Menu Summary</h3>
          <span className="text-xs text-[#9c8876]">({selected.size} items)</span>
        </div>

        {selected.size === 0 ? (
          <p className="text-sm text-[#6b5a4a]">Select recipes to build your menu</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[#6b5a4a] mb-1">Total Food Cost</div>
              <div className="text-lg font-semibold text-[#f5ede0]">{formatCurrency(totalFoodCost)}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b5a4a] mb-1">Cost Per Guest</div>
              <div className="text-lg font-semibold text-[#9c8876]">{formatCurrency(totalPerGuest)}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b5a4a] mb-1">Suggested Price</div>
              <div className="text-lg font-semibold text-brand-300">{formatCurrency(suggestedPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b5a4a] mb-1">Overall Margin</div>
              <div className={`text-lg font-semibold ${marginColor(overallMargin)}`}>
                {overallMargin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
