import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScheduleClient } from "./ScheduleClient";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status, current_organization_id")
    .eq("id", user.id)
    .single();

  const isPro = profile?.plan_tier === "pro" && ["active", "trialing"].includes(profile?.subscription_status ?? "");
  const orgId = profile?.current_organization_id;

  // Fetch all events, assignments with staff details (including hourly_rate), and staff members
  let eventsQuery = supabase.from("events").select("*").order("event_date", { ascending: true });
  if (orgId) eventsQuery = eventsQuery.eq("organization_id", orgId);

  let assignmentsQuery = supabase
    .from("event_staff_assignments")
    .select("id, staff_member_id, event_id, role, start_time, end_time, confirmed, notes, created_at, staff_members(id, name, role, email, phone, hourly_rate, pay_type)")
    .eq("user_id", user.id)
    .order("created_at");
  if (orgId) assignmentsQuery = assignmentsQuery.eq("organization_id", orgId);

  let staffQuery = supabase.from("staff_members").select("id, name, role, email, phone, hourly_rate, pay_type, organization_id, user_id, notes, created_at").order("name");
  if (orgId) staffQuery = staffQuery.eq("organization_id", orgId);

  const [{ data: events }, { data: rawAssignments }, { data: staffMembers }] = await Promise.all([
    eventsQuery, assignmentsQuery, staffQuery,
  ]);

  const assignments = (rawAssignments || []).map((a: any) => ({
    ...a,
    staff_members: Array.isArray(a.staff_members) ? a.staff_members[0] || null : a.staff_members,
  }));

  return (
    <ScheduleClient
      events={events || []}
      assignments={assignments || []}
      staffMembers={staffMembers || []}
      isPro={isPro}
    />
  );
}
