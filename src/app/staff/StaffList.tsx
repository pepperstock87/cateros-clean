"use client";

import { useState } from "react";
import { createStaffAction, deleteStaffAction } from "@/lib/actions/staff";
import { formatCurrency } from "@/lib/utils";
import type { StaffMember } from "@/types";
import { Plus, Trash2, Phone, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function formatPay(s: StaffMember) {
  const payType = s.pay_type ?? "hourly";
  if (payType === "salary") {
    return `${formatCurrency(Number(s.hourly_rate))}/yr`;
  }
  return `${formatCurrency(Number(s.hourly_rate))}/hr`;
}

export function StaffList({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [payType, setPayType] = useState<"hourly" | "salary">("hourly");

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    formData.set("pay_type", payType);
    const result = await createStaffAction(undefined, formData);
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Staff member added");
      setShowForm(false);
      setPayType("hourly");
      router.refresh();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    setDeleting(id);
    const result = await deleteStaffAction(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Staff member removed");
      router.refresh();
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      {/* Staff cards */}
      {initialStaff.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialStaff.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-sm">{s.name}</h3>
                  <p className="text-xs text-[#D4A373]">{s.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-300">{formatPay(s)}</span>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deleting === s.id}
                    className="text-[#7A8BA8] hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {(s.phone || s.email) && (
                <div className="flex items-center gap-3 text-xs text-[#D4A373] mt-2">
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-[#F4F1ED] transition-colors">
                      <Phone className="w-3 h-3" />{s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-[#F4F1ED] transition-colors">
                      <Mail className="w-3 h-3" />{s.email}
                    </a>
                  )}
                </div>
              )}
              {s.notes && <p className="text-xs text-[#7A8BA8] mt-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <form action={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-medium text-sm">Add Staff Member</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" placeholder="John Smith" required />
            </div>
            <div>
              <label className="label">Role *</label>
              <input name="role" className="input" placeholder="Server, Chef, Bartender..." required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Pay type</label>
              <div className="flex rounded-lg overflow-hidden border border-[#2A3A5C]">
                <button
                  type="button"
                  onClick={() => setPayType("hourly")}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    payType === "hourly"
                      ? "bg-brand-950 text-brand-300 border-brand-800/60"
                      : "bg-[#182030] text-[#7A8BA8] hover:text-[#F4F1ED]"
                  }`}
                >
                  Hourly
                </button>
                <button
                  type="button"
                  onClick={() => setPayType("salary")}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-[#2A3A5C] ${
                    payType === "salary"
                      ? "bg-brand-950 text-brand-300 border-brand-800/60"
                      : "bg-[#182030] text-[#7A8BA8] hover:text-[#F4F1ED]"
                  }`}
                >
                  Salary
                </button>
              </div>
            </div>
            <div>
              <label className="label">{payType === "hourly" ? "Hourly rate" : "Annual salary"}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8BA8] text-sm">$</span>
                <input
                  name="hourly_rate"
                  type="number"
                  className="input pl-6"
                  placeholder={payType === "hourly" ? "25" : "52000"}
                  min={0}
                  step={payType === "hourly" ? 0.5 : 1000}
                  defaultValue={payType === "hourly" ? 25 : 52000}
                  key={payType}
                />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" type="tel" className="input" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="john@email.com" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input name="notes" className="input" placeholder="Allergies, certifications, availability..." />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? "Adding..." : "Add to team"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />Add Staff Member
        </button>
      )}
    </div>
  );
}
