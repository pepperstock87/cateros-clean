import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinClient } from "./JoinClient";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up the invite by token
  const { data: invite } = await supabase
    .from("organization_invites")
    .select(`
      id,
      organization_id,
      invited_email,
      role,
      status,
      invite_token,
      expires_at,
      created_at,
      organization:organizations(id, name, organization_type, logo_url),
      inviter:profiles!organization_invites_invited_by_fkey(full_name, email)
    `)
    .eq("invite_token", token)
    .single();

  if (!invite) {
    return (
      <div className="min-h-screen bg-[#0C1220] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="card p-8">
            <h1 className="font-display text-xl font-semibold mb-2">Invalid Invite</h1>
            <p className="text-sm text-[#7A8BA8]">This invite link is not valid or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  if (invite.status !== "pending") {
    return (
      <div className="min-h-screen bg-[#0C1220] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="card p-8">
            <h1 className="font-display text-xl font-semibold mb-2">Invite {invite.status === "accepted" ? "Already Accepted" : "Expired"}</h1>
            <p className="text-sm text-[#7A8BA8]">
              {invite.status === "accepted"
                ? "This invite has already been accepted."
                : "This invite is no longer valid."}
            </p>
            <a href="/login" className="btn-primary inline-block mt-4">Sign in to Cateros</a>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0C1220] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="card p-8">
            <h1 className="font-display text-xl font-semibold mb-2">Invite Expired</h1>
            <p className="text-sm text-[#7A8BA8]">This invite has expired. Ask your team admin to send a new one.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  const orgName = (invite.organization as any)?.name || "Unknown Organization";
  const orgType = (invite.organization as any)?.organization_type?.replace(/_/g, " ") || "";
  const inviterName = (invite.inviter as any)?.full_name || (invite.inviter as any)?.email || "Someone";

  return (
    <JoinClient
      inviteId={invite.id}
      token={token}
      orgName={orgName}
      orgType={orgType}
      inviterName={inviterName}
      role={invite.role}
      invitedEmail={invite.invited_email}
      isLoggedIn={!!user}
      userEmail={user?.email || null}
    />
  );
}
