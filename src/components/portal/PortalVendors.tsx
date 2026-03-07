"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, Phone, User } from "lucide-react";
import type { EventOrganization } from "@/types";

type Props = {
  eventId: string;
};

const typeLabels: Record<string, string> = {
  caterer: "Caterer",
  venue: "Venue",
  planner: "Planner",
  rental_vendor: "Rentals",
  florist: "Florist",
  entertainment_vendor: "Entertainment",
  other_vendor: "Vendor",
};

const typeBadgeColors: Record<string, string> = {
  caterer: "bg-brand-900/40 text-brand-400 border-brand-800/50",
  venue: "bg-blue-900/40 text-blue-400 border-blue-800/50",
  planner: "bg-purple-900/40 text-purple-400 border-purple-800/50",
  rental_vendor: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
  florist: "bg-pink-900/40 text-pink-400 border-pink-800/50",
  entertainment_vendor: "bg-orange-900/40 text-orange-400 border-orange-800/50",
  other_vendor: "bg-zinc-800/40 text-zinc-400 border-zinc-700/50",
};

export function PortalVendors({ eventId }: Props) {
  const [vendors, setVendors] = useState<EventOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await fetch(`/api/portal/vendors?eventId=${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, [eventId]);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#6b5a4a]">Loading vendors...</p>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Building2 className="w-10 h-10 text-[#3d3428] mx-auto mb-3" />
        <p className="text-sm text-[#6b5a4a]">No vendors have been assigned to this event yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vendors.map((vendor) => {
        const orgName = vendor.organization?.name || vendor.role_label || "Vendor";
        const type = vendor.relationship_type;
        const badgeColor = typeBadgeColors[type] || typeBadgeColors.other_vendor;
        const label = typeLabels[type] || "Vendor";

        return (
          <div
            key={vendor.id}
            className="card p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#9c8876]" />
                <span className="text-sm font-medium text-[#f5ede0]">{orgName}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border ${badgeColor}`}>
                {label}
              </span>
            </div>

            <div className="space-y-1 ml-6">
              {vendor.contact_name && (
                <div className="flex items-center gap-2 text-xs text-[#9c8876]">
                  <User className="w-3 h-3" />
                  <span>{vendor.contact_name}</span>
                </div>
              )}
              {vendor.contact_email && (
                <div className="flex items-center gap-2 text-xs text-[#9c8876]">
                  <Mail className="w-3 h-3" />
                  <a href={`mailto:${vendor.contact_email}`} className="hover:text-[#f5ede0] transition-colors">
                    {vendor.contact_email}
                  </a>
                </div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2 text-xs text-[#9c8876]">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${vendor.contact_phone}`} className="hover:text-[#f5ede0] transition-colors">
                    {vendor.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
