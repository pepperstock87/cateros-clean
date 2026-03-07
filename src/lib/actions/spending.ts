"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

export async function deleteReceiptAction(receiptId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteReceiptQuery = supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId)
    .eq("user_id", user.id);
  if (org?.orgId) deleteReceiptQuery = deleteReceiptQuery.eq("organization_id", org.orgId);
  const { error } = await deleteReceiptQuery;

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function deleteInvoiceAction(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteInvoiceQuery = supabase
    .from("distributor_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", user.id);
  if (org?.orgId) deleteInvoiceQuery = deleteInvoiceQuery.eq("organization_id", org.orgId);
  const { error } = await deleteInvoiceQuery;

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function addRecurringCostAction(data: {
  name: string;
  amount: number;
  frequency: "monthly" | "weekly" | "yearly";
  category: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const org = await getCurrentOrg();

  const { error } = await supabase.from("recurring_costs").insert({
    user_id: user.id,
    organization_id: org?.orgId || null,
    name: data.name,
    amount: data.amount,
    frequency: data.frequency,
    category: data.category,
  });

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function updateRecurringCostAction(id: string, data: {
  name?: string;
  amount?: number;
  frequency?: "monthly" | "weekly" | "yearly";
  category?: string | null;
  active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const org = await getCurrentOrg();
  let updateCostQuery = supabase
    .from("recurring_costs")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);
  if (org?.orgId) updateCostQuery = updateCostQuery.eq("organization_id", org.orgId);
  const { error } = await updateCostQuery;

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function deleteRecurringCostAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteCostQuery = supabase
    .from("recurring_costs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (org?.orgId) deleteCostQuery = deleteCostQuery.eq("organization_id", org.orgId);
  const { error } = await deleteCostQuery;

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function addManualReceiptAction(data: {
  vendor: string;
  date: string;
  amount: number;
  category: string | null;
  event_id: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const org = await getCurrentOrg();

  const { error } = await supabase.from("receipts").insert({
    user_id: user.id,
    organization_id: org?.orgId || null,
    vendor: data.vendor,
    receipt_date: data.date,
    total_amount: data.amount,
    category: data.category,
    event_id: data.event_id,
  });

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}
