"use server";

import { createClient } from "@/lib/supabase/server";

export async function dismissWelcomeAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ has_seen_welcome: true })
    .eq("id", user.id);
}
