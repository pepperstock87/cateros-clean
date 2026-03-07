"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const org = await getCurrentOrg();

  let deleteQuery = supabase
    .from("event_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (org?.orgId) deleteQuery = deleteQuery.eq("organization_id", org.orgId);
  const { error } = await deleteQuery;

  if (error) return { error: error.message };

  revalidatePath("/templates");
  revalidatePath("/events/new");
  return { success: true };
}
