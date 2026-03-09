import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, Building2, Users } from "lucide-react";
import { InvitesList } from "./InvitesList";

export default async function TeamInvitesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!profile?.email) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <h1 className="font-display text-xl md:text-2xl font-semibold mb-2">Team Invitations</h1>
        <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-8 text-center">
          <p className="text-sm text-[#7A8BA8]">Unable to load your profile.</p>
        </div>
      </div>
    );
  }

  // Fetch pending invites for this user
  const { data: invites } = await supabase
    .from("organization_invites")
    .select(`
      id,
      organization_id,
      invited_email,
      role,
      status,
      invite_token,
      created_at,
      expires_at,
      invited_by,
      organization:organizations(id, name, organization_type, logo_url),
      inviter:profiles!organization_invites_invited_by_fkey(full_name, email)
    `)
    .eq("invited_email", profile.email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const pendingInvites = (invites ?? []).filter((invite: any) => {
    // Filter out expired invites
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">Team Invitations</h1>
        <p className="text-sm text-[#D4A373] mt-1">
          Invitations sent to {profile.email}
        </p>
      </div>

      {pendingInvites.length === 0 ? (
        <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-8 text-center">
          <Mail className="w-10 h-10 text-[#7A8BA8] mx-auto mb-3" />
          <p className="text-sm text-[#D4A373]">No pending invitations</p>
          <p className="text-xs text-[#7A8BA8] mt-1">
            When someone invites you to their organization, it will appear here.
          </p>
        </div>
      ) : (
        <InvitesList invites={pendingInvites as any[]} />
      )}
    </div>
  );
}
