"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAction } from "@/lib/actions/settings";
import { User, CreditCard, Building2, Mail, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedBanner } from "@/components/ui/UnsavedBanner";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [companyValue, setCompanyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const { isDirty, markDirty, markClean } = useUnsavedChanges();

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => {
      setProfile(data);
      setNameValue(data?.full_name || "");
      setCompanyValue(data?.company_name || "");
    });
  }, []);

  const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  const planName = profile?.plan_tier === "pro" ? "Pro" : "Basic";

  async function handleSaveName() {
    setSaving(true);
    const result = await updateProfileAction({ full_name: nameValue });
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Name updated successfully");
      setProfile((prev: any) => ({ ...prev, full_name: nameValue }));
      setEditingName(false);
      markClean();
    }
  }

  async function handleSaveCompany() {
    setSaving(true);
    const result = await updateProfileAction({ company_name: companyValue });
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Company name updated successfully");
      setProfile((prev: any) => ({ ...prev, company_name: companyValue }));
      setEditingCompany(false);
      markClean();
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-xs md:text-sm text-[#9c8876] mt-1">Manage your account and subscription</p>
      </div>

      <UnsavedBanner show={isDirty} />

      {/* Account Information */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Account Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9c8876] mb-1">Full Name</label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => { setNameValue(e.target.value); markDirty(); }}
                  className="input text-sm px-3 py-1.5 rounded-md border border-[#3e362e] bg-[#1a1510] focus:outline-none focus:border-brand-400"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameValue(profile?.full_name || "");
                    markClean();
                  }}
                  className="text-xs px-3 py-1.5 rounded-md border border-[#3e362e] hover:bg-[#2e271f] text-[#9c8876] font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{profile?.full_name || "—"}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-[#9c8876] hover:text-brand-400 transition-colors"
                  title="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#9c8876] mb-1">Email</label>
            <div className="text-sm">{profile?.email || "—"}</div>
          </div>
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
            {editingCompany ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={companyValue}
                  onChange={(e) => { setCompanyValue(e.target.value); markDirty(); }}
                  className="input text-sm px-3 py-1.5 rounded-md border border-[#3e362e] bg-[#1a1510] focus:outline-none focus:border-brand-400"
                  autoFocus
                />
                <button
                  onClick={handleSaveCompany}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingCompany(false);
                    setCompanyValue(profile?.company_name || "");
                    markClean();
                  }}
                  className="text-xs px-3 py-1.5 rounded-md border border-[#3e362e] hover:bg-[#2e271f] text-[#9c8876] font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{profile?.company_name || "—"}</span>
                <button
                  onClick={() => setEditingCompany(true)}
                  className="text-[#9c8876] hover:text-brand-400 transition-colors"
                  title="Edit company name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
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
