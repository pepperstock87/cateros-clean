"use client";

import { useState } from "react";
import { acceptInvite, declineInvite } from "@/lib/actions/team";
import { Building2, Crown, Shield, Users, Briefcase, Eye, Loader2, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Invite = {
  id: string;
  organization_id: string;
  invited_email: string;
  role: string;
  status: string;
  invite_token: string;
  created_at: string;
  expires_at: string | null;
  invited_by: string;
  organization: { id: string; name: string; organization_type: string; logo_url: string | null } | null;
  inviter: { full_name: string | null; email: string } | null;
};

const ROLE_BADGE_CONFIG: Record<string, { bg: string; icon: typeof Crown }> = {
  owner: { bg: "bg-amber-950 text-amber-300 border-amber-700/60", icon: Crown },
  admin: { bg: "bg-blue-950 text-blue-300 border-blue-800/60", icon: Shield },
  manager: { bg: "bg-green-950 text-green-300 border-green-800/60", icon: Briefcase },
  staff: { bg: "bg-[#1A2538] text-[#D4A373] border-[#2A3A5C]", icon: Users },
  viewer: { bg: "bg-[#1A2538] text-[#7A8BA8] border-[#2A3A5C]", icon: Eye },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_BADGE_CONFIG[role] || ROLE_BADGE_CONFIG.staff;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {role}
    </span>
  );
}

export function InvitesList({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function handleAccept(inviteId: string) {
    setAccepting(inviteId);
    try {
      const result = await acceptInvite(inviteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "You have joined the organization!");
        setDismissed((prev) => new Set([...prev, inviteId]));
        // Redirect to dashboard after a short delay
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch {
      toast.error("Failed to accept invite");
    } finally {
      setAccepting(null);
    }
  }

  async function handleDecline(inviteId: string) {
    setDeclining(inviteId);
    try {
      const result = await declineInvite(inviteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Invite declined");
        setDismissed((prev) => new Set([...prev, inviteId]));
      }
    } catch {
      toast.error("Failed to decline invite");
    } finally {
      setDeclining(null);
    }
  }

  const visibleInvites = invites.filter((inv) => !dismissed.has(inv.id));

  if (visibleInvites.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-8 text-center">
        <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="text-sm text-[#D4A373]">All caught up!</p>
        <p className="text-xs text-[#7A8BA8] mt-1">No more pending invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleInvites.map((invite) => {
        const inviterName = invite.inviter?.full_name || invite.inviter?.email || "Someone";
        const orgName = invite.organization?.name || "Unknown Organization";
        const orgType = invite.organization?.organization_type?.replace(/_/g, " ") || "";

        return (
          <div
            key={invite.id}
            className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-6"
          >
            {/* Org info */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-brand-950 border border-brand-800/60 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-brand-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#F4F1ED]">{orgName}</h3>
                {orgType && (
                  <p className="text-xs text-[#D4A373] capitalize mt-0.5">{orgType}</p>
                )}
                <p className="text-xs text-[#7A8BA8] mt-1">
                  <span className="text-[#D4A373]">{inviterName}</span> invited you to join as
                </p>
                <div className="mt-1.5">
                  <RoleBadge role={invite.role} />
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-[11px] text-[#7A8BA8] mb-5" suppressHydrationWarning>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Invited {new Date(invite.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              {invite.expires_at && (
                <span>
                  Expires {new Date(invite.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAccept(invite.id)}
                disabled={accepting === invite.id || declining === invite.id}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {accepting === invite.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {accepting === invite.id ? "Accepting..." : "Accept Invite"}
              </button>
              <button
                onClick={() => handleDecline(invite.id)}
                disabled={accepting === invite.id || declining === invite.id}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#2A3A5C] text-[#D4A373] hover:text-red-400 hover:border-red-900/40 hover:bg-red-900/10 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {declining === invite.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {declining === invite.id ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
