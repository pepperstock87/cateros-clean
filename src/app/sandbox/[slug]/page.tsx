import { createClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function SandboxPage({ params }: Props) {
  const { slug } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) notFound();

  const supabase = createClient(supabaseUrl, serviceKey);

  // Look up sandbox by slug
  const { data: sandbox } = await supabase
    .from("demo_sandboxes")
    .select("id, status")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!sandbox) notFound();

  // Find an active access token for this sandbox
  const { data: token } = await supabase
    .from("demo_access_tokens")
    .select("token")
    .eq("sandbox_id", sandbox.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!token) notFound();

  redirect(`/demo/${token.token}`);
}
