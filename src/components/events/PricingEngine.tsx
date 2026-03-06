"use client";

import { useState, useCallback } from "react";
import { calculatePricing, DEFAULT_PRICING } from "@/lib/pricing";
import { formatCurrency, formatPercent, generateId } from "@/lib/utils";
import { updateEventPricingAction } from "@/lib/actions/events";
import type { PricingData, MenuItem, StaffingLine, RentalLine, BarPackage } from "@/types";
import { Plus, Trash2, Save, TrendingUp, DollarSign, Percent, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { RecipePickerModal } from "./RecipePickerModal";
import type { Recipe } from "@/types";

interface Props { eventId: string; guestCount: number; initialPricing?: PricingData | null; }

const BAR_OPTIONS: BarPackage[] = [
  { type: "beer_wine", label: "Beer & Wine", costPerPerson: 18 },
  { type: "full_bar", label: "Full Open Bar", costPerPerson: 32 },
  { type: "custom", label: "Custom", costPerPerson: 0 },
];

function Section({ title, onAdd, addLabel, children }: { title: string; onAdd: () => void; addLabel: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <button type="button" onClick={onAdd} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          <Plus className="w-3.5 h-3.5" />{addLabel}
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function PricingEngine({ eventId, guestCount, initialPricing }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialPricing?.menuItems ?? []);
  const [staffing, setStaffing] = useState<StaffingLine[]>(initialPricing?.staffing ?? []);
  const [rentals, setRentals] = useState<RentalLine[]>(initialPricing?.rentals ?? []);
  const [barPackage, setBarPackage] = useState<BarPackage | null>(initialPricing?.barPackage ?? null);
  const [adminPercent, setAdminPercent] = useState(initialPricing?.adminPercent ?? 22);
  const [taxPercent, setTaxPercent] = useState(initialPricing?.taxPercent ?? 8.5);
  const [targetMargin, setTargetMargin] = useState(initialPricing?.targetMarginPercent ?? 28);
  const [saving, setSaving] = useState(false);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);

  const handleImportRecipes = (recipes: Recipe[]) => {
    const newItems = recipes.map(r => ({
      id: generateId(),
      name: r.name,
      costPerPerson: r.cost_per_serving,
      quantity: guestCount,
    }));
    setMenuItems(p => [...p, ...newItems]);
    toast.success(`Imported ${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`);
  };

  const pricing = calculatePricing({ guestCount, menuItems, staffing, rentals, barPackage, adminPercent, taxPercent, targetMarginPercent: targetMargin });
  const marginColor = pricing.projectedMargin >= 25 ? "text-green-400" : pricing.projectedMargin >= 15 ? "text-yellow-400" : "text-red-400";

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await updateEventPricingAction(eventId, pricing);
    setSaving(false);
    if (result?.error) toast.error(result.error);
    else toast.success("Pricing saved");
  }, [eventId, pricing]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Total Cost", value: formatCurrency(pricing.totalCost), color: "" },
          { icon: TrendingUp, label: "Suggested Price", value: formatCurrency(pricing.suggestedPrice), color: "text-brand-300" },
          { icon: Percent, label: "Proj. Margin", value: formatPercent(pricing.projectedMargin), color: marginColor },
          { icon: Users, label: "Per Person", value: formatCurrency(pricing.suggestedPrice / guestCount), color: "" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label}>
            <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3.5 h-3.5 text-[#9c8876]" /><span className="stat-label">{label}</span></div>
            <div className={`text-xl font-semibold font-display ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Menu */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Menu Items</h3>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setRecipePickerOpen(true)} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />Import from Recipes
                </button>
                <button type="button" onClick={() => setMenuItems(p => [...p, { id: generateId(), name: "", costPerPerson: 0, quantity: guestCount }])} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Add item
                </button>
              </div>
            </div>
            <div className="space-y-2">
            {menuItems.length === 0 ? <p className="text-xs text-[#6b5a4a] py-2">No menu items yet</p> : menuItems.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input className="input col-span-5 text-sm" placeholder="Item name" value={item.name} onChange={e => setMenuItems(p => p.map(m => m.id === item.id ? { ...m, name: e.target.value } : m))} />
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">$</span>
                  <input className="input pl-6 text-sm" type="number" placeholder="0.00" step="0.01" min={0} value={item.costPerPerson || ""}
                    onChange={e => setMenuItems(p => p.map(m => m.id === item.id ? { ...m, costPerPerson: parseFloat(e.target.value) || 0 } : m))} />
                </div>
                <input className="input col-span-3 text-sm" type="number" placeholder="Qty" min={1} value={item.quantity || ""}
                  onChange={e => setMenuItems(p => p.map(m => m.id === item.id ? { ...m, quantity: parseInt(e.target.value) || guestCount } : m))} />
                <button type="button" onClick={() => setMenuItems(p => p.filter(m => m.id !== item.id))} className="col-span-1 flex items-center justify-center text-[#6b5a4a] hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {menuItems.length > 0 && (
              <div className="flex justify-between text-xs text-[#9c8876] pt-2 border-t border-[#2e271f]">
                <span>Food cost total</span><span className="font-medium text-[#f5ede0]">{formatCurrency(pricing.foodCostTotal)}</span>
              </div>
            )}
            </div>
          </div>

          {/* Staffing */}
          <Section title="Staffing" onAdd={() => setStaffing(p => [...p, { id: generateId(), role: "", hourlyRate: 25, hours: 8, headcount: 1 }])} addLabel="Add staff">
            {staffing.length === 0 ? (
              <p className="text-xs text-[#6b5a4a] py-2">No staffing added</p>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-[#9c8876] uppercase tracking-wider mb-2 px-0.5">
                  <span className="col-span-4">Role</span>
                  <span className="col-span-2">Rate/hr</span>
                  <span className="col-span-2">Hours</span>
                  <span className="col-span-2"># Staff</span>
                  <span className="col-span-2">Total</span>
                </div>
                {staffing.map(s => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 items-center mb-2">
                    <input className="input col-span-4 text-sm" placeholder="Role (e.g. Server)" value={s.role} onChange={e => setStaffing(p => p.map(st => st.id === s.id ? { ...st, role: e.target.value } : st))} />
                    <div className="col-span-2 relative">
                      <input className="input text-sm" type="number" placeholder="$/hr" min={0} value={s.hourlyRate || ""} onChange={e => setStaffing(p => p.map(st => st.id === s.id ? { ...st, hourlyRate: parseFloat(e.target.value) || 0 } : st))} />
                    </div>
                    <input className="input col-span-2 text-sm" type="number" placeholder="Hrs" min={0} value={s.hours || ""} onChange={e => setStaffing(p => p.map(st => st.id === s.id ? { ...st, hours: parseFloat(e.target.value) || 0 } : st))} />
                    <input className="input col-span-2 text-sm" type="number" placeholder="# staff" min={1} value={s.headcount || ""} onChange={e => setStaffing(p => p.map(st => st.id === s.id ? { ...st, headcount: parseInt(e.target.value) || 1 } : st))} />
                    <div className="col-span-1 text-xs text-[#9c8876] text-center">{formatCurrency(s.hourlyRate * s.hours * s.headcount)}</div>
                    <button type="button" onClick={() => setStaffing(p => p.filter(st => st.id !== s.id))} className="col-span-1 flex items-center justify-center text-[#6b5a4a] hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-[#9c8876] pt-2 border-t border-[#2e271f]">
                  <span>Staffing total</span>
                  <span className="font-medium text-[#f5ede0]">{formatCurrency(pricing.staffingTotal)}</span>
                </div>
              </div>
            )}
          </Section>

          {/* Rentals */}
          <Section title="Rentals & Equipment" onAdd={() => setRentals(p => [...p, { id: generateId(), item: "", unitCost: 0, quantity: 1 }])} addLabel="Add rental">
            {rentals.length === 0 ? <p className="text-xs text-[#6b5a4a] py-2">No rentals added</p> : rentals.map(r => (
              <div key={r.id} className="grid grid-cols-12 gap-2 items-center">
                <input className="input col-span-6 text-sm" placeholder="Item (e.g. 60in round tables)" value={r.item} onChange={e => setRentals(p => p.map(rt => rt.id === r.id ? { ...rt, item: e.target.value } : rt))} />
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">$</span>
                  <input className="input pl-6 text-sm" type="number" placeholder="0.00" min={0} value={r.unitCost || ""} onChange={e => setRentals(p => p.map(rt => rt.id === r.id ? { ...rt, unitCost: parseFloat(e.target.value) || 0 } : rt))} />
                </div>
                <input className="input col-span-2 text-sm" type="number" placeholder="Qty" min={1} value={r.quantity || ""} onChange={e => setRentals(p => p.map(rt => rt.id === r.id ? { ...rt, quantity: parseInt(e.target.value) || 1 } : rt))} />
                <button type="button" onClick={() => setRentals(p => p.filter(rt => rt.id !== r.id))} className="col-span-1 flex items-center justify-center text-[#6b5a4a] hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {rentals.length > 0 && (
              <div className="flex justify-between text-xs text-[#9c8876] pt-2 border-t border-[#2e271f]">
                <span>Rentals total</span><span className="font-medium text-[#f5ede0]">{formatCurrency(pricing.rentalsTotal)}</span>
              </div>
            )}
          </Section>

          {/* Bar */}
          <div className="card p-5">
            <h3 className="font-medium text-sm mb-3">Bar Package</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={() => setBarPackage(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!barPackage ? "bg-brand-950 border-brand-700 text-brand-300" : "border-[#2e271f] text-[#9c8876] hover:border-[#3d3028]"}`}>None</button>
              {BAR_OPTIONS.map(opt => (
                <button type="button" key={opt.type} onClick={() => setBarPackage({ ...opt })} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${barPackage?.type === opt.type ? "bg-brand-950 border-brand-700 text-brand-300" : "border-[#2e271f] text-[#9c8876] hover:border-[#3d3028]"}`}>
                  {opt.label}{opt.costPerPerson > 0 ? ` ($${opt.costPerPerson}/pp)` : ""}
                </button>
              ))}
            </div>
            {barPackage?.type === "custom" && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#9c8876]">$/person:</label>
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">$</span>
                  <input className="input pl-6 text-sm" type="number" min={0} placeholder="0.00" value={barPackage.costPerPerson || ""}
                    onChange={e => setBarPackage(p => p ? { ...p, costPerPerson: parseFloat(e.target.value) || 0 } : null)} />
                </div>
              </div>
            )}
            {barPackage && <div className="text-xs text-[#9c8876] mt-2">Bar total: <span className="text-[#f5ede0] font-medium">{formatCurrency(pricing.barTotal)}</span></div>}
          </div>
        </div>

        {/* Summary panel */}
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h3 className="font-medium text-sm">Fee & Tax Settings</h3>
            {[
              { label: "Admin / Service Fee %", value: adminPercent, setter: setAdminPercent },
              { label: "Tax %", value: taxPercent, setter: setTaxPercent },
              { label: "Target Profit Margin %", value: targetMargin, setter: setTargetMargin },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="label">{label}</label>
                <div className="relative">
                  <input className="input pr-7" type="number" min={0} max={100} step={0.5} value={value} onChange={e => setter(parseFloat(e.target.value) || 0)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-medium text-sm mb-4">Cost Breakdown</h3>
            <div className="space-y-2.5">
              {[
                { label: "Food & Menu", value: pricing.foodCostTotal },
                { label: "Staffing", value: pricing.staffingTotal },
                { label: "Rentals", value: pricing.rentalsTotal },
                { label: "Bar", value: pricing.barTotal },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-[#9c8876]">{row.label}</span><span>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="border-t border-[#2e271f] pt-2.5 flex justify-between text-sm">
                <span className="text-[#9c8876]">Subtotal</span><span>{formatCurrency(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Admin ({adminPercent}%)</span><span>{formatCurrency(pricing.adminFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Tax ({taxPercent}%)</span><span>{formatCurrency(pricing.taxAmount)}</span>
              </div>
              <div className="border-t border-[#2e271f] pt-2.5 flex justify-between font-semibold text-sm">
                <span>Total Cost</span><span>{formatCurrency(pricing.totalCost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm text-brand-300">
                <span>Suggested Price</span><span>{formatCurrency(pricing.suggestedPrice)}</span>
              </div>
              <div className={`flex justify-between font-semibold text-sm ${marginColor}`}>
                <span>Proj. Margin</span><span>{formatPercent(pricing.projectedMargin)}</span>
              </div>
            </div>
          </div>

          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save pricing"}
          </button>
        </div>
      </div>
      <RecipePickerModal open={recipePickerOpen} onClose={() => setRecipePickerOpen(false)} onSelect={handleImportRecipes} />
    </div>
  );
}
