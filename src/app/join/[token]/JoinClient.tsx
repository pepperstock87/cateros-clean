"use client";

import { useState } from "react";
import { acceptInvite } from "@/lib/actions/team";
import { Building2, ChefHat, Crown, Shield, Briefcase, Users, Eye, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLE_LABELS: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-300" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-300" },
  manager: { label: "Manager", icon: Briefcase, color: "text-green-300" },
  staff: { label: "Staff", icon: Users, color: "text-[#D4A373]" },
  viewer: { label: "Viewer", icon: Eye, color: "text-[#7A8BA8]" },
};

export function JoinClient({
  inviteId,
  token,
  orgName,
  orgType,
  inviterName,
  role,
  invitedEmail,
  isLoggedIn,
  userEmail,
}: {
  inviteId: string;
  token: string;
  orgName: string;
  orgType: string;
  inviterName: string;
  role: string;
  invitedEmail: string;
  isLoggedIn: boolean;
  userEmail: string | null;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.staff;
  const RoleIcon = roleInfo.icon;
  const emailMatch = isLoggedIn && userEmail?.toLowerCase() === invitedEmail.toLowerCase();
  const emailMismatch = isLoggedIn && userEmail && userEmail.toLowerCase() !== invitedEmail.toLowerCase();

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const result = await acceptInvite(inviteId);
      if (result.error) {
        setError(result.error);
      } else {
        setAccepted(true);
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C1220] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold">Cateros</span>
          </div>
          <p className="text-sm text-[#7A8BA8]">You&apos;ve been invited to join a team</p>
        </div>

        {/* Invite Card */}
        <div className="card p-8">
          {accepted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-900/40 border border-green-800/50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="font-display text-lg font-semibold mb-1">Welcome to {orgName}!</h2>
              <p className="text-sm text-[#7A8BA8]">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <>
              {/* Organization Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-brand-950 border border-brand-800/60 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-brand-400" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">{orgName}</h2>
                  {orgType && <p className="text-xs text-[#D4A373] capitalize">{orgType}</p>}
                </div>
              </div>

              <div className="bg-[#0C1220] rounded-lg p-4 mb-6">
                <p className="text-sm text-[#F4F1ED]">
                  <span className="text-[#D4A373] font-medium">{inviterName}</span> invited you to join as
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
                  <span className={`text-sm font-semibold ${roleInfo.color}`}>{roleInfo.label}</span>
                </div>
              </div>

              <p className="text-xs text-[#7A8BA8] mb-6">
                Invite sent to <span className="text-[#D4A373]">{invitedEmail}</span>
              </p>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Logged in + email matches → Accept button */}
              {emailMatch && (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Joining...</>
                  ) : (
                    <><Check className="w-4 h-4" />Join {orgName}</>
                  )}
                </button>
              )}

              {/* Logged in but wrong email */}
              {emailMismatch && (
                <div className="space-y-3">
                  <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-3">
                    <p className="text-sm text-amber-300">
                      You&apos;re signed in as <span className="font-medium">{userEmail}</span>, but this invite was sent to <span className="font-medium">{invitedEmail}</span>.
                    </p>
                  </div>
                  <p className="text-xs text-[#7A8BA8] text-center">
                    Sign out and sign in with <span className="text-[#D4A373]">{invitedEmail}</span>, or create a new account with that email.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href={`/login?redirect=/join/${token}`}
                      className="btn-secondary flex-1 text-center text-sm"
                    >
                      Sign in
                    </Link>
                    <Link
                      href={`/signup?redirect=/join/${token}&email=${encodeURIComponent(invitedEmail)}&invite=1`}
                      className="btn-primary flex-1 text-center text-sm"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              )}

              {/* Not logged in → Sign up / Sign in */}
              {!isLoggedIn && (
                <div className="space-y-3">
                  <Link
                    href={`/signup?redirect=/join/${token}&email=${encodeURIComponent(invitedEmail)}&invite=1`}
                    className="btn-primary w-full text-center block"
                  >
                    Create account to join
                  </Link>
                  <Link
                    href={`/login?redirect=/join/${token}`}
                    className="btn-secondary w-full text-center block text-sm"
                  >
                    Already have an account? Sign in
                  </Link>
                  <p className="text-[11px] text-center text-[#7A8BA8]">
                    Joining a team is free — no subscription needed.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
