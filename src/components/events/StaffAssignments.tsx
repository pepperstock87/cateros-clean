"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignStaffAction, removeAssignmentAction, updateAssignmentAction } from "@/lib/actions/staffAssignments";
import { UserPlus, Trash2, Check, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StaffMember } from "@/types";

type Assignment = {
  id: string;
  staff_member_id: string;
  role: string | null;
  start_time: string | null;
  end_time: string | null;
  confirmed: boolean;
  notes: string | null;
  staff_members: { name: string; role: string; hourly_rate: number; phone: string | null } | null;
};

interface Props {
  eventId: string;
  assignments: Assignment[];
  staffMembers: StaffMember[];
  eventStartTime?: string | null;
  eventEndTime?: string | null;
}

export function StaffAssignments({ eventId, assignments, staffMembers, eventStartTime, eventEndTime }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const assignedIds = new Set(assignments.map(a => a.staff_member_id));
  const availableStaff = staffMembers.filter(s => !assignedIds.has(s.id));

  async function handleAssign(formData: FormData) {
    const staffId = formData.get("staff_id") as string;
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staffId || !staff) return;

    setAdding(true);
    const result = await assignStaffAction(
      eventId,
      staffId,
      staff.role,
      (formData.get("start_time") as string) || eventStartTime || undefined,
      (formData.get("end_time") as string) || eventEndTime || undefined
    );
    if (result.error) toast.error(result.error);
    else {
      toast.success(`${staff.name} assigned`);
      setShowAdd(false);
      router.refresh();
    }
    setAdding(false);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this staff assignment?")) return;
    setRemoving(id);
    const result = await removeAssignmentAction(id);
    if (result.error) toast.error(result.error);
    else { toast.success("Staff removed"); router.refresh(); }
    setRemoving(null);
  }

  async function toggleConfirmed(id: string, current: boolean) {
    const result = await updateAssignmentAction(id, { confirmed: !current });
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#9c8876]" />
          Staff Assignments
          <span className="text-xs text-[#6b5a4a]">({assignments.length})</span>
        </h2>
        {availableStaff.length > 0 && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            {showAdd ? "Cancel" : "+ Assign Staff"}
          </button>
        )}
      </div>

      {/* Assignment list */}
      {assignments.length > 0 ? (
        <div className="space-y-2 mb-4">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#1a1714] border border-[#2e271f]">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleConfirmed(a.id, a.confirmed)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    a.confirmed ? "bg-green-500 border-green-500" : "border-[#6b5a4a] hover:border-brand-400"
                  }`}
                  title={a.confirmed ? "Confirmed" : "Click to confirm"}
                >
                  {a.confirmed && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.staff_members?.name ?? "Unknown"}</div>
                  <div className="text-[10px] text-[#6b5a4a]">
                    {a.role ?? a.staff_members?.role ?? ""}
                    {a.start_time && a.end_time && (
                      <> · {a.start_time} – {a.end_time}</>
                    )}
                    {a.staff_members?.phone && <> · {a.staff_members.phone}</>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(a.id)}
                disabled={removing === a.id}
                className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#6b5a4a] text-center py-4 mb-4">
          No staff assigned yet. Add staff from your library.
        </p>
      )}

      {/* Quick add form */}
      {showAdd && (
        <form action={handleAssign} className="p-3 rounded-lg border border-[#2e271f] space-y-3">
          <div>
            <label className="label">Staff Member</label>
            <select name="staff_id" className="input text-sm w-full" required>
              <option value="">Select staff...</option>
              {availableStaff.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.role} (${s.hourly_rate}/hr)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input name="start_time" type="time" className="input text-sm w-full" defaultValue={eventStartTime ?? ""} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input name="end_time" type="time" className="input text-sm w-full" defaultValue={eventEndTime ?? ""} />
            </div>
          </div>
          <button type="submit" disabled={adding} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Assign
          </button>
        </form>
      )}

      {availableStaff.length === 0 && assignments.length > 0 && (
        <p className="text-[10px] text-[#6b5a4a] text-center">All staff members assigned</p>
      )}
    </div>
  );
}
