import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: templates } = await supabase
    .from("event_templates")
    .select("id, name, guest_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <NewEventForm templates={templates ?? []} />;
}
