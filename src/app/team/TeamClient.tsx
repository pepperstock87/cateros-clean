"use client";

import { useState, useEffect } from "react";
import { inviteTeamMember, cancelInvite, updateMemberRole, removeTeamMember, updateOrganization, getPendingInvites } from "@/lib/actions/team";
import { UserPlus, ChevronDown, Trash2, Loader2, Crown, Shield, Users, Eye, Briefcase, Clock, X, Mail, Building2, ImagePlus, Settings, Send, Copy, Check, RefreshCw, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OrgMemberRole } from "@/types";

type Member = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    full_name: string | null;
    email: string;
  };
};

type PendingInvite = {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  invited_by: string;
  invite_token: string | null;
  inviter: { full_name: string | null; email: string } | null;
};

type OrgInfo = {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  primary_contact_email: string | null;
} | null;

const ROLES: OrgMemberRole[] = ["owner", "admin", "manager", "staff", "viewer"];

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

export function TeamClient({
  members,
  currentUserId,
  isAdmin,
  organization,
  currentUserRole,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  organization?: OrgInfo;
  currentUserRole?: string;
}) {
  const router = useRouter();
  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>("staff");
  const [inviting, setInviting] = useState(false);

  // Member management
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // Pending invites
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);

  // Invite link
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  // Org settings
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [savingOrg, setSavingOrg] = useState(false);

  // Active section tab
  const [activeTab, setActiveTab] = useState<"members" | "invites" | "settings">("members");

  useEffect(() => {
    if (isAdmin) fetchInvites();
  }, [isAdmin]);

  async function fetchInvites() {
    setLoadingInvites(true);
    try {
      const result = await getPendingInvites();
      if (!result.error) {
        setPendingInvites(result.invites as PendingInvite[]);
      }
    } catch {
      // silent
    } finally {
      setLoadingInvites(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await inviteTeamMember(inviteEmail.trim(), inviteRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        const inviteUrl = result.inviteToken
          ? `${window.location.origin}/join/${result.inviteToken}`
          : null;
        setLastInviteLink(inviteUrl);
        if (inviteUrl) {
          navigator.clipboard.writeText(inviteUrl).catch(() => {});
          toast.success("Invite created! Link copied to clipboard.");
        } else {
          toast.success(result.success || "Invite sent");
        }
        setInviteEmail("");
        setInviteRole("staff");
        fetchInvites();
        router.refresh();
      }
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: OrgMemberRole) {
    setChangingRole(memberId);
    try {
      const result = await updateMemberRole(memberId, newRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Role updated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId);
    try {
      const result = await removeTeamMember(memberId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Member removed");
        setConfirmRemove(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setCancellingInvite(inviteId);
    try {
      const result = await cancelInvite(inviteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Invite cancelled");
        fetchInvites();
      }
    } catch {
      toast.error("Failed to cancel invite");
    } finally {
      setCancellingInvite(null);
    }
  }

  async function handleSaveOrgSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id || !orgName.trim()) return;
    setSavingOrg(true);
    try {
      const result = await updateOrganization(organization.id, { name: orgName.trim() });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Organization updated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update organization");
    } finally {
      setSavingOrg(false);
    }
  }

  const isOwner = currentUserRole === "owner";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#2A3A5C]">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "members"
              ? "border-brand-400 text-brand-300"
              : "border-transparent text-[#7A8BA8] hover:text-[#D4A373]"
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" />
          Members ({members.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("invites")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "invites"
                ? "border-brand-400 text-brand-300"
                : "border-transparent text-[#7A8BA8] hover:text-[#D4A373]"
            }`}
          >
            <Send className="w-3.5 h-3.5 inline mr-1.5" />
            Invites {pendingInvites.length > 0 && (
              <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60">
                {pendingInvites.length}
              </span>
            )}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-brand-400 text-brand-300"
                : "border-transparent text-[#7A8BA8] hover:text-[#D4A373]"
            }`}
          >
            <Settings className="w-3.5 h-3.5 inline mr-1.5" />
            Settings
          </button>
        )}
      </div>

      {/* ======== Members Tab ======== */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Invite Button / Form */}
          {isAdmin && (
            <div>
              {!showInviteForm ? (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </button>
              ) : (
                <>
                  <form onSubmit={handleInvite} className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#D4A373]" />
                      Invite a Team Member
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0C1220] border border-[#2A3A5C] text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:border-brand-600 transition-colors"
                      />
                      <div className="relative">
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as OrgMemberRole)}
                          className="appearance-none px-3 py-2 pr-8 rounded-lg bg-[#0C1220] border border-[#2A3A5C] text-sm text-[#F4F1ED] focus:outline-none focus:border-brand-600 transition-colors cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#7A8BA8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={inviting}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {inviting ? "Sending..." : "Send Invite"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowInviteForm(false); setInviteEmail(""); setLastInviteLink(null); }}
                          className="px-3 py-2 rounded-lg text-sm text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#1A2538] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#7A8BA8] mt-3">
                      A shareable invite link will be generated. Send it to your team member — they can join with one click.
                    </p>
                  </form>
                  {lastInviteLink && (
                    <div className="mt-3 rounded-lg border border-green-800/50 bg-green-900/20 p-4">
                      <p className="text-xs text-green-400 font-medium mb-2">Invite link created! Share it with your team member:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={lastInviteLink}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#0C1220] border border-[#2A3A5C] text-xs text-[#F4F1ED] font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(lastInviteLink);
                            setCopiedLink("last");
                            setTimeout(() => setCopiedLink(null), 2000);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-900/40 text-green-400 text-xs font-medium hover:bg-green-900/60 transition-colors"
                        >
                          {copiedLink === "last" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink === "last" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <button
                        onClick={() => setLastInviteLink(null)}
                        className="text-[11px] text-[#7A8BA8] hover:text-[#D4A373] mt-2 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Members Table */}
          <div className="rounded-xl border border-[#2A3A5C] overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-[#2A3A5C] bg-[#182030]">
              <span className="text-xs font-medium text-[#D4A373] uppercase tracking-wider">Name</span>
              <span className="text-xs font-medium text-[#D4A373] uppercase tracking-wider">Email</span>
              <span className="text-xs font-medium text-[#D4A373] uppercase tracking-wider">Role</span>
              <span className="text-xs font-medium text-[#D4A373] uppercase tracking-wider">Joined</span>
              {isAdmin && <span className="text-xs font-medium text-[#D4A373] uppercase tracking-wider w-10"></span>}
            </div>

            {members.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#7A8BA8]">
                No team members yet. Invite someone to get started.
              </div>
            ) : (
              members.map((member) => {
                const isCurrentUser = member.user_id === currentUserId;
                const isMemberOwner = member.role === "owner";
                return (
                  <div
                    key={member.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3.5 border-b border-[#1A2538] last:border-b-0 hover:bg-[#182030]/50 transition-colors"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#2A3A5C] flex items-center justify-center text-xs font-semibold text-[#D4A373] flex-shrink-0">
                        {(member.profile.full_name || member.profile.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {member.profile.full_name || "Unnamed"}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-[#7A8BA8]">(you)</span>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <span className="text-sm text-[#D4A373] truncate">{member.profile.email}</span>

                    {/* Role */}
                    <div className="flex items-center gap-2">
                      {isAdmin && !isMemberOwner && !isCurrentUser ? (
                        <div className="relative">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as OrgMemberRole)}
                            disabled={changingRole === member.id}
                            className="appearance-none text-[11px] font-semibold px-2 py-1 pr-6 rounded-full border cursor-pointer focus:outline-none transition-colors bg-[#1A2538] text-[#D4A373] border-[#2A3A5C] hover:border-brand-600"
                          >
                            {ROLES.filter(r => r !== "owner").map(r => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                          {changingRole === member.id ? (
                            <Loader2 className="w-3 h-3 text-[#7A8BA8] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none animate-spin" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#7A8BA8] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          )}
                        </div>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </div>

                    {/* Joined date */}
                    <span className="text-xs text-[#7A8BA8] whitespace-nowrap">
                      {new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>

                    {/* Remove button */}
                    {isAdmin && !isCurrentUser && !isMemberOwner ? (
                      <div className="flex justify-end w-10">
                        {confirmRemove === member.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemove(member.id)}
                              disabled={removing === member.id}
                              className="text-[10px] px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                            >
                              {removing === member.id ? "..." : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="text-[10px] px-2 py-1 rounded text-[#7A8BA8] hover:text-[#D4A373] transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(member.id)}
                            className="p-1.5 rounded-lg text-[#7A8BA8] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="w-10" />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======== Invites Tab ======== */}
      {activeTab === "invites" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-[#D4A373]" />
              Pending Invitations
            </h3>
            <button
              onClick={() => { setShowInviteForm(true); setActiveTab("members"); }}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              + Send New Invite
            </button>
          </div>

          {loadingInvites ? (
            <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#7A8BA8] mx-auto" />
              <p className="text-xs text-[#7A8BA8] mt-2">Loading invites...</p>
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-8 text-center">
              <Mail className="w-8 h-8 text-[#2A3A5C] mx-auto mb-2" />
              <p className="text-sm text-[#7A8BA8]">No pending invitations</p>
              <p className="text-xs text-[#7A8BA8] mt-1">Invite team members to collaborate on events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((invite) => {
                const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                return (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#2A3A5C] flex items-center justify-center text-xs font-semibold text-[#D4A373] flex-shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{invite.invited_email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <RoleBadge role={invite.role} />
                            {isExpired ? (
                              <span className="text-[10px] text-red-400">Expired</span>
                            ) : (
                              <span className="text-[10px] text-[#7A8BA8] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Sent {new Date(invite.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {invite.expires_at && (
                                  <> &middot; Expires {new Date(invite.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {invite.invite_token && (
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/join/${invite.invite_token}`;
                              navigator.clipboard.writeText(url);
                              setCopiedLink(invite.id);
                              setTimeout(() => setCopiedLink(null), 2000);
                              toast.success("Invite link copied!");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#D4A373] hover:text-brand-300 hover:bg-brand-900/20 transition-colors"
                            title="Copy invite link"
                          >
                            {copiedLink === invite.id ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                            {copiedLink === invite.id ? "Copied" : "Copy Link"}
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          disabled={cancellingInvite === invite.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#7A8BA8] hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          {cancellingInvite === invite.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======== Settings Tab ======== */}
      {activeTab === "settings" && isAdmin && organization && (
        <div className="space-y-6">
          {/* Organization Name */}
          <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D4A373]" />
              Organization Details
            </h3>
            <form onSubmit={handleSaveOrgSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#D4A373] mb-1.5">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="w-full max-w-md px-3 py-2 rounded-lg bg-[#0C1220] border border-[#2A3A5C] text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:border-brand-600 transition-colors"
                />
              </div>

              {/* Logo upload placeholder */}
              <div>
                <label className="block text-xs font-medium text-[#D4A373] mb-1.5">Organization Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#0C1220] border-2 border-dashed border-[#2A3A5C] flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-[#7A8BA8]" />
                  </div>
                  <div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs text-[#D4A373] border border-[#2A3A5C] hover:border-brand-600 hover:text-brand-300 transition-colors"
                      onClick={() => toast.info("Logo upload coming soon")}
                    >
                      Upload Logo
                    </button>
                    <p className="text-[10px] text-[#7A8BA8] mt-1">Recommended: 256x256px, PNG or SVG</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingOrg || orgName.trim() === organization.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  {savingOrg ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-xs text-[#7A8BA8] mb-4">
                These actions are irreversible. Proceed with caution.
              </p>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs text-red-400 border border-red-900/40 hover:bg-red-900/20 transition-colors"
                onClick={() => toast.info("Organization deletion is not yet available. Contact support.")}
              >
                Delete Organization
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
