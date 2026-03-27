"use client";

import { useState, useTransition, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Trash2,
  Pencil,
  Minus,
  ChevronDown,
  X,
  Loader2,
  DollarSign,
  Boxes,
  TrendingDown,
} from "lucide-react";
import type { InventoryItem } from "@/types";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustQuantity,
  deductFromShoppingList,
} from "@/lib/actions/inventory";
import { formatCurrency, safeParseDate } from "@/lib/utils";

const CATEGORIES = [
  "Proteins",
  "Dairy",
  "Produce",
  "Herbs",
  "Dry Goods",
  "Spices",
  "Oils & Vinegars",
  "Bakery",
  "Beverages",
  "Paper Goods",
  "Cleaning & Sanitation",
  "Smallwares",
  "Miscellaneous",
];

const LOCATIONS = [
  "Walk-in Cooler",
  "Walk-in Freezer",
  "Dry Storage",
  "Prep Kitchen",
  "Bar",
  "Front of House",
  "Off-site Storage",
  "Other",
];

type SimpleEvent = { id: string; name: string; event_date: string; status: string };

type Props = {
  items: InventoryItem[];
  events: SimpleEvent[];
};

const emptyForm = {
  ingredient_name: "",
  quantity_on_hand: 0,
  unit: "each",
  par_level: null as number | null,
  vendor: null as string | null,
  cost_per_unit: null as number | null,
  category: "Miscellaneous",
  location: null as string | null,
};

export function InventoryClient({ items, events }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeductModal, setShowDeductModal] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Deduct state
  const [selectedEventId, setSelectedEventId] = useState("");
  const [deducting, setDeducting] = useState(false);
  const [deductResult, setDeductResult] = useState<{
    deducted: { ingredient_name: string; deducted: number; unit: string }[];
    shortfall: { ingredient_name: string; needed: number; available: number; unit: string }[];
  } | null>(null);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.ingredient_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (lowStockOnly && (item.par_level === null || item.quantity_on_hand >= item.par_level)) return false;
      return true;
    });
  }, [items, search, categoryFilter, lowStockOnly]);

  // Summary stats
  const totalItems = items.length;
  const lowStockItems = items.filter(
    (i) => i.par_level !== null && i.quantity_on_hand < i.par_level
  ).length;
  const totalValue = items.reduce(
    (sum, i) => sum + (i.cost_per_unit ? i.quantity_on_hand * i.cost_per_unit : 0),
    0
  );

  function isLowStock(item: InventoryItem) {
    return item.par_level !== null && item.quantity_on_hand < item.par_level;
  }

  function openAdd() {
    setForm(emptyForm);
    setShowAddModal(true);
    setEditingItem(null);
  }

  function openEdit(item: InventoryItem) {
    setForm({
      ingredient_name: item.ingredient_name,
      quantity_on_hand: item.quantity_on_hand,
      unit: item.unit,
      par_level: item.par_level,
      vendor: item.vendor,
      cost_per_unit: item.cost_per_unit,
      category: item.category,
      location: item.location,
    });
    setEditingItem(item);
    setShowAddModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredient_name.trim()) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          ...form,
          ingredient_name: form.ingredient_name.trim(),
        });
      } else {
        await addInventoryItem({
          ...form,
          ingredient_name: form.ingredient_name.trim(),
        });
      }
      setShowAddModal(false);
      setEditingItem(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteInventoryItem(id);
      setDeletingId(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to delete");
    }
  }

  async function handleAdjust(id: string, adj: number) {
    startTransition(async () => {
      try {
        await adjustQuantity(id, adj);
        router.refresh();
      } catch (err: any) {
        alert(err?.message || "Failed to adjust");
      }
    });
  }

  // Press-and-hold acceleration for +/- buttons
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback((id: string, adj: number) => {
    stopHold();
    let count = 0;
    const tick = () => {
      handleAdjust(id, adj);
      count += 1;
      const nextDelay = count < 3 ? 300 : count < 8 ? 150 : 50;
      holdRef.current = setTimeout(tick, nextDelay);
    };
    holdRef.current = setTimeout(tick, 400);
  }, []);

  const stopHold = useCallback(() => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  async function handleDeduct() {
    if (!selectedEventId) return;
    setDeducting(true);
    try {
      const result = await deductFromShoppingList(selectedEventId) as any;
      setDeductResult(result);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to deduct");
    } finally {
      setDeducting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Ingredient Inventory</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {totalItems} items tracked · Manage stock levels, par levels, and costs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowDeductModal(true);
              setDeductResult(null);
              setSelectedEventId("");
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <TrendingDown className="w-4 h-4" />
            Deduct from Event
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Items</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lowStockItems > 0 ? "bg-amber-900/40" : "bg-emerald-900/40"}`}>
              <AlertTriangle className={`w-5 h-5 ${lowStockItems > 0 ? "text-amber-400" : "text-emerald-400"}`} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Low Stock</p>
              <p className={`text-xl font-semibold ${lowStockItems > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {lowStockItems}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Value</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field pr-8 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        </div>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            lowStockOnly
              ? "bg-amber-900/40 text-amber-300 border-amber-700"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock Only
        </button>
      </div>

      {/* Inventory Table */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Package className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">
            {items.length === 0 ? "No inventory items yet" : "No items match your filters"}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {items.length === 0
              ? "Add ingredients to track stock levels, par levels, and costs."
              : "Try adjusting your search or filters."}
          </p>
          {items.length === 0 && (
            <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add first item
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  <th className="px-4 py-3 font-medium">Ingredient</th>
                  <th className="px-4 py-3 font-medium">On Hand</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Par Level</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Cost/Unit</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => {
                  const low = isLowStock(item);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        low
                          ? "bg-amber-950/20 hover:bg-amber-950/30"
                          : "hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {low && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                          <span className="text-[var(--text-primary)] font-medium">{item.ingredient_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAdjust(item.id, -1)}
                            onMouseDown={() => startHold(item.id, -1)}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={() => startHold(item.id, -1)}
                            onTouchEnd={stopHold}
                            disabled={isPending}
                            className="w-6 h-6 rounded border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors select-none"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`min-w-[40px] text-center font-medium ${low ? "text-amber-400" : "text-[var(--text-secondary)]"}`}>
                            {item.quantity_on_hand}
                          </span>
                          <button
                            onClick={() => handleAdjust(item.id, 1)}
                            onMouseDown={() => startHold(item.id, 1)}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={() => startHold(item.id, 1)}
                            onTouchEnd={stopHold}
                            disabled={isPending}
                            className="w-6 h-6 rounded border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors select-none"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.unit}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {item.par_level !== null ? item.par_level : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.vendor ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {item.cost_per_unit !== null ? formatCurrency(item.cost_per_unit) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.location ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs" suppressHydrationWarning>
                        {new Date(item.last_updated).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {deletingId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-[10px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700 hover:bg-red-900/60"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="text-[10px] px-2 py-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(item.id)}
                              className="p-1.5 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Add/Edit Modal ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-display text-lg font-semibold">
                {editingItem ? "Edit Item" : "Add Inventory Item"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Ingredient Name *
                </label>
                <input
                  value={form.ingredient_name}
                  onChange={(e) => setForm((f) => ({ ...f, ingredient_name: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g. Olive Oil"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Quantity on Hand *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.quantity_on_hand}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quantity_on_hand: parseFloat(e.target.value) || 0 }))
                    }
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Unit *
                  </label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="input-field w-full"
                    placeholder="each, lb, oz, gal..."
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Par Level
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.par_level ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        par_level: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    className="input-field w-full"
                    placeholder="Reorder point"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Cost per Unit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_per_unit ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        cost_per_unit: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    className="input-field w-full"
                    placeholder="$0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="input-field w-full appearance-none cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Vendor
                  </label>
                  <input
                    value={form.vendor ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vendor: e.target.value || null }))
                    }
                    className="input-field w-full"
                    placeholder="Supplier name"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Storage Location
                </label>
                <div className="relative">
                  <select
                    value={form.location ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value || null }))
                    }
                    className="input-field w-full appearance-none cursor-pointer"
                  >
                    <option value="">Select location...</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Deduct from Event Modal ═══ */}
      {showDeductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-display text-lg font-semibold">Deduct from Event</h2>
              <button
                onClick={() => {
                  setShowDeductModal(false);
                  setDeductResult(null);
                }}
                className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!deductResult ? (
                <>
                  <p className="text-sm text-[var(--text-muted)]">
                    Select an event to deduct its shopping list quantities from your inventory.
                  </p>
                  <div className="relative">
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="input-field w-full appearance-none cursor-pointer"
                    >
                      <option value="">Select an event...</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name} — {safeParseDate(ev.event_date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeductModal(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeduct}
                      disabled={!selectedEventId || deducting}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      {deducting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Deduct Inventory
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {deductResult.deducted.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">
                        Successfully Deducted
                      </h3>
                      <div className="space-y-1">
                        {deductResult.deducted.map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded bg-emerald-900/20 border border-emerald-800/40 text-sm"
                          >
                            <span className="text-[var(--text-primary)]">{d.ingredient_name}</span>
                            <span className="text-emerald-400">
                              -{d.deducted} {d.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {deductResult.shortfall.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">
                        Shortfall — Still Needed
                      </h3>
                      <div className="space-y-1">
                        {deductResult.shortfall.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded bg-amber-900/20 border border-amber-800/40 text-sm"
                          >
                            <span className="text-[var(--text-primary)]">{s.ingredient_name}</span>
                            <span className="text-amber-400">
                              Need {s.needed} {s.unit}
                              {s.available > 0 && ` (had ${s.available})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {deductResult.deducted.length === 0 && deductResult.shortfall.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                      No shopping items found for this event. Generate production first.
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowDeductModal(false);
                        setDeductResult(null);
                      }}
                      className="btn-primary text-sm"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
