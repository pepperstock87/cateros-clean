import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { StaffMember } from "@/types";
import { Users } from "lucide-react";
import { StaffList } from "./StaffList";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("staff_members")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  const staff: StaffMember[] = data ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff</h1>
          <p className="text-sm text-[#9c8876] mt-1">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

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
