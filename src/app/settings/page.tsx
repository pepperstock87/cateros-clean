"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, CreditCard, Building2, Mail } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("*").single().then(({ data }) => setProfile(data));
  }, []);

  const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  const planName = profile?.plan_tier === "pro" ? "Pro" : "Basic";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-xs md:text-sm text-[#9c8876] mt-1">Manage your account and subscription</p>
      </div>

      {/* Account Information */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Account Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9c8876] mb-1">Full Name</label>
            <div className="text-sm">{profile?.full_name || "—"}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#9c8876] mb-1">Email</label>
            <div className="text-sm">{profile?.email || "—"}</div>
          </div>
          <p className="text-xs text-[#6b5a4a] pt-2 border-t border-[#2e271f]">
            To update your account information, please contact support
          </p>
        </div>
      </div>

      {/* Company Information */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Company Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9c8876] mb-1">Company Name</label>
            <div className="text-sm">{profile?.company_name || "—"}</div>
          </div>
          <p className="text-xs text-[#6b5a4a] pt-2 border-t border-[#2e271f]">
            To update your company name, please contact support
          </p>
        </div>
      </div>

      {/* Subscription */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Subscription</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9c8876] mb-1">Current Plan</label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Cateros {planName}</span>
              {isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 border border-green-800/50 text-green-400">
                  {profile?.subscription_status}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Link href="/billing" className="btn-primary flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Manage Billing
            </Link>
            {profile?.plan_tier === "basic" && (
              <Link href="/billing" className="btn-secondary">
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Support</h2>
        </div>
        <p className="text-sm text-[#9c8876] mb-4">
          Need help? Have questions? We're here to help.
        </p>
        <a 
          href="mailto:support@cateros.com" 
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
}
