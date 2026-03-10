"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  ChefHat,
  Utensils,
  ClipboardCheck,
  Download,
  Printer,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Package,
  Check,
} from "lucide-react";
import {
  getEventPrepBreakdown,
  type PrepBreakdownData,
  type IngredientBreakdownItem,
  type DishBreakdownItem,
  type KitchenTask,
} from "@/lib/actions/production";
import { generatePrepBreakdownPDF } from "@/lib/generatePrepBreakdownPDF";
import type { Event } from "@/types";

// ─── Station Colors (matching ProductionTab) ───
const STATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  garde_manger: { bg: "bg-blue-900/40", text: "text-blue-300", border: "border-blue-700" },
  hot_line: { bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-700" },
  pastry: { bg: "bg-pink-900/40", text: "text-pink-300", border: "border-pink-700" },
  butchery: { bg: "bg-red-900/40", text: "text-red-300", border: "border-red-700" },
  prep_kitchen: { bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-700" },
  beverage: { bg: "bg-purple-900/40", text: "text-purple-300", border: "border-purple-700" },
  packing: { bg: "bg-yellow-900/40", text: "text-yellow-300", border: "border-yellow-700" },
};

function stationColor(station: string | null) {
  if (!station) return { bg: "bg-[#1A2538]", text: "text-[#7A8BA8]", border: "border-[#2A3A5C]" };
  return STATION_COLORS[station.toLowerCase()] ?? { bg: "bg-[#1A2538]", text: "text-[#7A8BA8]", border: "border-[#2A3A5C]" };
}

function stationLabel(station: string | null) {
  if (!station) return "Unassigned";
  return station.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── View Tabs ───
type ViewTab = "by_ingredient" | "by_dish" | "kitchen_sheet";

const VIEW_TABS: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
  { key: "by_ingredient", label: "By Ingredient", icon: <Package className="w-3.5 h-3.5" /> },
  { key: "by_dish", label: "By Dish", icon: <Utensils className="w-3.5 h-3.5" /> },
  { key: "kitchen_sheet", label: "Kitchen Sheet", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
];

// ─── Main Component ───
export function PrepBreakdownSection({ eventId, event }: { eventId: string; event: Event }) {
  const [activeView, setActiveView] = useState<ViewTab>("by_ingredient");
  const [data, setData] = useState<PrepBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEventPrepBreakdown(eventId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load prep breakdown");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <Loader2 className="w-8 h-8 text-[#D4A373] mx-auto mb-3 animate-spin" />
        <p className="text-sm text-[#7A8BA8]">Loading prep breakdown...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!data || (data.byIngredient.length === 0 && data.byDish.length === 0)) {
    return (
      <div className="card p-8 text-center">
        <ChefHat className="w-8 h-8 text-[#D4A373] mx-auto mb-3" />
        <p className="text-sm text-[#7A8BA8]">
          No prep breakdown data. Generate production first, or add menu items with linked recipes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#7A8BA8]">
        <span>{data.guestCount} guests</span>
        <span>{data.byDish.length} dish{data.byDish.length !== 1 ? "es" : ""}</span>
        <span>{data.byIngredient.length} ingredient{data.byIngredient.length !== 1 ? "s" : ""}</span>
        <span>{data.kitchenTasks.length} task{data.kitchenTasks.length !== 1 ? "s" : ""}</span>
      </div>

      {/* View tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeView === tab.key
                ? "bg-[#D4A373] text-[#0C1220]"
                : "bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === "by_ingredient" && <ByIngredientView data={data} />}
      {activeView === "by_dish" && <ByDishView data={data} />}
      {activeView === "kitchen_sheet" && <KitchenSheetView data={data} event={event} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// View A: By Ingredient
// ═══════════════════════════════════════════════
function ByIngredientView({ data }: { data: PrepBreakdownData }) {
  const [filter, setFilter] = useState<"all" | "needs_ordering">("all");

  const filtered = useMemo(() => {
    if (filter === "needs_ordering") return data.byIngredient.filter((i) => i.needsOrdering);
    return data.byIngredient;
  }, [data.byIngredient, filter]);

  const needsOrderingCount = data.byIngredient.filter((i) => i.needsOrdering).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-[#F4F1ED]">Ingredients Breakdown</h3>
        <div className="flex items-center gap-2">
          {needsOrderingCount > 0 && (
            <button
              onClick={() => setFilter(filter === "all" ? "needs_ordering" : "all")}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
                filter === "needs_ordering"
                  ? "bg-red-900/40 text-red-300 border border-red-700"
                  : "bg-[#1A2538] text-[#D4A373] border border-[#2A3A5C] hover:bg-[#223050]"
              }`}
            >
              {filter === "needs_ordering" ? "Show All" : `${needsOrderingCount} Need Ordering`}
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#7A8BA8] border-b border-[#2A3A5C]">
              <th className="px-4 py-2 font-medium">Ingredient</th>
              <th className="px-4 py-2 font-medium">Total Qty</th>
              <th className="px-4 py-2 font-medium">Unit</th>
              <th className="px-4 py-2 font-medium">Used In</th>
              <th className="px-4 py-2 font-medium">Inventory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A3A5C]">
            {filtered.map((item, idx) => (
              <IngredientRow key={idx} item={item} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[#7A8BA8]">
            {filter === "needs_ordering" ? "All ingredients are in stock." : "No ingredients found."}
          </div>
        )}
      </div>
    </div>
  );
}

function IngredientRow({ item }: { item: IngredientBreakdownItem }) {
  const [expanded, setExpanded] = useState(false);

  let statusBadge;
  if (item.inventoryStatus === "in_stock") {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        In Stock ({item.inventoryAvailable})
      </span>
    );
  } else if (item.inventoryStatus === "low") {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700">
        <AlertTriangle className="w-3 h-3" />
        Low ({item.inventoryAvailable})
      </span>
    );
  } else if (item.inventoryStatus === "not_in_stock") {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700">
        <AlertCircle className="w-3 h-3" />
        Not in Stock
      </span>
    );
  } else {
    statusBadge = (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2538] text-[#7A8BA8] border border-[#2A3A5C]">
        No Data
      </span>
    );
  }

  let rowBg = "";
  if (item.inventoryStatus === "in_stock") rowBg = "bg-emerald-950/5";
  else if (item.inventoryStatus === "low") rowBg = "bg-amber-950/10";
  else if (item.inventoryStatus === "not_in_stock") rowBg = "bg-red-950/10";

  return (
    <>
      <tr
        className={`hover:bg-[#182030] transition-colors cursor-pointer ${rowBg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2.5 text-[#F4F1ED] font-medium">
          <span className="flex items-center gap-2">
            <CircleDot className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""} ${
              item.needsOrdering ? "text-red-400" : "text-[#D4A373]"
            }`} />
            {item.ingredientName}
          </span>
        </td>
        <td className="px-4 py-2.5 text-[#D4A373] font-medium">{item.totalQuantity}</td>
        <td className="px-4 py-2.5 text-[#7A8BA8]">{item.unit}</td>
        <td className="px-4 py-2.5 text-[#7A8BA8] text-xs">
          {item.dishes.map((d) => d.dishName).join(", ")}
        </td>
        <td className="px-4 py-2.5">{statusBadge}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-4 py-3 bg-[#0C1220]">
            <div className="text-xs space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-2">Per-Dish Breakdown</div>
              {item.dishes.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1 px-3 rounded bg-[#111827]">
                  <span className="text-[#F4F1ED]">{d.dishName}</span>
                  <span className="text-[#D4A373]">{Math.ceil(d.quantity * 100) / 100} {item.unit}</span>
                </div>
              ))}
              {item.needsOrdering && (
                <div className="mt-2 px-3 py-2 rounded bg-red-950/20 border border-red-900/40 text-red-300 text-[10px]">
                  Needs ordering: {item.inventoryStatus === "low"
                    ? `${Math.ceil((item.totalQuantity - item.inventoryAvailable) * 100) / 100} ${item.unit} more needed`
                    : `${item.totalQuantity} ${item.unit} needed`
                  }
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════
// View B: By Dish
// ═══════════════════════════════════════════════
function ByDishView({ data }: { data: PrepBreakdownData }) {
  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, DishBreakdownItem[]>();
    for (const dish of data.byDish) {
      const cat = dish.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(dish);
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [data.byDish]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-[#F4F1ED]">Dish Breakdown</h3>
      {grouped.map(([category, dishes]) => (
        <div key={category}>
          <div className="text-[10px] uppercase tracking-wider text-[#D4A373] mb-2 px-1">{category}</div>
          <div className="space-y-3">
            {dishes.map((dish, idx) => (
              <DishCard key={idx} dish={dish} guestCount={data.guestCount} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DishCard({ dish, guestCount }: { dish: DishBreakdownItem; guestCount: number }) {
  const [expanded, setExpanded] = useState(false);
  const sc = stationColor(dish.station);

  return (
    <div className="card overflow-hidden">
      <div
        className="px-4 py-3 bg-[#182030] border-b border-[#2A3A5C] cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <ChefHat className="w-4 h-4 text-[#D4A373]" />
          <div>
            <h4 className="font-medium text-sm text-[#F4F1ED]">{dish.dishName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#D4A373]">
                {dish.quantityNeeded} servings
              </span>
              <span className="text-[10px] text-[#7A8BA8]">
                ({dish.scaleFactor.toFixed(1)}x scale from {dish.recipeServings} servings)
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dish.station && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
              {stationLabel(dish.station)}
            </span>
          )}
          {!dish.recipeId && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300 border border-amber-700">
              No Recipe
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Batch scaling info */}
          <div className="flex items-center gap-4 text-xs text-[#7A8BA8]">
            <span>Recipe serves: {dish.recipeServings}</span>
            <span>Needed: {dish.quantityNeeded} ({guestCount} guests)</span>
            <span>Scale: {dish.scaleFactor.toFixed(2)}x</span>
          </div>

          {/* Ingredients */}
          {dish.ingredients.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-2">Scaled Ingredients</div>
              <div className="grid gap-1">
                {dish.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#0C1220] text-xs">
                    <span className="text-[#F4F1ED]">{ing.name}</span>
                    <span className="text-[#D4A373]">{ing.quantity} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#7A8BA8] italic">No ingredients — link a recipe to see scaled quantities.</div>
          )}

          {/* Prep notes */}
          {dish.prepNotes && (
            <div className="text-xs text-[#7A8BA8] bg-[#0C1220] rounded px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-[#D4A373] block mb-1">Prep Notes</span>
              {dish.prepNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// View C: Kitchen Production Sheet
// ═══════════════════════════════════════════════
function KitchenSheetView({ data, event }: { data: PrepBreakdownData; event: Event }) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  // Group by station
  const grouped = useMemo(() => {
    const map = new Map<string, KitchenTask[]>();
    for (const task of data.kitchenTasks) {
      const key = task.station;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return Array.from(map.entries());
  }, [data.kitchenTasks]);

  const completedCount = Object.values(completed).filter(Boolean).length;

  function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  const handleExport = () => {
    const doc = generatePrepBreakdownPDF(event, data);
    doc.save(`kitchen-prep-${slugify(event.name)}.pdf`);
  };

  const handlePrint = () => {
    const doc = generatePrepBreakdownPDF(event, data);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  };

  return (
    <div className="space-y-4">
      {/* Header with progress and export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-sm text-[#F4F1ED]">Kitchen Production Sheet</h3>
          <span className="text-[10px] text-[#7A8BA8]">
            {completedCount}/{data.kitchenTasks.length} tasks done
          </span>
          {data.kitchenTasks.length > 0 && (
            <div className="w-24 h-1.5 rounded-full bg-[#1A2538] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4A373] transition-all"
                style={{ width: `${(completedCount / data.kitchenTasks.length) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Grouped by station */}
      {grouped.map(([station, tasks]) => {
        const sc = stationColor(station);
        const stationCompleted = tasks.filter((t) => completed[t.id]).length;
        return (
          <div key={station} className={`card overflow-hidden border ${sc.border}`}>
            <div className={`px-4 py-3 ${sc.bg} border-b ${sc.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <h4 className={`font-medium text-sm ${sc.text}`}>{stationLabel(station)}</h4>
                <span className="text-[10px] text-[#7A8BA8]">
                  {stationCompleted}/{tasks.length} done
                </span>
              </div>
            </div>
            <div className="divide-y divide-[#2A3A5C]">
              {tasks.map((task) => {
                const isDone = completed[task.id] || false;
                return (
                  <div key={task.id} className={`px-4 py-3 transition-colors ${isDone ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => setCompleted((prev) => ({ ...prev, [task.id]: !isDone }))}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 ${
                          isDone
                            ? "bg-[#D4A373] border-[#D4A373]"
                            : "border-[#2A3A5C] hover:border-[#D4A373]"
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5 text-[#0C1220]" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium ${isDone ? "line-through text-[#7A8BA8]" : "text-[#F4F1ED]"}`}>
                            {task.taskName}
                          </span>
                          <span className="text-xs text-[#D4A373] whitespace-nowrap">
                            {task.batchQuantity} {task.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7A8BA8] mt-0.5">
                          For: {task.dishName}
                        </div>

                        {/* Ingredients sub-list */}
                        {task.ingredients.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {task.ingredients.map((ing, i) => (
                              <div key={i} className="text-[10px] text-[#7A8BA8] bg-[#0C1220] rounded px-2 py-1">
                                {ing.name}: <span className="text-[#D4A373]">{ing.quantity} {ing.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Prep notes */}
                        {task.prepNotes && (
                          <div className="mt-1.5 text-[10px] text-[#7A8BA8] italic">{task.prepNotes}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
