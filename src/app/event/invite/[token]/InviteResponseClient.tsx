"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptEventInviteAction, declineEventInviteAction } from "@/lib/actions/eventInvites";
import { CheckCircle2, XCircle, LogIn, UserPlus, Loader2 } from "lucide-react";

type Props = {
  inviteToken: string;
  eventId: string | null;
};

export function InviteResponseClient({ inviteToken, eventId }: Props) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();
  }, []);

  async function handleAccept() {
    setAccepting(true);
    setResult(null);
    try {
      const res = await acceptEventInviteAction(inviteToken);
      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true });
        // Redirect to the event page after a brief delay
        setTimeout(() => {
          if (res.eventId) {
            router.push(`/events/${res.eventId}`);
          } else {
            router.push("/dashboard");
          }
        }, 1500);
      }
    } catch {
      setResult({ error: "Something went wrong. Please try again." });
    } finally {
      setAccepting(false);
    }
  }

  async function handleDecline() {
    if (!confirm("Are you sure you want to decline this invite?")) return;
    setDeclining(true);
    setResult(null);
    try {
      const res = await declineEventInviteAction(inviteToken);
      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true });
        router.refresh();
      }
    } catch {
      setResult({ error: "Something went wrong. Please try again." });
    } finally {
      setDeclining(false);
    }
  }

  // Still checking auth status
  if (isLoggedIn === null) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center gap-2 py-4 text-[#6b5a4a] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  // Success state
  if (result?.success) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold mb-2">Invite Accepted</h3>
        <p className="text-sm text-[#9c8876]">
          You&apos;ve been added to this event. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-4">
        Respond to Invite
      </h3>

      {result?.error && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/50 mb-4">
          <p className="text-sm text-red-300">{result.error}</p>
        </div>
      )}

      {isLoggedIn ? (
        <div className="space-y-3">
          <p className="text-sm text-[#9c8876] mb-4">
            You&apos;re signed in. Accept this invite to join the event workspace.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="btn-primary flex items-center gap-2 px-6 py-2.5"
            >
              {accepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Accept Invite
            </button>
            <button
              onClick={handleDecline}
              disabled={accepting || declining}
              className="px-6 py-2.5 rounded-lg border border-[#2e271f] text-sm text-[#9c8876] hover:text-red-400 hover:border-red-800/60 transition-colors flex items-center gap-2"
            >
              {declining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Decline
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#9c8876]">
            Create an account or sign in to accept this invite and join the event workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={`/signup?redirect=/event/invite/${inviteToken}`}
              className="btn-primary flex items-center justify-center gap-2 px-6 py-2.5"
            >
              <UserPlus className="w-4 h-4" />
              Create Account to Join
            </a>
            <a
              href={`/login?redirect=/event/invite/${inviteToken}`}
              className="px-6 py-2.5 rounded-lg border border-[#2e271f] text-sm text-[#9c8876] hover:text-[#f5ede0] hover:border-brand-800/60 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
