"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateBusinessSettings, uploadLogo } from "@/lib/actions/settings";
import { Upload, Lock, Save } from "lucide-react";
import type { BusinessSettings, UserEntitlements } from "@/types";
import Link from "next/link";

export default function BrandingPage() {
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    Promise.all([
      fetch("/api/entitlements").then(r => r.json()),
      supabase.from("business_settings").select("*").single()
    ]).then(([ent, { data }]) => {
      setEntitlements(ent);
      setSettings(data);
    });
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    const result = await uploadLogo(formData);
    if (result.error) {
      alert(result.error);
    } else if (result.logo_url) {
      setSettings(prev => prev ? { ...prev, logo_url: result.logo_url } : null);
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateBusinessSettings(formData);

    if (result?.error) {
      alert(result.error);
    } else {
      alert("Branding settings saved!");
    }
    setSaving(false);
  }

  const isPro = entitlements?.isPro || false;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">Branding</h1>
        <p className="text-xs md:text-sm text-[#9c8876] mt-1">Customize how your proposals look to clients</p>
      </div>

      {!isPro && (
        <div className="card p-4 md:p-6 mb-6 bg-brand-950 border-brand-800">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-brand-300 mb-1">Pro Feature</h3>
              <p className="text-sm text-[#9c8876] mb-3">
                Custom branding is available on the Pro plan. Upgrade to add your logo and business details to proposals.
              </p>
              <Link href="/billing" className="btn-primary inline-flex items-center gap-2">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Logo</label>
            {settings?.logo_url && (
              <div className="mb-3">
                <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            <label className={`btn-secondary inline-flex items-center gap-2 ${!isPro ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload Logo"}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                disabled={!isPro || uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-[#6b5a4a] mt-1">PNG or JPG, max 2MB</p>
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Business Name</label>
            <input
              type="text"
              name="business_name"
              defaultValue={settings?.business_name || ""}
              disabled={!isPro}
              className="input"
              placeholder="Your Business Name"
            />
            <p className="text-xs text-[#6b5a4a] mt-1">Appears at the top of proposals</p>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                type="tel"
                name="phone"
                defaultValue={settings?.phone || ""}
                disabled={!isPro}
                className="input"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                defaultValue={settings?.email || ""}
                disabled={!isPro}
                className="input"
                placeholder="contact@business.com"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <textarea
              name="address"
              defaultValue={settings?.address || ""}
              disabled={!isPro}
              rows={2}
              className="input"
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          {/* Brand Color */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="brand_color"
                defaultValue={settings?.brand_color || "#c4956a"}
                disabled={!isPro}
                className="w-10 h-10 rounded border border-[#2e271f] bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={settings?.brand_color || "#c4956a"}
                onChange={(e) => setSettings(prev => prev ? { ...prev, brand_color: e.target.value } : null)}
                disabled={!isPro}
                className="input w-32"
                placeholder="#c4956a"
              />
            </div>
            <p className="text-xs text-[#6b5a4a] mt-1">Accent color used in proposals</p>
          </div>

          {/* Proposal Template */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Proposal Template</label>
            <select
              name="proposal_template"
              defaultValue={settings?.proposal_template || "simple"}
              disabled={!isPro}
              className="input"
            >
              <option value="simple">Simple</option>
              <option value="modern">Modern</option>
            </select>
            <p className="text-xs text-[#6b5a4a] mt-1">Choose the layout style for your proposals</p>
          </div>

          {/* Proposal Terms */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Proposal Terms & Conditions</label>
            <textarea
              name="proposal_terms"
              defaultValue={settings?.proposal_terms || ""}
              disabled={!isPro}
              rows={4}
              className="input"
              placeholder="Payment terms, cancellation policy, etc."
            />
            <p className="text-xs text-[#6b5a4a] mt-1">Appears at the bottom of every proposal</p>
          </div>

          {isPro && (
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Branding"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
