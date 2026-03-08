"use client";

import { useState } from "react";
import { createOrganizationAction } from "@/lib/actions/organizations";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OrganizationType } from "@/types";

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: "caterer", label: "Caterer" },
  { value: "venue", label: "Venue" },
  { value: "planner", label: "Planner" },
  { value: "rental_vendor", label: "Rental Vendor" },
  { value: "florist", label: "Florist" },
  { value: "entertainment_vendor", label: "Entertainment" },
  { value: "other_vendor", label: "Other" },
];

export function CreateOrganizationForm() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrganizationType>("caterer");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const result = await createOrganizationAction({
        name: name.trim(),
        organization_type: orgType,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Organization created!");
        router.refresh();
      }
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setCreating(false);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
      >
        <Building2 className="w-4 h-4" />
        Create Organization
      </button>
    );
  }

  return (
    <form onSubmit={handleCreate} className="max-w-sm mx-auto text-left space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#D4A373] mb-1.5">Organization Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Catering Co."
          required
          autoFocus
          className="w-full px-3 py-2 rounded-lg bg-[#0C1220] border border-[#2A3A5C] text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:border-brand-600 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#D4A373] mb-1.5">Type</label>
        <select
          value={orgType}
          onChange={(e) => setOrgType(e.target.value as OrganizationType)}
          className="w-full px-3 py-2 rounded-lg bg-[#0C1220] border border-[#2A3A5C] text-sm text-[#F4F1ED] focus:outline-none focus:border-brand-600 transition-colors"
        >
          {ORG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          {creating ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={() => { setShowForm(false); setName(""); }}
          className="px-4 py-2.5 rounded-lg text-sm text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#1A2538] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
