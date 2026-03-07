"use client";

import { useState, useCallback } from "react";
import { updateEventPaymentAction } from "@/lib/actions/events";
import { formatCurrency, generateId } from "@/lib/utils";
import type { PaymentData, PaymentRecord } from "@/types";
import { Plus, Trash2, DollarSign, CreditCard, Save } from "lucide-react";
import { toast } from "sonner";

const METHODS: { value: PaymentRecord["method"]; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "wire", label: "Wire" },
  { value: "other", label: "Other" },
];

interface Props {
  eventId: string;
  suggestedPrice: number;
  initialPayment?: PaymentData | null;
}

export function PaymentTracker({ eventId, suggestedPrice, initialPayment }: Props) {
  const [depositRequired, setDepositRequired] = useState(initialPayment?.depositRequired ?? Math.round(suggestedPrice * 0.5 * 100) / 100);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayment?.payments ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = suggestedPrice - totalPaid;
  const depositPaid = totalPaid >= depositRequired;

  const handleSave = useCallback(async () => {
    setSaving(true);
    const data: PaymentData = { depositRequired, payments, totalPaid };
    const result = await updateEventPaymentAction(eventId, data);
    setSaving(false);
    if (result?.error) toast.error(result.error);
    else toast.success("Payment info saved");
  }, [eventId, depositRequired, payments, totalPaid]);

  const addPayment = (formData: FormData) => {
    const amount = parseFloat(formData.get("amount") as string) || 0;
    if (amount <= 0) return;
    const record: PaymentRecord = {
      id: generateId(),
      amount,
      method: formData.get("method") as PaymentRecord["method"],
      date: formData.get("date") as string || new Date().toISOString().split("T")[0],
      note: formData.get("note") as string || "",
    };
    setPayments(p => [...p, record]);
    setShowAdd(false);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#9c8876]" />Payments
        </h2>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          <Save className="w-3 h-3" />{saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#251f19] rounded-lg p-3 text-center">
          <div className="text-xs text-[#9c8876] mb-1">Total Due</div>
          <div className="text-sm font-semibold">{formatCurrency(suggestedPrice)}</div>
        </div>
        <div className="bg-[#251f19] rounded-lg p-3 text-center">
          <div className="text-xs text-[#9c8876] mb-1">Paid</div>
          <div className="text-sm font-semibold text-green-400">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="bg-[#251f19] rounded-lg p-3 text-center">
          <div className="text-xs text-[#9c8876] mb-1">Balance</div>
          <div className={`text-sm font-semibold ${balanceDue > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {formatCurrency(balanceDue)}
          </div>
        </div>
      </div>

      {/* Deposit */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-[#2e271f]">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${depositPaid ? "bg-green-400" : "bg-yellow-400"}`} />
        <div className="flex-1">
          <div className="text-xs text-[#9c8876]">Deposit {depositPaid ? "received" : "pending"}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#6b5a4a]">$</span>
            <input
              type="number"
              className="input text-sm w-28"
              value={depositRequired || ""}
              onChange={e => setDepositRequired(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
            />
            <span className="text-xs text-[#6b5a4a]">required</span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">Payment History</div>
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1714] border border-[#2e271f]">
              <div className="flex items-center gap-3">
                <DollarSign className="w-3.5 h-3.5 text-green-400" />
                <div>
                  <div className="text-sm font-medium">{formatCurrency(p.amount)}</div>
                  <div className="text-[10px] text-[#6b5a4a]">
                    {p.method} · {p.date}{p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPayments(prev => prev.filter(x => x.id !== p.id))}
                className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add payment form */}
      {showAdd ? (
        <form action={addPayment} className="space-y-3 p-3 rounded-lg border border-[#2e271f]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">$</span>
                <input name="amount" type="number" className="input pl-6 text-sm" placeholder="0.00" min={0} step={0.01} required autoFocus />
              </div>
            </div>
            <div>
              <label className="label">Method</label>
              <select name="method" className="input text-sm" defaultValue="check">
                {METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input name="date" type="date" className="input text-sm" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div>
              <label className="label">Note</label>
              <input name="note" className="input text-sm" placeholder="Check #1234" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5 px-3">Record Payment</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-1.5 px-3">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          <Plus className="w-3.5 h-3.5" />Record payment
        </button>
      )}
    </div>
  );
}
