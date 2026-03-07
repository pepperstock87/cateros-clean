import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Crown, Shield, Building2 } from "lucide-react";
import { TeamClient } from "./TeamClient";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's current organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="font-display text-xl md:text-2xl font-semibold mb-2">Team</h1>
        <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-8 text-center">
          <Users className="w-10 h-10 text-[#6b5a4a] mx-auto mb-3" />
          <p className="text-sm text-[#9c8876]">No organization set up yet.</p>
          <p className="text-xs text-[#6b5a4a] mt-1">Create or join an organization to manage your team.</p>
        </div>
      </div>
    );
  }

  const orgId = profile.current_organization_id;

  // Fetch organization details and members in parallel
  const [orgRes, membersRes, currentMemberRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, type, primary_contact_email")
      .eq("id", orgId)
      .single(),
    supabase
      .from("organization_members")
      .select("id, user_id, role, created_at, profiles(full_name, email)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single(),
  ]);

  const org = orgRes.data;
  const rawMembers = membersRes.data ?? [];
  const currentMemberRole = currentMemberRes.data?.role ?? "viewer";
  const isAdmin = ["owner", "admin"].includes(currentMemberRole);

  // Transform members for the client component
  const members = rawMembers.map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.created_at,
    profile: {
      full_name: m.profiles?.full_name ?? null,
      email: m.profiles?.email ?? "",
    },
  }));

  const ROLE_ICONS: Record<string, typeof Crown> = {
    owner: Crown,
    admin: Shield,
  };

  const CurrentRoleIcon = ROLE_ICONS[currentMemberRole];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Team</h1>
          {org && (
            <p className="text-sm text-[#9c8876] mt-1">{org.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b5a4a]">
          {CurrentRoleIcon && <CurrentRoleIcon className="w-3.5 h-3.5" />}
          <span className="capitalize">{currentMemberRole}</span>
        </div>
      </div>

      {/* Organization Info Card */}
      {org && (
        <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-[#9c8876]" />
            <h2 className="text-sm font-semibold">Organization</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#6b5a4a] block mb-1">Name</span>
              <span className="text-sm text-[#f5ede0]">{org.name}</span>
            </div>
            {org.type && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#6b5a4a] block mb-1">Type</span>
                <span className="text-sm text-[#f5ede0] capitalize">{org.type}</span>
              </div>
            )}
            {org.primary_contact_email && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#6b5a4a] block mb-1">Primary Contact</span>
                <span className="text-sm text-[#f5ede0]">{org.primary_contact_email}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#2e271f]">
            <span className="text-xs text-[#6b5a4a]">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Team Members (Client Component) */}
      <TeamClient
        members={members}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
