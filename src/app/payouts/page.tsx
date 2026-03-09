import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { PayoutsClient } from "./PayoutsClient";
import type { Payment, PaymentScheduleItem, UserProfile } from "@/types";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();

  // Fetch profile for Connect status
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, stripe_connect_account_id, stripe_connect_onboarded")
    .eq("id", user.id)
    .single();

  // Fetch all payments for user's events where status = 'paid', ordered by paid_at desc
  let paymentsQuery = supabase
    .from("payments")
    .select("*, events(id, name, client_name)")
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  if (org?.orgId) {
    paymentsQuery = paymentsQuery.eq("organization_id", org.orgId);
  }

  const { data: payments } = await paymentsQuery;

  // Also fetch all payments (any status) for summary calculations
  let allPaymentsQuery = supabase
    .from("payments")
    .select("*, events(id, name, client_name)")
    .order("paid_at", { ascending: false, nullsFirst: false });

  if (org?.orgId) {
    allPaymentsQuery = allPaymentsQuery.eq("organization_id", org.orgId);
  }

  const { data: allPayments } = await allPaymentsQuery;

  // Fetch payment schedules for cross-referencing
  let schedulesQuery = supabase
    .from("payment_schedules")
    .select("*")
    .order("due_date", { ascending: true });

  if (org?.orgId) {
    schedulesQuery = schedulesQuery.eq("organization_id", org.orgId);
  }

  const { data: paymentSchedules } = await schedulesQuery;

  return (
    <PayoutsClient
      profile={profile as Pick<UserProfile, "id" | "email" | "full_name" | "stripe_connect_account_id" | "stripe_connect_onboarded">}
      payments={payments ?? []}
      allPayments={allPayments ?? []}
      paymentSchedules={(paymentSchedules ?? []) as PaymentScheduleItem[]}
    />
  );
}
