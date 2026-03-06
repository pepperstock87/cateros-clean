"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRentalItemAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("rental_items").insert({
    user_id: user.id,
    name: formData.get("name") as string,
    category: formData.get("category") as string || null,
    unit_cost: Number(formData.get("unit_cost")) || 0,
    vendor: formData.get("vendor") as string || null,
    notes: formData.get("notes") as string || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/rentals");
  return { success: true };
}

export async function deleteRentalItemAction(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("rental_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/rentals");
  return {};
}
