"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, AlertTriangle, Loader2 } from "lucide-react";
import { assignStaffAction } from "@/lib/actions/staffAssignments";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type AvailabilityEntry = {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  phone: string | null;
  email: string | null;
  status: "available" | "busy";
  assignedEvent: { id: string; name: string; role: string | null } | null;
};

interface Props {
  eventId: string;
  eventDate: string;
}

export function StaffAvailability({ eventId, eventDate }: Props) {
  const router = useRouter();
  const [staff, setStaff] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [showConflictWarning, setShowConflictWarning] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: eventDate });
      if (eventId) params.set("event_id", eventId);
      const res = await fetch(`/api/staff/availability?${params}`);
      const data = await res.json();
      setStaff(data.staff || []);
    } catch {
      setStaff([]);
    }
    setLoading(false);
  }, [eventId, eventDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  async function handleAssign(staffMember: AvailabilityEntry) {
    // If busy, show conflict warning first
    if (staffMember.status === "busy" && showConflictWarning !== staffMember.id) {
      setShowConflictWarning(staffMember.id);
      return;
    }

    setAssigning(staffMember.id);
    setShowConflictWarning(null);

    const result = await assignStaffAction(
      eventId,
      staffMember.id,
      staffMember.role
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${staffMember.name} assigned`);
      router.refresh();
      fetchAvailability();
    }
    setAssigning(null);
  }

  const availableCount = staff.filter((s) => s.status === "available").length;
  const busyCount = staff.filter((s) => s.status === "busy").length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-[#9c8876]" />
          Staff Availability
          <span className="text-xs text-[#6b5a4a]">
            {availableCount} available, {busyCount} busy
          </span>
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#6b5a4a]" />
        </div>
      ) : staff.length === 0 ? (
        <p className="text-xs text-[#6b5a4a] text-center py-4">
          No staff members found. Add staff in Settings first.
        </p>
      ) : (
        <div className="space-y-1.5">
          {staff.map((member) => (
            <div key={member.id}>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#1a1714] border border-[#2e271f]">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Availability dot */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      member.status === "available"
                        ? "bg-green-400"
                        : "bg-red-400"
                    }`}
                    title={
                      member.status === "available"
                        ? "Available"
                        : `Busy: ${member.assignedEvent?.name || "another event"}`
                    }
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {member.name}
                    </div>
                    <div className="text-[10px] text-[#6b5a4a]">
                      {member.role} &middot; ${member.hourly_rate}/hr
                      {member.status === "busy" && member.assignedEvent && (
                        <span className="text-red-400/80">
                          {" "}
                          &middot; On: {member.assignedEvent.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAssign(member)}
                  disabled={assigning === member.id}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors flex-shrink-0 ${
                    member.status === "available"
                      ? "bg-brand-600 hover:bg-brand-500 text-white"
                      : "bg-[#2e271f] hover:bg-[#3a3129] text-[#9c8876]"
                  }`}
                >
                  {assigning === member.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  Assign
                </button>
              </div>

              {/* Conflict warning for busy staff */}
              {showConflictWarning === member.id && member.status === "busy" && (
                <div className="mt-1 mx-3 p-2.5 rounded-md bg-orange-400/10 border border-orange-400/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-orange-400 font-medium">
                        Scheduling Conflict
                      </p>
                      <p className="text-[10px] text-orange-400/80 mt-0.5">
                        {member.name} is already assigned to{" "}
                        <strong>{member.assignedEvent?.name}</strong> on this
                        date. Assign anyway?
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAssign(member)}
                          disabled={assigning === member.id}
                          className="text-[10px] px-2 py-1 rounded bg-orange-500 hover:bg-orange-400 text-white transition-colors"
                        >
                          {assigning === member.id ? "Assigning..." : "Assign Anyway"}
                        </button>
                        <button
                          onClick={() => setShowConflictWarning(null)}
                          className="text-[10px] px-2 py-1 rounded bg-[#2e271f] hover:bg-[#3a3129] text-[#9c8876] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
