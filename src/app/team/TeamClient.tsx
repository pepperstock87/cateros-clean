"use client";

import { useState } from "react";
import { inviteMemberAction, updateMemberRoleAction, removeMemberAction } from "@/lib/actions/organizations";
import { UserPlus, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;

const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner: "bg-brand-950 text-brand-300 border-brand-800/60",
  admin: "bg-blue-950 text-blue-300 border-blue-800/60",
  manager: "bg-green-950 text-green-300 border-green-800/60",
  staff: "bg-[#1c1814] text-[#9c8876] border-[#2e271f]",
  viewer: "bg-[#1c1814] text-[#6b5a4a] border-[#2e271f]",
};

function RoleBadge({ role }: { role: string }) {
  const classes = ROLE_BADGE_CLASSES[role] || ROLE_BADGE_CLASSES.staff;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${classes}`}>
      {role}
    </span>
  );
}

export function TeamClient({
  members,
  currentUserId,
  isAdmin,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "manager" | "staff" | "viewer">("staff");
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await inviteMemberAction({ email: inviteEmail.trim(), role: inviteRole });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Member invited");
        setInviteEmail("");
        setInviteRole("staff");
        setShowInviteForm(false);
      }
    } catch {
      toast.error("Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: "owner" | "admin" | "manager" | "staff" | "viewer") {
    setChangingRole(memberId);
    try {
      const result = await updateMemberRoleAction(memberId, newRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Role updated");
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
      const result = await removeMemberAction(memberId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Member removed");
        setConfirmRemove(null);
      }
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
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
            <form onSubmit={handleInvite} className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-5">
              <h3 className="text-sm font-semibold mb-4">Invite a Team Member</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0f0d0b] border border-[#2e271f] text-sm text-[#f5ede0] placeholder:text-[#6b5a4a] focus:outline-none focus:border-brand-600 transition-colors"
                />
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "owner" | "admin" | "manager" | "staff" | "viewer")}
                    className="appearance-none px-3 py-2 pr-8 rounded-lg bg-[#0f0d0b] border border-[#2e271f] text-sm text-[#f5ede0] focus:outline-none focus:border-brand-600 transition-colors cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6b5a4a] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {inviting ? "Inviting..." : "Invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInviteForm(false); setInviteEmail(""); }}
                    className="px-3 py-2 rounded-lg text-sm text-[#9c8876] hover:text-[#f5ede0] hover:bg-[#1c1814] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="rounded-xl border border-[#2e271f] overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-[#2e271f] bg-[#1a1714]">
          <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">Name</span>
          <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">Email</span>
          <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">Role</span>
          <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wider">Joined</span>
          {isAdmin && <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wider w-10"></span>}
        </div>

        {members.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#6b5a4a]">
            No team members yet. Invite someone to get started.
          </div>
        ) : (
          members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isMemberOwner = member.role === "owner";
            return (
              <div
                key={member.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3.5 border-b border-[#1c1814] last:border-b-0 hover:bg-[#1a1714]/50 transition-colors"
              >
                {/* Name */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2e271f] flex items-center justify-center text-xs font-semibold text-[#9c8876] flex-shrink-0">
                    {(member.profile.full_name || member.profile.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {member.profile.full_name || "Unnamed"}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] text-[#6b5a4a]">(you)</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <span className="text-sm text-[#9c8876] truncate">{member.profile.email}</span>

                {/* Role */}
                <div className="flex items-center gap-2">
                  {isAdmin && !isMemberOwner && !isCurrentUser ? (
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as "owner" | "admin" | "manager" | "staff" | "viewer")}
                        disabled={changingRole === member.id}
                        className="appearance-none text-[11px] font-semibold px-2 py-1 pr-6 rounded-full border cursor-pointer focus:outline-none transition-colors bg-[#1c1814] text-[#9c8876] border-[#2e271f] hover:border-brand-600"
                      >
                        {ROLES.filter(r => r !== "owner").map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      {changingRole === member.id ? (
                        <Loader2 className="w-3 h-3 text-[#6b5a4a] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none animate-spin" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-[#6b5a4a] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </div>

                {/* Joined date */}
                <span className="text-xs text-[#6b5a4a] whitespace-nowrap">
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
                          className="text-[10px] px-2 py-1 rounded text-[#6b5a4a] hover:text-[#9c8876] transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member.id)}
                        className="p-1.5 rounded-lg text-[#6b5a4a] hover:text-red-400 hover:bg-red-900/20 transition-colors"
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
  );
}
