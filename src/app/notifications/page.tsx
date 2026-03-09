import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Notification } from "@/types";
import { NotificationsClient } from "./NotificationsClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications: Notification[] = data ?? [];

  return <NotificationsClient initialNotifications={notifications} />;
}
