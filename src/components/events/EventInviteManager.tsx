"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  Plus,
  Copy,
  Check,
  X,
  Loader2,
  Trash2,
  Mail,
  User,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  createEventInviteAction,
  getEventInvitesAction,
  revokeEventInviteAction,
} from "@/lib/actions/eventInvites";
import type { EventInvite, VendorRelationshipType } from "@/types";

const RELATIONSHIP_OPTIONS: { value: VendorRelationshipType; label: string }[] = [
  { value: "caterer", label: "Caterer" },
  { value: "venue", label: "Venue" },
  { value: "planner", label: "Planner" },
  { value: "rental_vendor", label: "Rental Company" },
  { value: "florist", label: "Florist" },
  { value: "entertainment_vendor", label: "Entertainment" },
  { value: "other_vendor", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-950 text-yellow-300 border-yellow-800/60" },
  accepted: { label: "Accepted", color: "bg-green-950 text-green-300 border-green-800/60" },
  declined: { label: "Declined", color: "bg-red-950 text-red-300 border-red-800/60" },
  expired: { label: "Expired", color: "bg-[#1c1814] text-[#6b5a4a] border-[#2e271f]" },
  revoked: { label: "Revoked", color: "bg-[#1c1814] text-[#6b5a4a] border-[#2e271f]" },
};

type Props = {
  eventId: string;
};

export function EventInviteManager({ eventId }: Props) {
  const [invites, setInvites] = useState<EventInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Form state
  const [relationshipType, setRelationshipType] = useState<VendorRelationshipType>("other_vendor");
  const [roleLabel, setRoleLabel] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [invitedName, setInvitedName] = useState("");
  const [notes, setNotes] = useState("");

  // New invite URL (shown after creation)
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEventInvitesAction(eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setInvites(result.invites as EventInvite[]);
      }
    } catch {
      toast.error("Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  function resetForm() {
    setRelationshipType("other_vendor");
    setRoleLabel("");
    setInvitedEmail("");
    setInvitedName("");
    setNotes("");
    setNewInviteUrl(null);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await createEventInviteAction({
        eventId,
        relationshipType,
        roleLabel: roleLabel || undefined,
        invitedEmail: invitedEmail || undefined,
        invitedName: invitedName || undefined,
        notes: notes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invite created");
        setNewInviteUrl(result.invite_url ?? null);
        await fetchInvites();
      }
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!confirm("Revoke this invite? The link will no longer work.")) return;
    setRevokingId(inviteId);
    try {
      const result = await revokeEventInviteAction(inviteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invite revoked");
        await fetchInvites();
      }
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  }

  function copyToClipboard(url: string, token: string) {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function getInviteUrl(token: string) {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${appUrl}/event/invite/${token}`;
  }

  if (loading) {
    return (
      <div className="card p-5 mt-4">
        <div className="flex items-center justify-center gap-2 py-6 text-[#6b5a4a] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading invites...
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Send className="w-4 h-4 text-[#9c8876]" />
          Vendor Invites
          <span className="text-xs text-[#6b5a4a]">({invites.length})</span>
        </h3>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            }
            setShowForm(!showForm);
          }}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          {showForm ? "Cancel" : "+ Create Invite"}
        </button>
      </div>

      {/* Create invite form */}
      {showForm && (
        <div className="p-4 rounded-xl border border-[#2e271f] bg-[#1a1714] space-y-4 mb-4">
          {newInviteUrl ? (
            /* Show generated link */
            <div className="space-y-3">
              <div className="text-center">
                <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h4 className="text-sm font-medium mb-1">Invite Created</h4>
                <p className="text-xs text-[#9c8876]">Share this link with the vendor</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newInviteUrl}
                  className="input text-sm w-full font-mono text-xs"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newInviteUrl);
                    toast.success("Copied to clipboard");
                  }}
                  className="btn-primary px-3 py-2 flex-shrink-0 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    resetForm();
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Create another invite
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="text-xs text-[#6b5a4a] hover:text-[#9c8876] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Invite form */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Vendor Type</label>
                  <select
                    className="input text-sm w-full"
                    value={relationshipType}
                    onChange={(e) =>
                      setRelationshipType(e.target.value as VendorRelationshipType)
                    }
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Role Label (optional)</label>
                  <input
                    type="text"
                    className="input text-sm w-full"
                    placeholder="e.g. Lead florist, DJ..."
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Vendor Name (optional)</label>
                  <input
                    type="text"
                    className="input text-sm w-full"
                    placeholder="Contact name"
                    value={invitedName}
                    onChange={(e) => setInvitedName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email (optional)</label>
                  <input
                    type="email"
                    className="input text-sm w-full"
                    placeholder="vendor@email.com"
                    value={invitedEmail}
                    onChange={(e) => setInvitedEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input text-sm w-full"
                  rows={2}
                  placeholder="Any message or instructions for the vendor..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                Generate Invite Link
              </button>
            </>
          )}
        </div>
      )}

      {/* Invites list */}
      {invites.length > 0 ? (
        <div className="space-y-3">
          {invites.map((invite) => {
            const statusCfg = STATUS_CONFIG[invite.status] ?? STATUS_CONFIG.pending;
            const url = getInviteUrl(invite.invite_token);
            const isCopied = copiedToken === invite.invite_token;
            const isExpiredByDate =
              invite.expires_at && new Date(invite.expires_at) < new Date();
            const effectiveStatus =
              isExpiredByDate && invite.status === "pending" ? "expired" : invite.status;
            const effectiveCfg = STATUS_CONFIG[effectiveStatus] ?? statusCfg;

            return (
              <div
                key={invite.id}
                className="bg-[#1a1714] border border-[#2e271f] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${effectiveCfg.color}`}
                    >
                      {effectiveCfg.label}
                    </span>
                    <span className="text-xs text-[#9c8876]">
                      {RELATIONSHIP_OPTIONS.find(
                        (o) => o.value === invite.relationship_type
                      )?.label ?? invite.relationship_type}
                    </span>
                    {invite.role_label && (
                      <span className="text-xs text-[#6b5a4a]">
                        &middot; {invite.role_label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {effectiveStatus === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            copyToClipboard(url, invite.invite_token)
                          }
                          className="text-[#6b5a4a] hover:text-brand-400 transition-colors p-1"
                          title="Copy invite link"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRevoke(invite.id)}
                          disabled={revokingId === invite.id}
                          className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1"
                          title="Revoke invite"
                        >
                          {revokingId === invite.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Invite details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6b5a4a]">
                  {invite.invited_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {invite.invited_name}
                    </span>
                  )}
                  {invite.invited_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {invite.invited_email}
                    </span>
                  )}
                  {invite.expires_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires{" "}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {invite.notes && (
                  <p className="text-[11px] text-[#6b5a4a] mt-1.5 italic">
                    {invite.notes}
                  </p>
                )}

                {/* Invite link for pending invites */}
                {effectiveStatus === "pending" && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="input text-[10px] font-mono w-full py-1.5 bg-[#141210] text-[#6b5a4a]"
                    />
                  </div>
                )}

                {/* Accepted info */}
                {invite.status === "accepted" && invite.accepted_at && (
                  <p className="text-[11px] text-green-400/70 mt-1.5">
                    Accepted on{" "}
                    {new Date(invite.accepted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-6">
            <Link2 className="w-8 h-8 text-[#2e271f] mx-auto mb-2" />
            <p className="text-xs text-[#6b5a4a]">No invites created yet</p>
            <p className="text-[10px] text-[#6b5a4a] mt-1">
              Create invite links to bring vendors into this event workspace.
            </p>
          </div>
        )
      )}
    </div>
  );
}
