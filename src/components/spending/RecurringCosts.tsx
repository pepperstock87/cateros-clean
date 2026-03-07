"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plus, Trash2, Loader2, X } from "lucide-react";
import { addRecurringCostAction, deleteRecurringCostAction } from "@/lib/actions/spending";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export type RecurringCost = {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "weekly" | "yearly";
  category: string | null;
  active: boolean;
};

const FREQ_LABELS: Record<string, string> = {
  weekly: "/wk",
  monthly: "/mo",
  yearly: "/yr",
};

function toMonthly(amount: number, frequency: string): number {
  if (frequency === "weekly") return amount * 4.33;
  if (frequency === "yearly") return amount / 12;
  return amount;
}

export function RecurringCosts({ costs }: { costs: RecurringCost[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const activeCosts = costs.filter(c => c.active);
  const monthlyTotal = activeCosts.reduce((s, c) => s + toMonthly(c.amount, c.frequency), 0);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    setSaving(true);
    const result = await addRecurringCostAction({
      name: fd.get("name") as string,
      amount: parseFloat(fd.get("amount") as string) || 0,
      frequency: (fd.get("frequency") as string) as "monthly" | "weekly" | "yearly",
      category: (fd.get("category") as string) || null,
    });

    if (result.error) toast.error(result.error);
    else {
      toast.success("Recurring cost added");
      setShowAdd(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recurring cost?")) return;
    setDeleting(id);
    const result = await deleteRecurringCostAction(id);
    if (result.error) toast.error(result.error);
    else { toast.success("Deleted"); router.refresh(); }
    setDeleting(null);
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Recurring Costs
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6b5a4a]">{formatCurrency(monthlyTotal)}/mo</span>
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            {showAdd ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="p-3 rounded-lg border border-[#2e271f] mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input text-sm w-full" placeholder="e.g. Kitchen Rent" required />
            </div>
            <div>
              <label className="label">Amount</label>
              <input name="amount" type="number" step="0.01" className="input text-sm w-full" placeholder="0.00" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frequency</label>
              <select name="frequency" className="input text-sm w-full">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <input name="category" className="input text-sm w-full" placeholder="e.g. Rent, Insurance" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Cost
          </button>
        </form>
      )}

      {activeCosts.length === 0 && !showAdd ? (
        <p className="text-xs text-[#6b5a4a] text-center py-6">
          No recurring costs tracked. Add fixed expenses like rent, insurance, or subscriptions.
        </p>
      ) : (
        <div className="space-y-2">
          {activeCosts.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#1a1714] border border-[#2e271f]">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-[10px] text-[#6b5a4a]">
                  {c.category ?? "Uncategorized"}
                  <span className="ml-2 text-[#9c8876]">{formatCurrency(toMonthly(c.amount, c.frequency))}/mo equiv</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-medium">{formatCurrency(c.amount)}<span className="text-[10px] text-[#6b5a4a]">{FREQ_LABELS[c.frequency]}</span></span>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
