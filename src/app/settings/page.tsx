"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAction, updateBusinessDefaults, getBusinessSettings } from "@/lib/actions/settings";
import { User, CreditCard, Building2, Mail, Pencil, DollarSign, FileText, Bell } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedBanner } from "@/components/ui/UnsavedBanner";
import type { BusinessSettings } from "@/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [companyValue, setCompanyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const { isDirty, markDirty, markClean } = useUnsavedChanges();

  // Pricing defaults state
  const [defaultAdminFee, setDefaultAdminFee] = useState(20);
  const [defaultTaxRate, setDefaultTaxRate] = useState(8.875);
  const [defaultTargetMargin, setDefaultTargetMargin] = useState(35);
  const [defaultDepositPercent, setDefaultDepositPercent] = useState(50);
  const [serviceChargePercent, setServiceChargePercent] = useState(0);
  const [savingPricing, setSavingPricing] = useState(false);

  // Payment & policies state
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [taxId, setTaxId] = useState("");
  const [savingPolicies, setSavingPolicies] = useState(false);

  // Notification state
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifProposals, setNotifProposals] = useState(true);
  const [notifPayments, setNotifPayments] = useState(true);
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => {
      setProfile(data);
      setNameValue(data?.full_name || "");
      setCompanyValue(data?.company_name || "");
    });

    getBusinessSettings().then((data) => {
      if (data) {
        setBusinessSettings(data);
        setDefaultAdminFee(data.default_admin_fee ?? 20);
        setDefaultTaxRate(data.default_tax_rate ?? 8.875);
        setDefaultTargetMargin(data.default_target_margin ?? 35);
        setDefaultDepositPercent(data.default_deposit_percent ?? 50);
        setServiceChargePercent(data.service_charge_percent ?? 0);
        setPaymentTerms(data.payment_terms ?? "Net 30");
        setCancellationPolicy(data.cancellation_policy ?? "");
        setTaxId(data.tax_id ?? "");
        setNotifEmail(data.notification_email ?? true);
        setNotifProposals(data.notification_proposals ?? true);
        setNotifPayments(data.notification_payments ?? true);
      }
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

  async function handleSavePricingDefaults() {
    setSavingPricing(true);
    const result = await updateBusinessDefaults({
      default_admin_fee: defaultAdminFee,
      default_tax_rate: defaultTaxRate,
      default_target_margin: defaultTargetMargin,
      default_deposit_percent: defaultDepositPercent,
      service_charge_percent: serviceChargePercent,
    });
    setSavingPricing(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Pricing defaults saved");
    }
  }

  async function handleSavePolicies() {
    setSavingPolicies(true);
    const result = await updateBusinessDefaults({
      payment_terms: paymentTerms,
      cancellation_policy: cancellationPolicy,
      tax_id: taxId,
    });
    setSavingPolicies(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment & policy settings saved");
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifs(true);
    const result = await updateBusinessDefaults({
      notification_email: notifEmail,
      notification_proposals: notifProposals,
      notification_payments: notifPayments,
    });
    setSavingNotifs(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Notification preferences saved");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-xs md:text-sm text-[#9c8876] mt-1">Manage your account, defaults, and preferences</p>
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
                <span className="text-sm">{profile?.full_name || "\u2014"}</span>
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
            <div className="text-sm">{profile?.email || "\u2014"}</div>
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
                <span className="text-sm">{profile?.company_name || "\u2014"}</span>
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

      {/* Pricing Defaults */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Pricing Defaults</h2>
        </div>
        <p className="text-xs text-[#9c8876] mb-4">These defaults will be applied to new events automatically.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Default Admin Fee %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={defaultAdminFee}
                onChange={(e) => setDefaultAdminFee(parseFloat(e.target.value) || 0)}
                className="input pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">Default Tax Rate %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.125}
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                className="input pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">Default Target Margin %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={defaultTargetMargin}
                onChange={(e) => setDefaultTargetMargin(parseFloat(e.target.value) || 0)}
                className="input pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">Default Deposit %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={defaultDepositPercent}
                onChange={(e) => setDefaultDepositPercent(parseInt(e.target.value) || 0)}
                className="input pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">Service Charge %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                className="input pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a4a] text-sm">%</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSavePricingDefaults}
            disabled={savingPricing}
            className="btn-primary"
          >
            {savingPricing ? "Saving..." : "Save Pricing Defaults"}
          </button>
        </div>
      </div>

      {/* Payment & Policies */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Payment & Policies</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Payment Terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g., Net 30"
              className="input"
            />
          </div>
          <div>
            <label className="label">Tax ID</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="e.g., 12-3456789"
              className="input"
            />
          </div>
          <div>
            <label className="label">Cancellation Policy</label>
            <textarea
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value)}
              placeholder="Describe your cancellation policy..."
              rows={4}
              className="input resize-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSavePolicies}
            disabled={savingPolicies}
            className="btn-primary"
          >
            {savingPolicies ? "Saving..." : "Save Policies"}
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">Notification Preferences</h2>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Email Notifications"
            description="Receive general email notifications"
            checked={notifEmail}
            onChange={setNotifEmail}
          />
          <ToggleRow
            label="Proposal Responses"
            description="Get notified when clients respond to proposals"
            checked={notifProposals}
            onChange={setNotifProposals}
          />
          <ToggleRow
            label="Payment Received"
            description="Get notified when payments are recorded"
            checked={notifPayments}
            onChange={setNotifPayments}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveNotifications}
            disabled={savingNotifs}
            className="btn-primary"
          >
            {savingNotifs ? "Saving..." : "Save Notifications"}
          </button>
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

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[#9c8876]">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-brand-500" : "bg-[#2e271f]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
