"use client";

import { useState } from "react";
import { createRentalItemAction, deleteRentalItemAction } from "@/lib/actions/rentals";
import { formatCurrency } from "@/lib/utils";
import type { RentalItem } from "@/types";
import { Plus, Trash2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Tables", "Chairs", "Linens", "Glassware", "Flatware", "Serving", "Cooking", "Tents", "Lighting", "Decor", "Other"];

export function RentalList({ initialItems }: { initialItems: RentalItem[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    const result = await createRentalItemAction(undefined, formData);
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Rental item added");
      setShowForm(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from your library?`)) return;
    setDeleting(id);
    const result = await deleteRentalItemAction(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Item removed");
      router.refresh();
    }
    setDeleting(null);
  }

  // Group by category
  const grouped = initialItems.reduce<Record<string, RentalItem[]>>((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {initialItems.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-[#6b5a4a] uppercase tracking-wider mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <div key={item.id} className="card p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{item.name}</h3>
                        {item.vendor && <p className="text-xs text-[#9c8876]">{item.vendor}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-brand-300">{formatCurrency(Number(item.unit_cost))}</span>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={deleting === item.id}
                          className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.notes && <p className="text-xs text-[#6b5a4a] mt-1">{item.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form action={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-medium text-sm">Add Rental Item</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Item name *</label>
              <input name="name" className="input" placeholder='60" Round Table' required />
            </div>
            <div>
              <label className="label">Category</label>
              <select name="category" className="input">
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">$</span>
                <input name="unit_cost" type="number" className="input pl-6" placeholder="0.00" min={0} step={0.01} defaultValue={0} />
              </div>
            </div>
            <div>
              <label className="label">Vendor / Supplier</label>
              <input name="vendor" className="input" placeholder="ABC Party Rentals" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input name="notes" className="input" placeholder="Color options, min order, delivery info..." />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? "Adding..." : "Add to library"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />Add Rental Item
        </button>
      )}
    </div>
  );
}
