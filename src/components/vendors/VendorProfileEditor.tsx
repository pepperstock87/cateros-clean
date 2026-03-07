"use client";

import { useState } from "react";
import { upsertVendorProfileAction } from "@/lib/actions/vendorProfiles";
import type { VendorProfile, VendorCategory } from "@/types";
import { Save, X, Plus } from "lucide-react";

const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: "caterer", label: "Caterer" },
  { value: "venue", label: "Venue" },
  { value: "florist", label: "Florist" },
  { value: "photographer", label: "Photographer" },
  { value: "planner", label: "Planner" },
  { value: "rental_company", label: "Rental Company" },
  { value: "band_dj", label: "Band or DJ" },
  { value: "other", label: "Other" },
];

const COMMON_SPECIALTIES = [
  "Weddings",
  "Corporate",
  "Buffet",
  "Plated Service",
  "BBQ",
  "Cocktail Parties",
  "Outdoor Events",
  "Farm-to-Table",
  "Vegan / Vegetarian",
  "Holiday Parties",
  "Fundraisers",
  "Private Dining",
  "Food Trucks",
  "Brunch",
];

type Props = {
  vendorProfile: VendorProfile | null;
  organizationId: string;
};

export function VendorProfileEditor({ vendorProfile, organizationId }: Props) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [businessName, setBusinessName] = useState(vendorProfile?.business_name ?? "");
  const [category, setCategory] = useState<VendorCategory>(vendorProfile?.category ?? "caterer");
  const [description, setDescription] = useState(vendorProfile?.description ?? "");
  const [city, setCity] = useState(vendorProfile?.city ?? "");
  const [state, setState] = useState(vendorProfile?.state ?? "");
  const [contactName, setContactName] = useState(vendorProfile?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(vendorProfile?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(vendorProfile?.contact_phone ?? "");
  const [website, setWebsite] = useState(vendorProfile?.website ?? "");
  const [serviceArea, setServiceArea] = useState(vendorProfile?.service_area ?? "");
  const [specialties, setSpecialties] = useState<string[]>(vendorProfile?.specialties ?? []);
  const [customSpecialty, setCustomSpecialty] = useState("");

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleSpecialty(specialty: string) {
    setSpecialties((prev) =>
      prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty]
    );
  }

  function addCustomSpecialty() {
    const trimmed = customSpecialty.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties((prev) => [...prev, trimmed]);
      setCustomSpecialty("");
    }
  }

  async function handleSave() {
    if (!businessName.trim()) {
      showToast("Business name is required.", "error");
      return;
    }

    setSaving(true);
    const { error } = await upsertVendorProfileAction({
      business_name: businessName.trim(),
      category,
      description: description || undefined,
      city: city || undefined,
      state: state || undefined,
      contact_name: contactName || undefined,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
      website: website || undefined,
      service_area: serviceArea || undefined,
      specialties,
    });
    setSaving(false);

    if (error) {
      showToast(error, "error");
    } else {
      showToast("Vendor profile saved successfully.", "success");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[#2e271f] bg-[#0f0d0b] px-3 py-2.5 text-sm text-[#f5ede0] placeholder:text-[#6b5a4a] focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors";
  const labelClass = "block text-sm font-medium text-[#c4b5a4] mb-1.5";

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-900/80 text-green-300 border border-green-800"
              : "bg-red-900/80 text-red-300 border border-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-6 space-y-6">
        {/* Business Name & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Business Name *</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Delicious Catering Co."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VendorCategory)}
              className={inputClass}
            >
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your business, services, and what makes you unique..."
            rows={4}
            className={inputClass}
          />
        </div>

        {/* City / State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className={inputClass}
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Doe"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="jane@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className={labelClass}>Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourbusiness.com"
            className={inputClass}
          />
        </div>

        {/* Service Area */}
        <div>
          <label className={labelClass}>Service Area</label>
          <input
            type="text"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            placeholder="e.g. Greater Boston Area, New England, Nationwide"
            className={inputClass}
          />
        </div>

        {/* Specialties */}
        <div>
          <label className={labelClass}>Specialties</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_SPECIALTIES.map((specialty) => (
              <button
                key={specialty}
                type="button"
                onClick={() => toggleSpecialty(specialty)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  specialties.includes(specialty)
                    ? "bg-brand-950 text-brand-300 border-brand-800/60"
                    : "bg-[#0f0d0b] text-[#9c8876] border-[#2e271f] hover:border-[#4a3f33] hover:text-[#c4b5a4]"
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>

          {/* Custom specialties that aren't in the common list */}
          {specialties
            .filter((s) => !COMMON_SPECIALTIES.includes(s))
            .map((specialty) => (
              <span
                key={specialty}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-950 text-brand-300 border border-brand-800/60 mr-2 mb-2"
              >
                {specialty}
                <button
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

          {/* Add custom specialty */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customSpecialty}
              onChange={(e) => setCustomSpecialty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSpecialty();
                }
              }}
              placeholder="Add custom specialty..."
              className={`${inputClass} max-w-xs`}
            />
            <button
              type="button"
              onClick={addCustomSpecialty}
              className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium bg-[#0f0d0b] text-[#9c8876] border border-[#2e271f] hover:border-[#4a3f33] hover:text-[#c4b5a4] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Vendor Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
