"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Package,
  Wine,
  DollarSign,
  AlertOctagon,
  Brain,
  HelpCircle,
  CalendarDays,
  Utensils,
  RotateCcw,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type { CainEventPlan, CainDraftRecipe } from "@/lib/cain/types";
import type { MenuItem, StaffingLine, RentalLine, BarPackage } from "@/types";
import { calculatePricing } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { RecipeDraftReview } from "./RecipeDraftReview";
import { ShoppingPreview } from "./ShoppingPreview";
import { PrepPreview } from "./PrepPreview";
import { MarginInsight } from "./MarginInsight";
import { TimelinePreview } from "./TimelinePreview";
import { ProcurementPreview } from "./ProcurementPreview";

interface PlanReviewProps {
  plan: CainEventPlan;
  onCommit: (plan: CainEventPlan) => Promise<void>;
  onStartOver: () => void;
}

// ---- Collapsible Section ----
function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-primary)]/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-[#D4A373]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          {badge}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>
      {open && <div className="px-5 pb-5 border-t border-[var(--border)]">{children}</div>}
    </div>
  );
}

// ---- Editable Table Row Input ----
function CellInput({
  value,
  onChange,
  type = "text",
  className = "",
  min,
  step,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  min?: number;
  step?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      step={step}
      className={`input text-xs bg-[var(--bg-primary)] border-[var(--border)] rounded-md px-2 py-1.5 w-full ${className}`}
    />
  );
}

// ---- Confidence Badge ----
function ConfidenceBadge({ confidence }: { confidence: "exact" | "partial" | "none" }) {
  if (confidence === "exact")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Matched
      </span>
    );
  if (confidence === "partial")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-400">
        <AlertTriangle className="w-3 h-3" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400">
      <XCircle className="w-3 h-3" /> No Match
    </span>
  );
}

// ---- Main Component ----
export function PlanReview({ plan, onCommit, onStartOver }: PlanReviewProps) {
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  // Editable event details
  const [eventDetails, setEventDetails] = useState({ ...plan.event });

  // Editable pricing items
  const [menuItems, setMenuItems] = useState<MenuItem[]>(
    plan.pricing.menuItems.map((m) => ({ ...m, category: (m.category || undefined) as MenuItem["category"] }))
  );
  const [staffing, setStaffing] = useState<StaffingLine[]>(
    plan.pricing.staffing.map((s) => ({ ...s }))
  );
  const [rentals, setRentals] = useState<RentalLine[]>(
    plan.pricing.rentals.map((r) => ({ ...r }))
  );
  const [barPackage, setBarPackage] = useState<BarPackage | null>(
    plan.pricing.barPackage ? { ...plan.pricing.barPackage, type: plan.pricing.barPackage.type as BarPackage["type"] } : null
  );
  const [adminPercent, setAdminPercent] = useState(plan.pricing.adminPercent);
  const [taxPercent, setTaxPercent] = useState(plan.pricing.taxPercent);
  const [targetMarginPercent, setTargetMarginPercent] = useState(plan.pricing.targetMarginPercent);

  // Editable timeline
  const [timeline, setTimeline] = useState([...plan.timeline.map((t) => ({ ...t }))]);

  // Recipe matches (read-only reference)
  const recipeMatches = plan.recipeMatches;

  // Draft recipes (editable)
  const [draftRecipes, setDraftRecipes] = useState<CainDraftRecipe[]>(
    (plan.draftRecipes || []).map((d) => ({ ...d, recipe: { ...d.recipe, ingredients: [...d.recipe.ingredients] } }))
  );

  // Calculated pricing
  const pricing = useMemo(
    () =>
      calculatePricing({
        guestCount: eventDetails.guest_count,
        menuItems,
        staffing,
        rentals,
        barPackage,
        adminPercent,
        taxPercent,
        targetMarginPercent,
      }),
    [eventDetails.guest_count, menuItems, staffing, rentals, barPackage, adminPercent, taxPercent, targetMarginPercent]
  );

  // Build final plan for commit
  const buildFinalPlan = useCallback((): CainEventPlan => {
    return {
      ...plan,
      event: eventDetails,
      pricing: {
        ...pricing,
        guestCount: eventDetails.guest_count,
        menuItems,
        staffing,
        rentals,
        barPackage,
        adminPercent,
        taxPercent,
        targetMarginPercent,
      },
      timeline,
      draftRecipes,
    };
  }, [plan, eventDetails, pricing, menuItems, staffing, rentals, barPackage, adminPercent, taxPercent, targetMarginPercent, timeline, draftRecipes]);

  async function handleCommit() {
    setCommitting(true);
    setCommitError(null);
    try {
      await onCommit(buildFinalPlan());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create event";
      setCommitError(message);
    } finally {
      setCommitting(false);
    }
  }

  // Helpers for menu items
  function addMenuItem() {
    setMenuItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", costPerPerson: 0, quantity: eventDetails.guest_count, category: "Other" },
    ]);
  }
  function removeMenuItem(id: string) {
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  }
  function updateMenuItem(id: string, field: keyof MenuItem, value: string | number) {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  // Helpers for staffing
  function addStaffLine() {
    setStaffing((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "", hourlyRate: 0, hours: 0, headcount: 1 },
    ]);
  }
  function removeStaffLine(id: string) {
    setStaffing((prev) => prev.filter((s) => s.id !== id));
  }
  function updateStaffLine(id: string, field: keyof StaffingLine, value: string | number) {
    setStaffing((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  // Helpers for rentals
  function addRentalLine() {
    setRentals((prev) => [
      ...prev,
      { id: crypto.randomUUID(), item: "", unitCost: 0, quantity: 1 },
    ]);
  }
  function removeRentalLine(id: string) {
    setRentals((prev) => prev.filter((r) => r.id !== id));
  }
  function updateRentalLine(id: string, field: keyof RentalLine, value: string | number) {
    setRentals((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  // Helpers for timeline
  function addTimelineEntry() {
    setTimeline((prev) => [...prev, { phase: "", task: "", start_time: "", duration_minutes: 0 }]);
  }
  function removeTimelineEntry(idx: number) {
    setTimeline((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateTimelineEntry(idx: number, field: string, value: string | number) {
    setTimeline((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  }

  function getRecipeMatch(menuItemName: string) {
    return recipeMatches.find(
      (m) => m.menuItemName.toLowerCase() === menuItemName.toLowerCase()
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* ---- Event Details ---- */}
      <Section title="Event Details" icon={CalendarDays}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Event Name</label>
            <CellInput value={eventDetails.name} onChange={(v) => setEventDetails((p) => ({ ...p, name: v }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Client Name</label>
            <CellInput value={eventDetails.client_name} onChange={(v) => setEventDetails((p) => ({ ...p, client_name: v }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Event Date</label>
            <CellInput type="date" value={eventDetails.event_date} onChange={(v) => setEventDetails((p) => ({ ...p, event_date: v }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Guest Count</label>
            <CellInput type="number" min={1} value={eventDetails.guest_count} onChange={(v) => setEventDetails((p) => ({ ...p, guest_count: parseInt(v) || 0 }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Venue</label>
            <CellInput value={eventDetails.venue || ""} onChange={(v) => setEventDetails((p) => ({ ...p, venue: v }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Notes</label>
            <textarea
              value={eventDetails.notes || ""}
              onChange={(e) => setEventDetails((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="input w-full text-xs bg-[var(--bg-primary)] border-[var(--border)] rounded-md px-2 py-1.5 resize-none"
            />
          </div>
        </div>
      </Section>

      {/* ---- Menu ---- */}
      <Section
        title="Menu"
        icon={Utensils}
        badge={
          <span className="text-[10px] text-[var(--text-muted)] ml-1">
            {menuItems.length} item{menuItems.length !== 1 ? "s" : ""}
          </span>
        }
      >
        <div className="pt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="text-left py-2 pr-2 font-medium">Name</th>
                <th className="text-left py-2 pr-2 font-medium w-24">Category</th>
                <th className="text-right py-2 pr-2 font-medium w-24">Cost/Person</th>
                <th className="text-right py-2 pr-2 font-medium w-20">Qty</th>
                <th className="text-center py-2 pr-2 font-medium w-20">Recipe</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {menuItems.map((item) => {
                const match = getRecipeMatch(item.name);
                return (
                  <tr key={item.id}>
                    <td className="py-2 pr-2">
                      <CellInput value={item.name} onChange={(v) => updateMenuItem(item.id, "name", v)} />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={item.category || "Other"}
                        onChange={(e) => updateMenuItem(item.id, "category", e.target.value)}
                        className="input text-xs bg-[var(--bg-primary)] border-[var(--border)] rounded-md px-2 py-1.5 w-full"
                      >
                        {["Appetizers", "Mains", "Sides", "Desserts", "Drinks", "Other"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <CellInput
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.costPerPerson}
                        onChange={(v) => updateMenuItem(item.id, "costPerPerson", parseFloat(v) || 0)}
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <CellInput
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(v) => updateMenuItem(item.id, "quantity", parseInt(v) || 0)}
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {match ? (
                        match.draftRecipeId && draftRecipes.find((d) => d.id === match.draftRecipeId)?.approved
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Draft OK</span>
                          : match.draftRecipeId
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400">Draft</span>
                            : <ConfidenceBadge confidence={match.confidence} />
                      ) : <span className="text-[var(--text-muted)]">--</span>}
                    </td>
                    <td className="py-2">
                      <button onClick={() => removeMenuItem(item.id)} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            onClick={addMenuItem}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#D4A373] hover:text-[#e0b589] transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Menu Item
          </button>
        </div>
      </Section>

      {/* ---- Draft Recipes ---- */}
      {draftRecipes.length > 0 && (
        <RecipeDraftReview
          drafts={draftRecipes}
          onApprove={(id) =>
            setDraftRecipes((prev) =>
              prev.map((d) => (d.id === id ? { ...d, approved: true } : d))
            )
          }
          onDiscard={(id) =>
            setDraftRecipes((prev) => prev.filter((d) => d.id !== id))
          }
          onUpdateRecipe={(id, updates) =>
            setDraftRecipes((prev) =>
              prev.map((d) =>
                d.id === id
                  ? { ...d, recipe: { ...d.recipe, ...updates } }
                  : d
              )
            )
          }
          onApproveAll={() =>
            setDraftRecipes((prev) =>
              prev.map((d) => ({ ...d, approved: true }))
            )
          }
        />
      )}

      {/* ---- Shopping Preview ---- */}
      {plan.shoppingList && plan.shoppingList.items.length > 0 && (
        <ShoppingPreview shoppingList={plan.shoppingList} />
      )}

      {/* ---- Procurement Draft ---- */}
      {plan.procurementDraft && plan.procurementDraft.totalMappedItems > 0 && (
        <Section title="Purchase Orders" icon={Package} badge={
          plan.procurementDraft.unmappedItems.length > 0 ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-800/30 text-yellow-300">
              {plan.procurementDraft.unmappedItems.length} unmapped
            </span>
          ) : undefined
        }>
          <ProcurementPreview draft={plan.procurementDraft} />
        </Section>
      )}

      {/* ---- Prep Preview ---- */}
      {plan.prepPreview && plan.prepPreview.totalTasks > 0 && (
        <PrepPreview prepPreview={plan.prepPreview} />
      )}

      {/* ---- Timeline ---- */}
      {plan.timeline && plan.timeline.length > 0 && (
        <Section title="Event Timeline" icon={Clock} badge={
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-muted)]">
            {plan.timeline.length} items
          </span>
        }>
          <TimelinePreview items={plan.timeline} />
        </Section>
      )}

      {/* ---- Staffing ---- */}
      <Section title="Staffing" icon={Users}>
        <div className="pt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="text-left py-2 pr-2 font-medium">Role</th>
                <th className="text-right py-2 pr-2 font-medium w-24">Rate/hr</th>
                <th className="text-right py-2 pr-2 font-medium w-20">Hours</th>
                <th className="text-right py-2 pr-2 font-medium w-20">Count</th>
                <th className="text-right py-2 pr-2 font-medium w-24">Total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {staffing.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-2">
                    <CellInput value={s.role} onChange={(v) => updateStaffLine(s.id, "role", v)} />
                  </td>
                  <td className="py-2 pr-2">
                    <CellInput type="number" min={0} step={0.5} value={s.hourlyRate} onChange={(v) => updateStaffLine(s.id, "hourlyRate", parseFloat(v) || 0)} className="text-right" />
                  </td>
                  <td className="py-2 pr-2">
                    <CellInput type="number" min={0} step={0.5} value={s.hours} onChange={(v) => updateStaffLine(s.id, "hours", parseFloat(v) || 0)} className="text-right" />
                  </td>
                  <td className="py-2 pr-2">
                    <CellInput type="number" min={1} value={s.headcount} onChange={(v) => updateStaffLine(s.id, "headcount", parseInt(v) || 1)} className="text-right" />
                  </td>
                  <td className="py-2 pr-2 text-right text-[var(--text-secondary)] tabular-nums">
                    {formatCurrency(s.hourlyRate * s.hours * s.headcount)}
                  </td>
                  <td className="py-2">
                    <button onClick={() => removeStaffLine(s.id)} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addStaffLine}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#D4A373] hover:text-[#e0b589] transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Staff Role
          </button>
        </div>
      </Section>

      {/* ---- Rentals ---- */}
      <Section title="Rentals" icon={Package}>
        <div className="pt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="text-left py-2 pr-2 font-medium">Item</th>
                <th className="text-right py-2 pr-2 font-medium w-24">Unit Cost</th>
                <th className="text-right py-2 pr-2 font-medium w-20">Qty</th>
                <th className="text-right py-2 pr-2 font-medium w-24">Total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rentals.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-2">
                    <CellInput value={r.item} onChange={(v) => updateRentalLine(r.id, "item", v)} />
                  </td>
                  <td className="py-2 pr-2">
                    <CellInput type="number" min={0} step={0.01} value={r.unitCost} onChange={(v) => updateRentalLine(r.id, "unitCost", parseFloat(v) || 0)} className="text-right" />
                  </td>
                  <td className="py-2 pr-2">
                    <CellInput type="number" min={0} value={r.quantity} onChange={(v) => updateRentalLine(r.id, "quantity", parseInt(v) || 0)} className="text-right" />
                  </td>
                  <td className="py-2 pr-2 text-right text-[var(--text-secondary)] tabular-nums">
                    {formatCurrency(r.unitCost * r.quantity)}
                  </td>
                  <td className="py-2">
                    <button onClick={() => removeRentalLine(r.id)} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addRentalLine}
            className="mt-3 flex items-center gap-1.5 text-xs text-[#D4A373] hover:text-[#e0b589] transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Rental Item
          </button>
        </div>
      </Section>

      {/* ---- Bar Package ---- */}
      <Section title="Bar Package" icon={Wine} defaultOpen={!!barPackage}>
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Type</label>
            <select
              value={barPackage?.type || "none"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "none") {
                  setBarPackage(null);
                } else {
                  const labels: Record<string, string> = {
                    beer_wine: "Beer & Wine",
                    full_bar: "Full Bar",
                    custom: "Custom",
                  };
                  setBarPackage((prev) => ({
                    type: val as BarPackage["type"],
                    costPerPerson: prev?.costPerPerson || 0,
                    label: labels[val] || val,
                  }));
                }
              }}
              className="input text-xs bg-[var(--bg-primary)] border-[var(--border)] rounded-md px-2 py-1.5 w-full"
            >
              <option value="none">No Bar</option>
              <option value="beer_wine">Beer & Wine</option>
              <option value="full_bar">Full Bar</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {barPackage && (
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Cost per Person</label>
              <CellInput
                type="number"
                min={0}
                step={0.5}
                value={barPackage.costPerPerson}
                onChange={(v) =>
                  setBarPackage((prev) =>
                    prev ? { ...prev, costPerPerson: parseFloat(v) || 0 } : prev
                  )
                }
              />
            </div>
          )}
        </div>
      </Section>

      {/* ---- Timeline ---- */}
      <Section title="Timeline" icon={Clock}>
        <div className="pt-4 space-y-2">
          {timeline.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]"
            >
              <div className="w-6 h-6 rounded-full bg-[#D4A373]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#D4A373]">{idx + 1}</span>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">Phase</label>
                  <CellInput value={entry.phase} onChange={(v) => updateTimelineEntry(idx, "phase", v)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">Task</label>
                  <CellInput value={entry.task} onChange={(v) => updateTimelineEntry(idx, "task", v)} />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">Time</label>
                    <CellInput value={entry.start_time || ""} onChange={(v) => updateTimelineEntry(idx, "start_time", v)} />
                  </div>
                  <button
                    onClick={() => removeTimelineEntry(idx)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors mb-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addTimelineEntry}
            className="flex items-center gap-1.5 text-xs text-[#D4A373] hover:text-[#e0b589] transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Timeline Entry
          </button>
        </div>
      </Section>

      {/* ---- Pricing Summary ---- */}
      <Section title="Pricing Summary" icon={DollarSign}>
        <div className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">Admin Fee %</label>
              <CellInput type="number" min={0} step={0.5} value={adminPercent} onChange={(v) => setAdminPercent(parseFloat(v) || 0)} />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">Tax %</label>
              <CellInput type="number" min={0} step={0.1} value={taxPercent} onChange={(v) => setTaxPercent(parseFloat(v) || 0)} />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">Target Margin %</label>
              <CellInput type="number" min={0} step={0.5} value={targetMarginPercent} onChange={(v) => setTargetMarginPercent(parseFloat(v) || 0)} />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <PricingRow label="Food Cost" value={pricing.foodCostTotal} />
            <PricingRow label="Staffing" value={pricing.staffingTotal} />
            <PricingRow label="Rentals" value={pricing.rentalsTotal} />
            <PricingRow label="Bar" value={pricing.barTotal} />
            <div className="border-t border-[var(--border)] pt-2">
              <PricingRow label="Subtotal" value={pricing.subtotal} bold />
            </div>
            <PricingRow label={`Admin Fee (${adminPercent}%)`} value={pricing.adminFee} />
            <PricingRow label={`Tax (${taxPercent}%)`} value={pricing.taxAmount} />
            <div className="border-t border-[var(--border)] pt-2">
              <PricingRow label="Total Cost" value={pricing.totalCost} bold />
            </div>
            <div className="border-t border-[var(--border)] pt-2 space-y-2">
              <PricingRow label="Suggested Price" value={pricing.suggestedPrice} accent />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Projected Margin</span>
                <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                  {pricing.projectedMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Per Guest</span>
                <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                  {formatCurrency(eventDetails.guest_count > 0 ? pricing.suggestedPrice / eventDetails.guest_count : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Margin Insight ---- */}
      {plan.marginAnalysis && (
        <Section title="Margin Analysis" icon={TrendingUp} badge={
          plan.marginAnalysis.costFlags.length > 0 ? (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              plan.marginAnalysis.costFlags.some((f) => f.severity === "critical")
                ? "bg-red-800/30 text-red-300"
                : "bg-yellow-800/30 text-yellow-300"
            }`}>
              {plan.marginAnalysis.costFlags.length} flag{plan.marginAnalysis.costFlags.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }>
          <MarginInsight analysis={plan.marginAnalysis} guestCount={eventDetails.guest_count} />
        </Section>
      )}

      {/* ---- Inventory Warnings ---- */}
      {plan.inventoryWarnings.length > 0 && (
        <Section title="Inventory Warnings" icon={AlertOctagon} defaultOpen={true}>
          <div className="pt-4 space-y-2">
            {plan.inventoryWarnings.map((w, i) => {
              const deficit = w.needed - w.available;
              const severity = deficit > w.needed * 0.5 ? "red" : "orange";
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    severity === "red"
                      ? "bg-red-900/10 border-red-800/30"
                      : "bg-orange-900/10 border-orange-800/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 ${severity === "red" ? "text-red-400" : "text-orange-400"}`}
                    />
                    <span className="text-xs text-[var(--text-primary)]">{w.ingredient}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    severity === "red"
                      ? "bg-red-800/30 text-red-300"
                      : "bg-orange-800/30 text-orange-300"
                  }`}>
                    Need {w.needed} {w.unit} &middot; Have {w.available} {w.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---- AI Assumptions & Questions ---- */}
      {(plan.assumptions.length > 0 || plan.questions.length > 0) && (
        <Section title="AI Assumptions & Questions" icon={HelpCircle}>
          <div className="pt-4 space-y-4">
            {plan.assumptions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                  Assumptions Made
                </h4>
                <ul className="space-y-1.5">
                  {plan.assumptions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] mt-1.5 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.questions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wider">
                  Questions for You
                </h4>
                <ul className="space-y-1.5">
                  {plan.questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-yellow-300/80">
                      <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-400" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ---- AI Reasoning ---- */}
      {plan.reasoning.length > 0 && (
        <Section title="AI Reasoning" icon={Brain} defaultOpen={false}>
          <div className="pt-4 space-y-2">
            {plan.reasoning.map((r, i) => (
              <p key={i} className="text-xs text-[var(--text-muted)] leading-relaxed">
                {r}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* ---- Actions ---- */}
      <div className="pt-4 pb-8 space-y-3">
        {commitError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/15 border border-red-800/30 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{commitError}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
          <button
            onClick={handleCommit}
            disabled={committing}
            className="flex items-center gap-2 px-8 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#D4A373] to-[#b8844f] text-[#0B1120] hover:from-[#e0b589] hover:to-[#c99260] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#D4A373]/20"
          >
            {committing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Event...
              </>
            ) : commitError ? (
              <>
                <RotateCcw className="w-4 h-4" />
                Retry
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Create This Event
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Pricing Row ----
function PricingRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-xs ${
          bold ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-xs tabular-nums ${
          accent
            ? "font-bold text-[#D4A373] text-sm"
            : bold
            ? "font-semibold text-[var(--text-primary)]"
            : "text-[var(--text-secondary)]"
        }`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
