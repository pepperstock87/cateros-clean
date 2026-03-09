"use client";

import { useState } from "react";
import { X, Search, Link2, Plus } from "lucide-react";
import type { PrepStation } from "@/types";

const STATIONS: { value: PrepStation; label: string }[] = [
  { value: "garde_manger", label: "Garde Manger" },
  { value: "hot_line", label: "Hot Line" },
  { value: "pastry", label: "Pastry" },
  { value: "butchery", label: "Butchery" },
  { value: "prep_kitchen", label: "Prep Kitchen" },
  { value: "beverage", label: "Beverage" },
  { value: "packing", label: "Packing" },
];

interface LinkedRecipe {
  id: string;
  recipe_id: string;
  recipe_name: string;
  quantity_per_serving: number;
  unit: string;
  station: string | null;
}

interface Props {
  menuItemName: string;
  linkedRecipes: LinkedRecipe[];
  availableRecipes: Array<{ id: string; name: string; station: string | null }>;
  onLink: (recipeId: string, data?: { quantity_per_serving?: number; unit?: string; station?: string }) => void;
  onUnlink: (mappingId: string) => void;
  onUpdateMapping?: (mappingId: string, updates: Partial<Pick<LinkedRecipe, "quantity_per_serving" | "unit" | "station">>) => void;
  onClose: () => void;
}

export function MenuItemRecipeLinker({
  menuItemName,
  linkedRecipes,
  availableRecipes,
  onLink,
  onUnlink,
  onUpdateMapping,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Filter out already-linked recipes and apply search
  const linkedIds = new Set(linkedRecipes.map((r) => r.recipe_id));
  const filteredRecipes = availableRecipes.filter(
    (r) =>
      !linkedIds.has(r.id) &&
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectRecipe = (recipeId: string) => {
    onLink(recipeId);
    setSearch("");
    setShowSearch(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#182030] border border-[#2A3A5C] rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A3A5C]">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="w-4 h-4 text-[#D4A373] flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-medium text-sm truncate">Link Recipes</h2>
              <p className="text-xs text-[#7A8BA8] truncate">{menuItemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Linked recipes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {linkedRecipes.length === 0 && !showSearch ? (
            <div className="text-center py-8 border border-dashed border-[#2A3A5C] rounded-lg">
              <Link2 className="w-6 h-6 text-[#7A8BA8] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#D4A373] mb-1">No recipes linked</p>
              <p className="text-xs text-[#7A8BA8] mb-3">
                Link recipes to auto-generate prep lists.
              </p>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="btn-primary text-xs px-3 py-1.5"
              >
                + Link a Recipe
              </button>
            </div>
          ) : (
            <>
              {linkedRecipes.map((lr) => (
                <div
                  key={lr.id}
                  className="bg-[#0C1220] border border-[#2A3A5C] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#F4F1ED] truncate">
                      {lr.recipe_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUnlink(lr.id)}
                      className="text-[#7A8BA8] hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                      title="Unlink recipe"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Quantity per serving */}
                    <div>
                      <label className="text-[10px] text-[#7A8BA8] uppercase tracking-wider block mb-1">
                        Qty / Serving
                      </label>
                      <input
                        type="number"
                        className="input text-sm w-full"
                        value={lr.quantity_per_serving}
                        min={0.01}
                        step={0.1}
                        onChange={(e) =>
                          onUpdateMapping?.(lr.id, {
                            quantity_per_serving: parseFloat(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    {/* Unit */}
                    <div>
                      <label className="text-[10px] text-[#7A8BA8] uppercase tracking-wider block mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        className="input text-sm w-full"
                        value={lr.unit}
                        placeholder="serving"
                        onChange={(e) =>
                          onUpdateMapping?.(lr.id, { unit: e.target.value })
                        }
                      />
                    </div>
                    {/* Station */}
                    <div>
                      <label className="text-[10px] text-[#7A8BA8] uppercase tracking-wider block mb-1">
                        Station
                      </label>
                      <select
                        className="input text-sm w-full"
                        value={lr.station || ""}
                        onChange={(e) =>
                          onUpdateMapping?.(lr.id, {
                            station: e.target.value || null,
                          })
                        }
                      >
                        <option value="">None</option>
                        {STATIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Search / add recipe section */}
          {showSearch && (
            <div className="border border-[#2A3A5C] rounded-lg overflow-hidden">
              <div className="p-2 border-b border-[#2A3A5C]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A8BA8]" />
                  <input
                    className="input pl-9 text-sm w-full"
                    placeholder="Search recipes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredRecipes.length === 0 ? (
                  <p className="text-xs text-[#7A8BA8] text-center py-4">
                    {availableRecipes.length === 0
                      ? "No recipes available. Create recipes first."
                      : "No matching recipes found."}
                  </p>
                ) : (
                  filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRecipe(r.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#1F2A44] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4A373] flex-shrink-0" />
                      <span className="text-sm text-[#F4F1ED] truncate">{r.name}</span>
                      {r.station && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F2A44] text-[#D4A373] flex-shrink-0 ml-auto">
                          {r.station}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#2A3A5C]">
          <span className="text-xs text-[#7A8BA8]">
            {linkedRecipes.length} recipe{linkedRecipes.length !== 1 ? "s" : ""} linked
          </span>
          <div className="flex items-center gap-2">
            {(linkedRecipes.length > 0 || !showSearch) && (
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {showSearch ? "Hide search" : "Link recipe"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-primary px-4 py-2 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
