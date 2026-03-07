import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; defaultTemplate?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { template: templateId, defaultTemplate } = await searchParams;
  const defaultTemplateIndex = defaultTemplate != null ? parseInt(defaultTemplate, 10) : null;

  const { data: templates } = await supabase
    .from("event_templates")
    .select("id, name, guest_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // If a template ID is provided via search params, load it for pre-filling
  let prefilledTemplate: { id: string; name: string; guest_count: number | null } | null = null;
  if (templateId) {
    const { data: tmpl } = await supabase
      .from("event_templates")
      .select("id, name, guest_count")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .single();
    prefilledTemplate = tmpl;
  }

  return (
    <NewEventForm
      templates={templates ?? []}
      prefilledTemplate={prefilledTemplate}
      defaultTemplateIndex={defaultTemplateIndex}
    />
  );
}
