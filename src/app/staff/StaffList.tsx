"use client";

import { useState } from "react";
import { createStaffAction, deleteStaffAction } from "@/lib/actions/staff";
import { formatCurrency } from "@/lib/utils";
import type { StaffMember } from "@/types";
import { Plus, Trash2, Phone, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function StaffList({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    const result = await createStaffAction(undefined, formData);
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Staff member added");
      setShowForm(false);
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
                  <p className="text-xs text-[#9c8876]">{s.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-300">{formatCurrency(Number(s.hourly_rate))}/hr</span>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deleting === s.id}
                    className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {(s.phone || s.email) && (
                <div className="flex items-center gap-3 text-xs text-[#9c8876] mt-2">
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-[#f5ede0] transition-colors">
                      <Phone className="w-3 h-3" />{s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-[#f5ede0] transition-colors">
                      <Mail className="w-3 h-3" />{s.email}
                    </a>
                  )}
                </div>
              )}
              {s.notes && <p className="text-xs text-[#6b5a4a] mt-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <form action={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-medium text-sm">Add Staff Member</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" placeholder="John Smith" required />
            </div>
            <div>
              <label className="label">Role *</label>
              <input name="role" className="input" placeholder="Server, Chef, Bartender..." required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Hourly rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">$</span>
                <input name="hourly_rate" type="number" className="input pl-6" placeholder="25" min={0} step={0.5} defaultValue={25} />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" type="tel" className="input" placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="john@email.com" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input name="notes" className="input" placeholder="Allergies, certifications, availability..." />
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
