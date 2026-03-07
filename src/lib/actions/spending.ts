"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteReceiptAction(receiptId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function deleteInvoiceAction(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("distributor_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", user.id);

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

  const { error } = await supabase.from("recurring_costs").insert({
    user_id: user.id,
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

  const { error } = await supabase
    .from("recurring_costs")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/spending");
  return { success: true };
}

export async function deleteRecurringCostAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("recurring_costs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

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

  const { error } = await supabase.from("receipts").insert({
    user_id: user.id,
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
