import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuditClient } from "./AuditClient";
import type { AuditLogEntry } from "@/types";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const entries = (data ?? []) as AuditLogEntry[];

  return <AuditClient entries={entries} />;
}
