"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";

export function SubscriptionBanner() {
  const [profile, setProfile] = useState<{ plan_tier?: string; subscription_status?: string; trial_end?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("plan_tier, subscription_status, trial_end")
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, []);

  if (!profile) return null;

  const now = new Date();
  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (profile.subscription_status === "trialing" && daysLeft > 0 && daysLeft <= 7) {
    return (
      <div className="mb-6 bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-4 flex items-start gap-3">
        <div className="text-yellow-400 text-xl">⏰</div>
        <div>
          <p className="text-sm font-medium text-yellow-200">Trial ending soon</p>
          <p className="text-sm text-yellow-300/80 mt-0.5">
            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your trial.{" "}
            <Link href="/billing" className="underline hover:text-yellow-200 font-medium">
              Upgrade now
            </Link>{" "}
            to keep access.
          </p>
        </div>
      </div>
    );
  }

  if (profile.plan_tier === "free" || profile.subscription_status === "canceled") {
    return (
      <div className="mb-6">
        <UpgradePrompt
          inline
          message="You're on the free plan (3 events/month). Upgrade for unlimited events and advanced features."
        />
      </div>
    );
  }

  return null;
}
