"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Recipe } from "@/types";
import { Search, X, Check, BookOpen } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (recipes: Recipe[]) => void;
}

export function RecipePickerModal({ open, onClose, onSelect }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    setLoading(true);

    const supabase = createClient();
    supabase
      .from("recipes")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setRecipes((data as Recipe[]) ?? []);
        setLoading(false);
      });
  }, [open]);

  if (!open) return null;

  const filtered = recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    const picked = recipes.filter((r) => selected.has(r.id));
    onSelect(picked);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1a1714] border border-[#2e271f] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2e271f]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <h2 className="font-medium text-sm">Import from Recipes</h2>
          </div>
          <button onClick={onClose} className="text-[#6b5a4a] hover:text-[#f5ede0] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#2e271f]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b5a4a]" />
            <input
              className="input pl-9 text-sm w-full"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-xs text-[#6b5a4a] text-center py-8">Loading recipes...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-[#6b5a4a] text-center py-8">
              {recipes.length === 0 ? "No recipes yet. Create recipes first." : "No matches found."}
            </p>
          ) : (
            filtered.map((r) => {
              const isSelected = selected.has(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all mb-1 ${
                    isSelected
                      ? "bg-brand-950 border border-brand-700"
                      : "hover:bg-[#251f19] border border-transparent"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      isSelected
                        ? "bg-brand-600 border-brand-500"
                        : "border-[#3d3028]"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{r.name}</span>
                      {r.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#251f19] text-[#9c8876] flex-shrink-0">
                          {r.category}
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-[#6b5a4a] truncate mt-0.5">{r.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-brand-300">
                      {formatCurrency(r.cost_per_serving)}
                    </div>
                    <div className="text-[10px] text-[#6b5a4a]">per serving</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#2e271f]">
          <span className="text-xs text-[#6b5a4a]">
            {selected.size} recipe{selected.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import to menu
          </button>
        </div>
      </div>
    </div>
  );
}
