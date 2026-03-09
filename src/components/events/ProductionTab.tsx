"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  RefreshCw,
  Loader2,
  ShoppingCart,
  Package,
  Clock,
  ChefHat,
  Layers,
  LayoutGrid,
  Plus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Check,
  Download,
  Printer,
  Bookmark,
  LayoutTemplate,
  Boxes,
} from "lucide-react";
import {
  generateProduction,
  toggleShoppingItem,
  togglePackItem,
  addPackItem,
  addTimelineItem,
  toggleTimelineItem,
  deleteTimelineItem,
} from "@/lib/actions/production";
import {
  checkInventoryForEvent,
  deductFromShoppingList,
} from "@/lib/actions/inventory";
import {
  generatePrepSheetPDF,
  generateConsolidatedPrepPDF,
  generateStationPrepPDF,
  generateShoppingListPDF,
  generatePackListPDF,
} from "@/lib/generateProductionPDFs";
import type {
  Event,
  EventPrepItem,
  EventShoppingItem,
  EventPackItem,
  EventTimelineItem,
} from "@/types";
import { SaveTemplateModal } from "./SaveTemplateModal";
import { LoadTemplateModal } from "./LoadTemplateModal";

// ─── Station Colors ───
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

// ─── Phase Labels ───
const PHASES = [
  { key: "two_days_out", label: "2 Days Out" },
  { key: "one_day_out", label: "1 Day Out" },
  { key: "day_of", label: "Day Of" },
  { key: "load_out", label: "Load Out" },
] as const;

type SubTab = "beo" | "prep_by_item" | "consolidated" | "by_station" | "shopping" | "pack_list" | "timeline";

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "beo", label: "BEO", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { key: "prep_by_item", label: "Prep by Item", icon: <ChefHat className="w-3.5 h-3.5" /> },
  { key: "consolidated", label: "Consolidated", icon: <Layers className="w-3.5 h-3.5" /> },
  { key: "by_station", label: "By Station", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { key: "shopping", label: "Shopping", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { key: "pack_list", label: "Pack List", icon: <Package className="w-3.5 h-3.5" /> },
  { key: "timeline", label: "Timeline", icon: <Clock className="w-3.5 h-3.5" /> },
];

// ─── Props ───
type Props = {
  eventId: string;
  event: Event;
  prepItems: EventPrepItem[];
  shoppingItems: EventShoppingItem[];
  packItems: EventPackItem[];
  timelineItems: EventTimelineItem[];
};

export function ProductionTab({ eventId, event, prepItems, shoppingItems, packItems, timelineItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("prep_by_item");
  const [generating, setGenerating] = useState(false);
  const [showRegenWarning, setShowRegenWarning] = useState(false);

  const hasData = prepItems.length > 0 || shoppingItems.length > 0 || packItems.length > 0 || timelineItems.length > 0;

  async function handleGenerate() {
    if (hasData && !showRegenWarning) {
      setShowRegenWarning(true);
      return;
    }
    setShowRegenWarning(false);
    setGenerating(true);
    try {
      await generateProduction(eventId);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to generate production");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Production Hub</h2>
          <p className="text-sm text-[#D4A373]">Prep lists, shopping, packing, and timeline for this event</p>
        </div>
        <div className="flex items-center gap-2">
          {showRegenWarning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>This will overwrite generated data.</span>
              <button onClick={handleGenerate} className="underline font-medium">Confirm</button>
              <button onClick={() => setShowRegenWarning(false)} className="text-yellow-500 hover:text-yellow-300">Cancel</button>
            </div>
          )}
          {!showRegenWarning && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasData ? (
                <RefreshCw className="w-4 h-4" />
              ) : (
                <ClipboardList className="w-4 h-4" />
              )}
              {generating ? "Generating..." : hasData ? "Regenerate Production" : "Generate Production"}
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasData && !generating && (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 text-[#D4A373] mx-auto mb-4" />
          <h3 className="font-medium text-base mb-2">No production data yet</h3>
          <p className="text-sm text-[#D4A373] mb-6 max-w-md mx-auto">
            Generate production from your menu items to create prep lists, shopping lists, pack lists, and a day-of timeline.
          </p>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary inline-flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Generate Production
          </button>
        </div>
      )}

      {/* Sub-tab navigation */}
      {(hasData || generating) && (
        <>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-6 pb-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSubTab === tab.key
                    ? "bg-[#D4A373] text-[#0C1220]"
                    : "bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          <div>
            {activeSubTab === "beo" && <BeoSection eventId={eventId} />}
            {activeSubTab === "prep_by_item" && <PrepByItemSection event={event} prepItems={prepItems} />}
            {activeSubTab === "consolidated" && <ConsolidatedSection event={event} prepItems={prepItems} />}
            {activeSubTab === "by_station" && <ByStationSection event={event} prepItems={prepItems} />}
            {activeSubTab === "shopping" && <ShoppingSection eventId={eventId} event={event} items={shoppingItems} />}
            {activeSubTab === "pack_list" && <PackListSection eventId={eventId} event={event} items={packItems} />}
            {activeSubTab === "timeline" && <TimelineSection eventId={eventId} items={timelineItems} />}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Export Helpers
// ═══════════════════════════════════════════════

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function ExportButtons({
  onExport,
  onPrint,
}: {
  onExport: () => void;
  onPrint?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export PDF
      </button>
      {onPrint && (
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// BEO Section
// ═══════════════════════════════════════════════
function BeoSection({ eventId }: { eventId: string }) {
  return (
    <div className="card p-8 text-center">
      <ClipboardList className="w-8 h-8 text-[#D4A373] mx-auto mb-3" />
      <h3 className="font-medium text-sm mb-2">Banquet Event Order</h3>
      <p className="text-sm text-[#D4A373] mb-4">View the full formatted BEO sheet for this event</p>
      <Link
        href={`/events/${eventId}/beo`}
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        <ExternalLink className="w-4 h-4" />
        View Full BEO
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Prep by Item Section
// ═══════════════════════════════════════════════
function PrepByItemSection({ event, prepItems }: { event: Event; prepItems: EventPrepItem[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, EventPrepItem[]>();
    for (const item of prepItems) {
      const key = item.menu_item_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [prepItems]);

  const handleExport = () => {
    const doc = generatePrepSheetPDF(event, prepItems);
    doc.save(`prep-sheet-${slugify(event.name)}.pdf`);
  };

  const handlePrint = () => {
    const doc = generatePrepSheetPDF(event, prepItems);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  };

  if (grouped.length === 0) {
    return <EmptySubTab message="No prep items yet. Generate production to populate prep lists." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm text-[#F4F1ED]">Prep by Item</h3>
        <ExportButtons onExport={handleExport} onPrint={handlePrint} />
      </div>
      {grouped.map(([menuName, items]) => (
        <div key={menuName} className="card overflow-hidden">
          <div className="px-4 py-3 bg-[#182030] border-b border-[#2A3A5C]">
            <h3 className="font-medium text-sm text-[#F4F1ED]">{menuName}</h3>
          </div>
          <div className="divide-y divide-[#2A3A5C]">
            {items.map((item) => {
              const sc = stationColor(item.station);
              return (
                <div key={item.id} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-[#F4F1ED] min-w-[140px]">{item.component_name}</span>
                  <span className="text-[#D4A373]">
                    {item.required_quantity} {item.unit}
                  </span>
                  {item.station && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {stationLabel(item.station)}
                    </span>
                  )}
                  {item.prep_notes && (
                    <span className="text-xs text-[#7A8BA8] italic">{item.prep_notes}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Consolidated Prep Section
// ═══════════════════════════════════════════════
function ConsolidatedSection({ event, prepItems }: { event: Event; prepItems: EventPrepItem[] }) {
  const [sortBy, setSortBy] = useState<"alpha" | "station">("alpha");

  const consolidated = useMemo(() => {
    const map = new Map<string, { component_name: string; total: number; unit: string; station: string | null }>();
    for (const item of prepItems) {
      const key = `${item.component_name.toLowerCase()}|${item.unit}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += item.required_quantity;
      } else {
        map.set(key, {
          component_name: item.component_name,
          total: item.required_quantity,
          unit: item.unit,
          station: item.station,
        });
      }
    }
    const arr = Array.from(map.values());
    if (sortBy === "station") {
      arr.sort((a, b) => (a.station ?? "zzz").localeCompare(b.station ?? "zzz"));
    } else {
      arr.sort((a, b) => a.component_name.localeCompare(b.component_name));
    }
    return arr;
  }, [prepItems, sortBy]);

  if (consolidated.length === 0) {
    return <EmptySubTab message="No prep items to consolidate." />;
  }

  const handleExport = () => {
    const doc = generateConsolidatedPrepPDF(event, prepItems);
    doc.save(`consolidated-prep-${slugify(event.name)}.pdf`);
  };

  const handlePrint = () => {
    const doc = generateConsolidatedPrepPDF(event, prepItems);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-[#182030] border-b border-[#2A3A5C] flex items-center justify-between">
        <h3 className="font-medium text-sm text-[#F4F1ED]">Consolidated Prep List</h3>
        <div className="flex items-center gap-2">
          <ExportButtons onExport={handleExport} onPrint={handlePrint} />
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy("alpha")}
              className={`text-[10px] px-2 py-0.5 rounded ${sortBy === "alpha" ? "bg-[#D4A373] text-[#0C1220]" : "bg-[#1A2538] text-[#D4A373]"}`}
            >
              A-Z
            </button>
            <button
              onClick={() => setSortBy("station")}
              className={`text-[10px] px-2 py-0.5 rounded ${sortBy === "station" ? "bg-[#D4A373] text-[#0C1220]" : "bg-[#1A2538] text-[#D4A373]"}`}
            >
              Station
            </button>
          </div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[#7A8BA8] border-b border-[#2A3A5C]">
            <th className="px-4 py-2 font-medium">Component</th>
            <th className="px-4 py-2 font-medium">Total Qty</th>
            <th className="px-4 py-2 font-medium">Unit</th>
            <th className="px-4 py-2 font-medium">Station</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A3A5C]">
          {consolidated.map((row, i) => {
            const sc = stationColor(row.station);
            return (
              <tr key={i} className="hover:bg-[#182030] transition-colors">
                <td className="px-4 py-2.5 text-[#F4F1ED]">{row.component_name}</td>
                <td className="px-4 py-2.5 text-[#D4A373]">{Math.round(row.total * 100) / 100}</td>
                <td className="px-4 py-2.5 text-[#7A8BA8]">{row.unit}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                    {stationLabel(row.station)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════
// By Station Section
// ═══════════════════════════════════════════════
function ByStationSection({ event, prepItems }: { event: Event; prepItems: EventPrepItem[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, EventPrepItem[]>();
    for (const item of prepItems) {
      const key = item.station ?? "__unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // Sort: named stations first, unassigned last
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      if (a[0] === "__unassigned") return 1;
      if (b[0] === "__unassigned") return -1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [prepItems]);

  const handleExportAll = () => {
    for (const [station, items] of grouped) {
      if (station === "__unassigned" || items.length === 0) continue;
      const doc = generateStationPrepPDF(event, prepItems, station);
      doc.save(`station-prep-${slugify(station)}-${slugify(event.name)}.pdf`);
    }
  };

  if (grouped.length === 0) {
    return <EmptySubTab message="No prep items to display by station." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm text-[#F4F1ED]">By Station</h3>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export All Stations
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      {grouped.map(([station, items]) => {
        const sc = stationColor(station === "__unassigned" ? null : station);
        return (
          <div key={station} className={`card overflow-hidden border ${sc.border}`}>
            <div className={`px-4 py-3 ${sc.bg} border-b ${sc.border}`}>
              <h3 className={`font-medium text-sm ${sc.text}`}>
                {station === "__unassigned" ? "Unassigned" : stationLabel(station)}
              </h3>
              <span className="text-[10px] text-[#7A8BA8]">{items.length} task{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-[#2A3A5C]">
              {items.map((item) => (
                <div key={item.id} className="px-4 py-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[#F4F1ED]">{item.component_name}</span>
                    <span className="text-[#D4A373] text-xs">
                      {item.required_quantity} {item.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#7A8BA8] mt-0.5">{item.menu_item_name}</div>
                  {item.prep_notes && <div className="text-[10px] text-[#7A8BA8] italic mt-0.5">{item.prep_notes}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Shopping List Section
// ═══════════════════════════════════════════════
function ShoppingSection({ eventId, event, items }: { eventId: string; event: Event; items: EventShoppingItem[] }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [inventoryStatus, setInventoryStatus] = useState<
    Record<string, { status: "in_stock" | "low" | "not_in_stock"; available: number }>
  >({});
  const [checkingInventory, setCheckingInventory] = useState(false);
  const [deductingInventory, setDeductingInventory] = useState(false);
  const [deductResult, setDeductResult] = useState<{
    deducted: { ingredient_name: string; deducted: number; unit: string }[];
    shortfall: { ingredient_name: string; needed: number; available: number; unit: string }[];
  } | null>(null);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aPurchased = optimistic[a.id] ?? a.purchased;
      const bPurchased = optimistic[b.id] ?? b.purchased;
      if (aPurchased !== bPurchased) return aPurchased ? 1 : -1;
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });
  }, [items, optimistic]);

  async function handleToggle(id: string, current: boolean) {
    setOptimistic((prev) => ({ ...prev, [id]: !current }));
    await toggleShoppingItem(id, !current);
  }

  async function handleCheckInventory() {
    setCheckingInventory(true);
    try {
      const result = await checkInventoryForEvent(eventId);
      const statusMap: Record<string, { status: "in_stock" | "low" | "not_in_stock"; available: number }> = {};
      for (const r of result) {
        statusMap[r.id] = { status: r.status, available: r.available };
      }
      setInventoryStatus(statusMap);
    } catch {
      alert("Failed to check inventory");
    } finally {
      setCheckingInventory(false);
    }
  }

  async function handleDeductInventory() {
    setDeductingInventory(true);
    try {
      const result = await deductFromShoppingList(eventId);
      setDeductResult(result);
      // Clear inventory status since quantities changed
      setInventoryStatus({});
      router.refresh();
    } catch {
      alert("Failed to deduct from inventory");
    } finally {
      setDeductingInventory(false);
    }
  }

  if (sorted.length === 0) {
    return <EmptySubTab message="No shopping items yet. Generate production to build a shopping list from recipe ingredients." />;
  }

  const purchasedCount = sorted.filter((i) => (optimistic[i.id] ?? i.purchased)).length;
  const hasInventoryStatus = Object.keys(inventoryStatus).length > 0;

  const handleExport = () => {
    const doc = generateShoppingListPDF(event, items);
    doc.save(`shopping-list-${slugify(event.name)}.pdf`);
  };

  const handlePrint = () => {
    const doc = generateShoppingListPDF(event, items);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  };

  function inventoryBadge(itemId: string) {
    const status = inventoryStatus[itemId];
    if (!status) return null;
    if (status.status === "in_stock") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700">
          In Stock ({status.available})
        </span>
      );
    }
    if (status.status === "low") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700">
          Low ({status.available})
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700">
        Not in Stock
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {/* Deduct result banner */}
      {deductResult && (
        <div className="card p-4 space-y-2">
          {deductResult.deducted.length > 0 && (
            <div className="text-xs text-emerald-400">
              Deducted {deductResult.deducted.length} item{deductResult.deducted.length !== 1 ? "s" : ""} from inventory.
            </div>
          )}
          {deductResult.shortfall.length > 0 && (
            <div className="text-xs text-amber-400">
              {deductResult.shortfall.length} item{deductResult.shortfall.length !== 1 ? "s" : ""} had insufficient stock — still need to purchase.
            </div>
          )}
          <button onClick={() => setDeductResult(null)} className="text-[10px] text-[#7A8BA8] hover:text-[#F4F1ED] underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-[#182030] border-b border-[#2A3A5C] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-sm text-[#F4F1ED]">Shopping List</h3>
            <span className="text-[10px] text-[#7A8BA8]">
              {purchasedCount}/{sorted.length} purchased
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckInventory}
              disabled={checkingInventory}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
            >
              {checkingInventory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-3.5 h-3.5" />}
              Check Inventory
            </button>
            <button
              onClick={handleDeductInventory}
              disabled={deductingInventory}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
            >
              {deductingInventory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-3.5 h-3.5" />}
              Deduct from Inventory
            </button>
            <ExportButtons onExport={handleExport} onPrint={handlePrint} />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#7A8BA8] border-b border-[#2A3A5C]">
              <th className="px-4 py-2 w-10"></th>
              <th className="px-4 py-2 font-medium">Ingredient</th>
              <th className="px-4 py-2 font-medium">Quantity</th>
              <th className="px-4 py-2 font-medium">Unit</th>
              <th className="px-4 py-2 font-medium">Vendor</th>
              {hasInventoryStatus && <th className="px-4 py-2 font-medium">Inventory</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A3A5C]">
            {sorted.map((item) => {
              const purchased = optimistic[item.id] ?? item.purchased;
              const status = inventoryStatus[item.id];
              let rowBg = "";
              if (status) {
                if (status.status === "in_stock") rowBg = "bg-emerald-950/10";
                else if (status.status === "low") rowBg = "bg-amber-950/10";
                else rowBg = "bg-red-950/10";
              }
              return (
                <tr key={item.id} className={`transition-colors ${purchased ? "opacity-50" : `hover:bg-[#182030] ${rowBg}`}`}>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleToggle(item.id, purchased)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        purchased
                          ? "bg-[#D4A373] border-[#D4A373]"
                          : "border-[#2A3A5C] hover:border-[#D4A373]"
                      }`}
                    >
                      {purchased && <Check className="w-3 h-3 text-[#0C1220]" />}
                    </button>
                  </td>
                  <td className={`px-4 py-2.5 ${purchased ? "line-through text-[#7A8BA8]" : "text-[#F4F1ED]"}`}>
                    {item.ingredient_name}
                  </td>
                  <td className="px-4 py-2.5 text-[#D4A373]">{Math.round(item.quantity * 100) / 100}</td>
                  <td className="px-4 py-2.5 text-[#7A8BA8]">{item.unit}</td>
                  <td className="px-4 py-2.5 text-[#7A8BA8]">{item.vendor ?? "—"}</td>
                  {hasInventoryStatus && (
                    <td className="px-4 py-2.5">{inventoryBadge(item.id)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Pack List Section
// ═══════════════════════════════════════════════
function PackListSection({ eventId, event, items }: { eventId: string; event: Event; items: EventPackItem[] }) {
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ item_name: "", quantity: "1", category: "" });
  const [adding, setAdding] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, EventPackItem[]>();
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [items]);

  async function handleToggle(id: string, current: boolean) {
    setOptimistic((prev) => ({ ...prev, [id]: !current }));
    await togglePackItem(id, !current);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.item_name.trim() || !formData.category.trim()) return;
    setAdding(true);
    try {
      await addPackItem(eventId, {
        item_name: formData.item_name.trim(),
        quantity: parseInt(formData.quantity) || 1,
        category: formData.category.trim(),
      });
      setFormData({ item_name: "", quantity: "1", category: "" });
      setShowForm(false);
      router.refresh();
    } catch {
      alert("Failed to add pack item");
    } finally {
      setAdding(false);
    }
  }

  const packedCount = items.filter((i) => (optimistic[i.id] ?? i.packed)).length;

  const handleExportPack = () => {
    const doc = generatePackListPDF(event, items);
    doc.save(`pack-list-${slugify(event.name)}.pdf`);
  };

  const handlePrintPack = () => {
    const doc = generatePackListPDF(event, items);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) win.onload = () => win.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-sm text-[#F4F1ED]">Pack List</h3>
          {items.length > 0 && (
            <span className="text-[10px] text-[#7A8BA8]">{packedCount}/{items.length} packed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <ExportButtons onExport={handleExportPack} onPrint={handlePrintPack} />
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save as Template
              </button>
            </>
          )}
          <button
            onClick={() => setShowLoadTemplate(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Load Template
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Template modals */}
      {showSaveTemplate && (
        <SaveTemplateModal
          category="pack_list"
          templateData={{
            packItems: items.map((i) => ({
              item_name: i.item_name,
              quantity: i.quantity,
              category: i.category,
              notes: i.notes,
            })),
          }}
          defaultName={`${event.name} Pack List`}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
      {showLoadTemplate && (
        <LoadTemplateModal
          category="pack_list"
          eventId={eventId}
          onClose={() => setShowLoadTemplate(false)}
          onApplied={() => router.refresh()}
        />
      )}

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] block mb-1">Item Name</label>
            <input
              value={formData.item_name}
              onChange={(e) => setFormData((f) => ({ ...f, item_name: e.target.value }))}
              className="input-field w-full"
              placeholder="Chafing dish"
              required
            />
          </div>
          <div className="w-20">
            <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] block mb-1">Qty</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData((f) => ({ ...f, quantity: e.target.value }))}
              className="input-field w-full"
              required
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] block mb-1">Category</label>
            <input
              value={formData.category}
              onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
              className="input-field w-full"
              placeholder="Rentals"
              required
            />
          </div>
          <button type="submit" disabled={adding} className="btn-primary text-xs h-9">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
          </button>
        </form>
      )}

      {items.length === 0 && !showForm ? (
        <EmptySubTab message="No pack list items yet. Generate production or add items manually." />
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, catItems]) => (
            <div key={category} className="card overflow-hidden">
              <div className="px-4 py-3 bg-[#182030] border-b border-[#2A3A5C] flex items-center justify-between">
                <h4 className="font-medium text-xs text-[#D4A373]">{category}</h4>
                <span className="text-[10px] text-[#7A8BA8]">{catItems.length} item{catItems.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-[#2A3A5C]">
                {catItems.map((item) => {
                  const packed = optimistic[item.id] ?? item.packed;
                  return (
                    <div key={item.id} className={`px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${packed ? "opacity-50" : ""}`}>
                      <button
                        onClick={() => handleToggle(item.id, packed)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                          packed
                            ? "bg-[#D4A373] border-[#D4A373]"
                            : "border-[#2A3A5C] hover:border-[#D4A373]"
                        }`}
                      >
                        {packed && <Check className="w-3 h-3 text-[#0C1220]" />}
                      </button>
                      <span className={`flex-1 ${packed ? "line-through text-[#7A8BA8]" : "text-[#F4F1ED]"}`}>
                        {item.item_name}
                      </span>
                      <span className="text-xs text-[#D4A373]">x{item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Timeline Section
// ═══════════════════════════════════════════════
function TimelineSection({ eventId, items }: { eventId: string; items: EventTimelineItem[] }) {
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [addingPhase, setAddingPhase] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ task: "", assigned_to: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const router = useRouter();

  const byPhase = useMemo(() => {
    const map = new Map<string, EventTimelineItem[]>();
    for (const phase of PHASES) {
      map.set(phase.key, []);
    }
    for (const item of items) {
      const list = map.get(item.phase) ?? [];
      list.push(item);
      map.set(item.phase, list);
    }
    return map;
  }, [items]);

  async function handleToggle(id: string, current: boolean) {
    setOptimistic((prev) => ({ ...prev, [id]: !current }));
    await toggleTimelineItem(id, !current);
  }

  async function handleDelete(id: string) {
    await deleteTimelineItem(id);
    router.refresh();
  }

  async function handleAddTask(phase: string) {
    if (!taskForm.task.trim()) return;
    setSaving(true);
    try {
      await addTimelineItem(eventId, {
        phase,
        task: taskForm.task.trim(),
        assigned_to: taskForm.assigned_to.trim() || undefined,
        notes: taskForm.notes.trim() || undefined,
      });
      setTaskForm({ task: "", assigned_to: "", notes: "" });
      setAddingPhase(null);
      router.refresh();
    } catch {
      alert("Failed to add task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Timeline template buttons */}
      <div className="flex items-center justify-end gap-2 mb-2">
        {items.length > 0 && (
          <button
            onClick={() => setShowSaveTemplate(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save as Template
          </button>
        )}
        <button
          onClick={() => setShowLoadTemplate(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C] transition-colors"
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Load Template
        </button>
      </div>

      {/* Template modals */}
      {showSaveTemplate && (
        <SaveTemplateModal
          category="timeline"
          templateData={{
            timelineItems: items.map((i) => ({
              phase: i.phase,
              task: i.task,
              sort_order: i.sort_order,
              assigned_to: i.assigned_to,
              notes: i.notes,
            })),
          }}
          defaultName="Timeline Template"
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
      {showLoadTemplate && (
        <LoadTemplateModal
          category="timeline"
          eventId={eventId}
          onClose={() => setShowLoadTemplate(false)}
          onApplied={() => router.refresh()}
        />
      )}

      {PHASES.map((phase) => {
        const phaseItems = byPhase.get(phase.key) ?? [];
        const completedCount = phaseItems.filter((i) => (optimistic[i.id] ?? i.completed)).length;
        return (
          <div key={phase.key} className="card overflow-hidden">
            <div className="px-4 py-3 bg-[#182030] border-b border-[#2A3A5C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#D4A373]" />
                <h4 className="font-medium text-sm text-[#F4F1ED]">{phase.label}</h4>
                {phaseItems.length > 0 && (
                  <span className="text-[10px] text-[#7A8BA8]">
                    {completedCount}/{phaseItems.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setAddingPhase(addingPhase === phase.key ? null : phase.key)}
                className="text-xs text-[#D4A373] hover:text-[#F4F1ED] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Task
              </button>
            </div>

            {/* Add task form */}
            {addingPhase === phase.key && (
              <div className="px-4 py-3 bg-[#0C1220] border-b border-[#2A3A5C]">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <input
                      value={taskForm.task}
                      onChange={(e) => setTaskForm((f) => ({ ...f, task: e.target.value }))}
                      className="input-field w-full text-xs"
                      placeholder="Task description"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      value={taskForm.assigned_to}
                      onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))}
                      className="input-field w-full text-xs"
                      placeholder="Assigned to"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      value={taskForm.notes}
                      onChange={(e) => setTaskForm((f) => ({ ...f, notes: e.target.value }))}
                      className="input-field w-full text-xs"
                      placeholder="Notes"
                    />
                  </div>
                  <button
                    onClick={() => handleAddTask(phase.key)}
                    disabled={saving || !taskForm.task.trim()}
                    className="btn-primary text-xs h-8"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </button>
                </div>
              </div>
            )}

            {phaseItems.length === 0 && addingPhase !== phase.key && (
              <div className="px-4 py-4 text-xs text-[#7A8BA8] text-center">No tasks in this phase</div>
            )}

            <div className="divide-y divide-[#2A3A5C]">
              {phaseItems.map((item) => {
                const completed = optimistic[item.id] ?? item.completed;
                return (
                  <div key={item.id} className={`px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${completed ? "opacity-50" : ""}`}>
                    <button
                      onClick={() => handleToggle(item.id, completed)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        completed
                          ? "bg-[#D4A373] border-[#D4A373]"
                          : "border-[#2A3A5C] hover:border-[#D4A373]"
                      }`}
                    >
                      {completed && <Check className="w-3 h-3 text-[#0C1220]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`${completed ? "line-through text-[#7A8BA8]" : "text-[#F4F1ED]"}`}>
                        {item.task}
                      </span>
                      <div className="flex gap-2 mt-0.5">
                        {item.assigned_to && (
                          <span className="text-[10px] text-[#D4A373]">{item.assigned_to}</span>
                        )}
                        {item.notes && (
                          <span className="text-[10px] text-[#7A8BA8] italic">{item.notes}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-[#7A8BA8] hover:text-red-400 transition-colors flex-shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

// ═══════════════════════════════════════════════
// Empty State
// ═══════════════════════════════════════════════
function EmptySubTab({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-sm text-[#7A8BA8]">{message}</p>
    </div>
  );
}
