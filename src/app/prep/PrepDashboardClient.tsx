"use client";

import { useState, useMemo, useTransition } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  CircleMinus,
  ArrowUpDown,
  Users,
  UtensilsCrossed,
  ListChecks,
} from "lucide-react";
import {
  getConsolidatedPrepBreakdown,
  type ConsolidatedPrepData,
  type ConsolidatedIngredient,
} from "@/lib/actions/production";
import { generatePrepShoppingPDF } from "@/lib/generatePrepPDF";

type EventInfo = {
  id: string;
  name: string;
  event_date: string;
  client_name: string;
  guest_count: number;
  venue: string | null;
  status: string;
  menuItemCount: number;
};

type Props = {
  events: EventInfo[];
};

type DatePreset = "today" | "this_week" | "next_7" | "this_month" | "custom";
type SortField = "name" | "quantity" | "shortfall";
type ViewMode = "ingredients" | "events";

function getDateRange(preset: DatePreset): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "this_week": {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: fmt(monday), end: fmt(sunday) };
    }
    case "next_7": {
      const end = new Date(today);
      end.setDate(today.getDate() + 7);
      return { start: fmt(today), end: fmt(end) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    default:
      return { start: fmt(today), end: fmt(today) };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function roundQty(n: number): string {
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(2);
}

const STATUS_COLORS = {
  sufficient: { bg: "bg-emerald-900/30", text: "text-emerald-400", border: "border-emerald-800/50" },
  partial: { bg: "bg-amber-900/30", text: "text-amber-400", border: "border-amber-800/50" },
  need_to_order: { bg: "bg-red-900/30", text: "text-red-400", border: "border-red-800/50" },
};

const STATUS_LABELS = {
  sufficient: "In Stock",
  partial: "Partial",
  need_to_order: "Need to Order",
};

export function PrepDashboardClient({ events }: Props) {
  const [isPending, startTransition] = useTransition();

  // Date range state
  const [preset, setPreset] = useState<DatePreset>("next_7");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Data state
  const [prepData, setPrepData] = useState<ConsolidatedPrepData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("ingredients");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [needsOrderOnly, setNeedsOrderOnly] = useState(false);
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (preset === "custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return getDateRange(preset);
  }, [preset, customStart, customEnd]);

  // Events in the date range (from initial server data, for quick preview)
  const eventsInRange = useMemo(() => {
    return events.filter((e) => e.event_date >= dateRange.start && e.event_date <= dateRange.end);
  }, [events, dateRange]);

  function loadData() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getConsolidatedPrepBreakdown({
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        setPrepData(result);
        setLoaded(true);
      } catch (err: any) {
        setError(err?.message || "Failed to load prep data");
      }
    });
  }

  // Filtered & sorted ingredients
  const filteredIngredients = useMemo(() => {
    if (!prepData) return [];
    let items = [...prepData.ingredients];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.ingredientName.toLowerCase().includes(q));
    }
    if (needsOrderOnly) {
      items = items.filter((i) => i.status !== "sufficient");
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.ingredientName.localeCompare(b.ingredientName);
          break;
        case "quantity":
          cmp = a.totalQuantity - b.totalQuantity;
          break;
        case "shortfall":
          cmp = a.shortfall - b.shortfall;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [prepData, search, needsOrderOnly, sortField, sortAsc]);

  // Grouped by category for shopping list
  const ingredientsByCategory = useMemo(() => {
    const groups: Record<string, ConsolidatedIngredient[]> = {};
    for (const ing of filteredIngredients) {
      if (!groups[ing.category]) groups[ing.category] = [];
      groups[ing.category].push(ing);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredIngredients]);

  function toggleExpanded(key: string) {
    setExpandedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  }

  function handleExportPDF() {
    if (!prepData) return;
    const orderItems = prepData.ingredients.filter((i) => i.status !== "sufficient");
    generatePrepShoppingPDF({
      ingredients: orderItems.length > 0 ? orderItems : prepData.ingredients,
      dateRange,
      events: prepData.events,
      title: orderItems.length > 0 ? "Shopping List — Items to Order" : "Full Ingredient List",
    });
  }

  // Per-event breakdown: get the selected event's ingredient data from consolidated data
  const selectedEventIngredients = useMemo(() => {
    if (!prepData || !selectedEventId) return [];
    return prepData.ingredients
      .filter((ing) => ing.events.some((e) => e.eventId === selectedEventId))
      .map((ing) => {
        const eventEntry = ing.events.find((e) => e.eventId === selectedEventId)!;
        return { ingredientName: ing.ingredientName, quantity: eventEntry.quantity, unit: ing.unit };
      })
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
  }, [prepData, selectedEventId]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-brand-400" />
            Prep Command Center
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Consolidated ingredient and prep breakdown across all events
          </p>
        </div>
        {prepData && (
          <button
            onClick={handleExportPDF}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export Shopping List
          </button>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CalendarDays className="w-4 h-4" />
            <span className="font-medium">Date Range:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["today", "Today"],
              ["this_week", "This Week"],
              ["next_7", "Next 7 Days"],
              ["this_month", "This Month"],
              ["custom", "Custom"],
            ] as [DatePreset, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setPreset(key);
                  setLoaded(false);
                  setPrepData(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  preset === key
                    ? "bg-brand-950 text-brand-300 border-brand-800/60"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setLoaded(false); setPrepData(null); }}
                className="input-field text-sm"
              />
              <span className="text-[var(--text-muted)] text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setLoaded(false); setPrepData(null); }}
                className="input-field text-sm"
              />
            </div>
          )}
        </div>

        {/* Events in range preview */}
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>
            {eventsInRange.length} event{eventsInRange.length !== 1 ? "s" : ""} in range
            {eventsInRange.length > 0 && ": "}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {eventsInRange.slice(0, 6).map((ev) => (
              <span
                key={ev.id}
                className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
              >
                {ev.name} ({formatDate(ev.event_date)})
              </span>
            ))}
            {eventsInRange.length > 6 && (
              <span className="text-[var(--text-muted)]">+{eventsInRange.length - 6} more</span>
            )}
          </div>
        </div>

        {/* Load button */}
        {!loaded && (
          <div className="mt-4">
            <button
              onClick={loadData}
              disabled={isPending || (preset === "custom" && (!customStart || !customEnd))}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
              Load Prep Breakdown
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-6 border-red-800/50 bg-red-900/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isPending && (
        <div className="card p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">Crunching numbers across all events...</p>
        </div>
      )}

      {/* Empty data state */}
      {loaded && !isPending && prepData && prepData.totalEvents === 0 && (
        <div className="card p-16 text-center">
          <CalendarDays className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No events in this date range</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Try expanding your date range or check that events have a status of Draft, Proposed, or Confirmed.
          </p>
        </div>
      )}

      {/* Main content */}
      {loaded && !isPending && prepData && prepData.totalEvents > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Events</p>
                  <p className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{prepData.totalEvents}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-900/40 flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Ingredients</p>
                  <p className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{prepData.totalIngredients}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${prepData.totalNeedOrdering > 0 ? "bg-red-900/40" : "bg-emerald-900/40"}`}>
                  <ShoppingCart className={`w-5 h-5 ${prepData.totalNeedOrdering > 0 ? "text-red-400" : "text-emerald-400"}`} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Need Ordering</p>
                  <p className={`text-xl font-semibold ${prepData.totalNeedOrdering > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {prepData.totalNeedOrdering}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>In Stock</p>
                  <p className="text-xl font-semibold text-emerald-400">
                    {prepData.totalIngredients - prepData.totalNeedOrdering}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* View toggle + filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* View mode tabs */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setViewMode("ingredients")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  viewMode === "ingredients"
                    ? "bg-brand-950 text-brand-300"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Package className="w-3.5 h-3.5 inline mr-1.5" />
                Ingredients
              </button>
              <button
                onClick={() => setViewMode("events")}
                className={`px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--border)] ${
                  viewMode === "events"
                    ? "bg-brand-950 text-brand-300"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" />
                By Event
              </button>
            </div>

            {viewMode === "ingredients" && (
              <>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ingredients..."
                    className="input-field w-full pl-9"
                  />
                </div>
                <button
                  onClick={() => setNeedsOrderOnly(!needsOrderOnly)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    needsOrderOnly
                      ? "bg-red-900/40 text-red-300 border-red-700"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Needs Ordering Only
                </button>
                <button
                  onClick={loadData}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                  Refresh
                </button>
              </>
            )}
          </div>

          {/* ═══ Ingredients View ═══ */}
          {viewMode === "ingredients" && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
                      <th className="px-4 py-3 font-medium w-8"></th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        Ingredient {sortField === "name" && (sortAsc ? "\u2191" : "\u2193")}
                      </th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors text-right"
                        onClick={() => handleSort("quantity")}
                      >
                        Needed {sortField === "quantity" && (sortAsc ? "\u2191" : "\u2193")}
                      </th>
                      <th className="px-4 py-3 font-medium text-right">Available</th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors text-right"
                        onClick={() => handleSort("shortfall")}
                      >
                        Shortfall {sortField === "shortfall" && (sortAsc ? "\u2191" : "\u2193")}
                      </th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-center">Events</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                          {search || needsOrderOnly ? "No ingredients match your filters" : "No ingredients found for events in this range"}
                        </td>
                      </tr>
                    ) : (
                      filteredIngredients.map((ing) => {
                        const key = `${ing.ingredientName}|${ing.unit}`;
                        const isExpanded = expandedIngredients.has(key);
                        const colors = STATUS_COLORS[ing.status];
                        return (
                          <>
                            <tr
                              key={key}
                              className={`transition-colors cursor-pointer hover:bg-[var(--bg-hover)] ${
                                ing.status === "need_to_order" ? "bg-red-950/10" : ing.status === "partial" ? "bg-amber-950/10" : ""
                              }`}
                              onClick={() => toggleExpanded(key)}
                            >
                              <td className="px-4 py-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[var(--text-primary)] font-medium">{ing.ingredientName}</span>
                                <span className="ml-2 text-[var(--text-muted)] text-xs">{ing.unit}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                                  {ing.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                                {roundQty(ing.totalQuantity)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[var(--text-muted)]">
                                {roundQty(ing.inventoryAvailable)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                <span className={ing.shortfall > 0 ? "text-red-400 font-semibold" : "text-emerald-400"}>
                                  {ing.shortfall > 0 ? `-${roundQty(ing.shortfall)}` : "0"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                                  {ing.status === "sufficient" && <CheckCircle2 className="w-3 h-3" />}
                                  {ing.status === "partial" && <CircleMinus className="w-3 h-3" />}
                                  {ing.status === "need_to_order" && <AlertTriangle className="w-3 h-3" />}
                                  {STATUS_LABELS[ing.status]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-xs text-[var(--text-muted)]">
                                {ing.events.length}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${key}-detail`}>
                                <td colSpan={8} className="px-6 py-3 bg-[var(--bg-secondary)]">
                                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                    Events using {ing.ingredientName}
                                  </div>
                                  <div className="space-y-1.5">
                                    {ing.events.map((ev) => (
                                      <div
                                        key={ev.eventId}
                                        className="flex items-center justify-between px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)]"
                                      >
                                        <div className="flex items-center gap-3">
                                          <CalendarDays className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                          <span className="text-[var(--text-primary)] text-sm font-medium">{ev.eventName}</span>
                                          <span className="text-[var(--text-muted)] text-xs">{formatDate(ev.eventDate)}</span>
                                        </div>
                                        <span className="font-mono text-sm text-[var(--text-secondary)]">
                                          {roundQty(ev.quantity)} {ing.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ Events View ═══ */}
          {viewMode === "events" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event list */}
              <div className="lg:col-span-1">
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <h3 className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
                      Events in Range
                    </h3>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {prepData.events.map((ev) => (
                      <button
                        key={ev.eventId}
                        onClick={() => setSelectedEventId(ev.eventId === selectedEventId ? null : ev.eventId)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedEventId === ev.eventId
                            ? "bg-brand-950/60 border-l-2 border-l-brand-400"
                            : "hover:bg-[var(--bg-hover)]"
                        }`}
                      >
                        <div className="font-medium text-sm text-[var(--text-primary)]">{ev.eventName}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(ev.eventDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {ev.guestCount} guests
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                          <span>{ev.clientName}</span>
                          {ev.venue && <span>@ {ev.venue}</span>}
                        </div>
                        <div className="mt-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            ev.status === "confirmed"
                              ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50"
                              : ev.status === "proposed"
                              ? "bg-blue-900/30 text-blue-400 border-blue-800/50"
                              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)]"
                          }`}>
                            {ev.status}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-2">
                            {ev.menuItemCount} menu item{ev.menuItemCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                    ))}
                    {prepData.events.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        No events found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected event detail */}
              <div className="lg:col-span-2">
                {selectedEventId ? (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">
                        Ingredients for: {prepData.events.find((e) => e.eventId === selectedEventId)?.eventName}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
                            <th className="px-4 py-3 font-medium">Ingredient</th>
                            <th className="px-4 py-3 font-medium text-right">Quantity</th>
                            <th className="px-4 py-3 font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {selectedEventIngredients.map((ing) => (
                            <tr key={ing.ingredientName} className="hover:bg-[var(--bg-hover)] transition-colors">
                              <td className="px-4 py-2.5 text-[var(--text-primary)]">{ing.ingredientName}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-[var(--text-secondary)]">{roundQty(ing.quantity)}</td>
                              <td className="px-4 py-2.5 text-[var(--text-muted)]">{ing.unit}</td>
                            </tr>
                          ))}
                          {selectedEventIngredients.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)]">
                                No ingredients found. Make sure this event has menu items linked to recipes.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card p-16 text-center">
                    <CalendarDays className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      Select an event to view its ingredient breakdown
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
