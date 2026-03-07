"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveClientNotes(clientName: string, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("client_notes")
    .upsert(
      {
        user_id: user.id,
        client_name: clientName,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_name" }
    );

  if (error) return { error: error.message };

  revalidatePath(`/clients/${encodeURIComponent(clientName)}`);
  return { success: true };
}
