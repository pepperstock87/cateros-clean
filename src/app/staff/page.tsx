import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import type { StaffMember } from "@/types";
import { Users, CalendarDays } from "lucide-react";
import { StaffList } from "./StaffList";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [staffRes, assignmentsRes] = await Promise.all([
    supabase
      .from("staff_members")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("event_staff_assignments")
      .select("id, staff_member_id, role, start_time, end_time, confirmed, events(id, name, event_date, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const staff: StaffMember[] = staffRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];

  // Group upcoming assignments by staff member
  const upcomingByStaff = new Map<string, any[]>();
  const now = new Date().toISOString();
  for (const a of assignments) {
    const event = (a as any).events;
    if (!event || event.status === "canceled" || event.event_date < now) continue;
    const existing = upcomingByStaff.get(a.staff_member_id) ?? [];
    existing.push({ ...a, event });
    upcomingByStaff.set(a.staff_member_id, existing);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff</h1>
          <p className="text-sm text-[#9c8876] mt-1">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Upcoming assignments summary */}
      {upcomingByStaff.size > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#9c8876]" />
            Upcoming Assignments
          </h2>
          <div className="space-y-2">
            {staff.filter(s => upcomingByStaff.has(s.id)).map(s => {
              const upcoming = upcomingByStaff.get(s.id)!;
              return (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1714] border border-[#2e271f]">
                  <div>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-[#6b5a4a] ml-2">{s.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {upcoming.slice(0, 2).map((a: any) => (
                      <Link
                        key={a.id}
                        href={`/events/${a.event.id}`}
                        className="text-[10px] px-2 py-1 rounded bg-[#251f19] text-[#9c8876] hover:text-brand-300 transition-colors"
                      >
                        {a.event.name} · {format(new Date(a.event.event_date), "MMM d")}
                      </Link>
                    ))}
                    {upcoming.length > 2 && (
                      <span className="text-[10px] text-[#6b5a4a]">+{upcoming.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No staff members yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Add your team to quickly assign them to events.</p>
        </div>
      ) : null}

      <StaffList initialStaff={staff} />
    </div>
  );
}
