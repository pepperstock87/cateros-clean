"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";

export async function createStaffAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();

  const { error } = await supabase.from("staff_members").insert({
    user_id: user.id,
    organization_id: org?.orgId || null,
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    hourly_rate: Number(formData.get("hourly_rate")) || 25,
    phone: formData.get("phone") as string || null,
    email: formData.get("email") as string || null,
    notes: formData.get("notes") as string || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/staff");
  return { success: true };
}

export async function deleteStaffAction(staffId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteQuery = supabase
    .from("staff_members")
    .delete()
    .eq("id", staffId)
    .eq("user_id", user.id);
  if (org?.orgId) deleteQuery = deleteQuery.eq("organization_id", org.orgId);
  const { error } = await deleteQuery;

  if (error) return { error: error.message };
  revalidatePath("/staff");
  return {};
}
