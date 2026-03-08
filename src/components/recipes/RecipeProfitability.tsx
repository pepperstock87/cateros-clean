"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, BarChart3, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type RecipeRow = {
  id: string;
  name: string;
  category: string | null;
  cost_per_serving: number;
  selling_price: number;
  servings: number;
};

function getMargin(recipe: RecipeRow) {
  if (!recipe.selling_price || recipe.selling_price === 0) return 0;
  return ((recipe.selling_price - recipe.cost_per_serving) / recipe.selling_price) * 100;
}

function getProfit(recipe: RecipeRow) {
  return recipe.selling_price - recipe.cost_per_serving;
}

function marginColor(margin: number) {
  if (margin >= 60) return "text-green-400";
  if (margin >= 40) return "text-yellow-400";
  return "text-red-400";
}

function marginBadgeBg(margin: number) {
  if (margin >= 60) return "bg-green-900/30 text-green-400";
  if (margin >= 40) return "bg-yellow-900/30 text-yellow-400";
  return "bg-red-900/30 text-red-400";
}

export function RecipeProfitability({ recipes }: { recipes: RecipeRow[] }) {
  const [sortField, setSortField] = useState<"margin" | "name" | "cost" | "profit">("margin");
  const [sortAsc, setSortAsc] = useState(false);

  const recipesWithMargin = recipes.map((r) => ({
    ...r,
    margin: getMargin(r),
    profit: getProfit(r),
  }));

  const sorted = [...recipesWithMargin].sort((a, b) => {
    let diff = 0;
    switch (sortField) {
      case "margin":
        diff = a.margin - b.margin;
        break;
      case "name":
        diff = a.name.localeCompare(b.name);
        break;
      case "cost":
        diff = a.cost_per_serving - b.cost_per_serving;
        break;
      case "profit":
        diff = a.profit - b.profit;
        break;
    }
    return sortAsc ? diff : -diff;
  });

  const validRecipes = recipesWithMargin.filter((r) => r.selling_price > 0);
  const avgMargin = validRecipes.length > 0
    ? validRecipes.reduce((sum, r) => sum + r.margin, 0) / validRecipes.length
    : 0;
  const bestRecipe = validRecipes.length > 0
    ? validRecipes.reduce((best, r) => (r.margin > best.margin ? r : best))
    : null;
  const worstRecipe = validRecipes.length > 0
    ? validRecipes.reduce((worst, r) => (r.margin < worst.margin ? r : worst))
    : null;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-[#D4A373]" />
            <span className="text-xs text-[#D4A373] uppercase tracking-wider">Average Margin</span>
          </div>
          <div className={`text-2xl font-semibold ${marginColor(avgMargin)}`}>
            {avgMargin.toFixed(1)}%
          </div>
          <p className="text-xs text-[#7A8BA8] mt-1">{validRecipes.length} recipes with pricing</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[#D4A373] uppercase tracking-wider">Best Margin</span>
          </div>
          {bestRecipe ? (
            <>
              <div className="text-2xl font-semibold text-green-400">{bestRecipe.margin.toFixed(1)}%</div>
              <p className="text-xs text-[#D4A373] mt-1 truncate">{bestRecipe.name}</p>
            </>
          ) : (
            <div className="text-sm text-[#7A8BA8]">No data</div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-[#D4A373] uppercase tracking-wider">Worst Margin</span>
          </div>
          {worstRecipe ? (
            <>
              <div className={`text-2xl font-semibold ${marginColor(worstRecipe.margin)}`}>
                {worstRecipe.margin.toFixed(1)}%
              </div>
              <p className="text-xs text-[#D4A373] mt-1 truncate">{worstRecipe.name}</p>
            </>
          ) : (
            <div className="text-sm text-[#7A8BA8]">No data</div>
          )}
        </div>
      </div>

      {/* Profitability Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A3A5C]">
                <th
                  className="text-left px-5 py-3 text-[10px] font-medium text-[#D4A373] uppercase tracking-wider cursor-pointer hover:text-[#F4F1ED] transition-colors"
                  onClick={() => toggleSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-[#D4A373] uppercase tracking-wider">
                  Category
                </th>
                <th
                  className="text-right px-5 py-3 text-[10px] font-medium text-[#D4A373] uppercase tracking-wider cursor-pointer hover:text-[#F4F1ED] transition-colors"
                  onClick={() => toggleSort("cost")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Cost/Serving
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="text-right px-5 py-3 text-[10px] font-medium text-[#D4A373] uppercase tracking-wider">
                  Price/Serving
                </th>
                <th
                  className="text-right px-5 py-3 text-[10px] font-medium text-[#D4A373] uppercase tracking-wider cursor-pointer hover:text-[#F4F1ED] transition-colors"
                  onClick={() => toggleSort("margin")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Margin %
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="text-right px-5 py-3 text-[10px] font-medium text-[#D4A373] uppercase tracking-wider cursor-pointer hover:text-[#F4F1ED] transition-colors"
                  onClick={() => toggleSort("profit")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Profit/Serving
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#7A8BA8]">
                    No recipes found
                  </td>
                </tr>
              ) : (
                sorted.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="border-b border-[#1e1a14] last:border-0 hover:bg-[#1A2538] transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-[#F4F1ED]">{recipe.name}</td>
                    <td className="px-5 py-3 text-[#D4A373]">
                      {recipe.category || <span className="text-[#7A8BA8]">--</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-[#D4A373]">
                      {formatCurrency(recipe.cost_per_serving)}
                    </td>
                    <td className="px-5 py-3 text-right text-[#F4F1ED]">
                      {recipe.selling_price > 0
                        ? formatCurrency(recipe.selling_price)
                        : <span className="text-[#7A8BA8]">Not set</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {recipe.selling_price > 0 ? (
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${marginBadgeBg(recipe.margin)}`}>
                          {recipe.margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#7A8BA8]">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {recipe.selling_price > 0 ? (
                        <span className={marginColor(recipe.margin)}>
                          {formatCurrency(recipe.profit)}
                        </span>
                      ) : (
                        <span className="text-[#7A8BA8]">--</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
