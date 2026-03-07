"use client";

import { MapPin, ExternalLink, Building2, Mail, Phone, Globe } from "lucide-react";
import type { VendorCategory } from "@/types";

type Props = {
  vendor: {
    id: string;
    business_name: string;
    category: VendorCategory;
    description: string | null;
    city: string | null;
    state: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    website: string | null;
    specialties: string[];
    service_area: string | null;
    organization?: { name: string; slug: string | null } | null;
  };
  compact?: boolean;
};

const CATEGORY_CONFIG: Record<VendorCategory, { label: string; color: string }> = {
  caterer: { label: "Caterer", color: "bg-orange-950 text-orange-300 border-orange-800/40" },
  venue: { label: "Venue", color: "bg-blue-950 text-blue-300 border-blue-800/40" },
  florist: { label: "Florist", color: "bg-pink-950 text-pink-300 border-pink-800/40" },
  photographer: { label: "Photographer", color: "bg-purple-950 text-purple-300 border-purple-800/40" },
  planner: { label: "Planner", color: "bg-teal-950 text-teal-300 border-teal-800/40" },
  rental_company: { label: "Rental Company", color: "bg-yellow-950 text-yellow-300 border-yellow-800/40" },
  band_dj: { label: "Band / DJ", color: "bg-indigo-950 text-indigo-300 border-indigo-800/40" },
  other: { label: "Other", color: "bg-gray-900 text-gray-300 border-gray-700/40" },
};

export function VendorCard({ vendor, compact = false }: Props) {
  const location = [vendor.city, vendor.state].filter(Boolean).join(", ");
  const catConfig = CATEGORY_CONFIG[vendor.category] ?? CATEGORY_CONFIG.other;

  const maxChips = 5;
  const visibleSpecialties = vendor.specialties.slice(0, maxChips);
  const overflowCount = vendor.specialties.length - maxChips;

  // ---------------------------------------------------------------------------
  // Compact mode: single-row inline card
  // ---------------------------------------------------------------------------
  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[#1a1714] border border-[#2e271f] rounded-lg px-3 py-2.5">
        <Building2 className="w-4 h-4 text-[#9c8876] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#f5ede0] truncate">
              {vendor.business_name}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catConfig.color}`}>
              {catConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#6b5a4a]">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location}
              </span>
            )}
            {vendor.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {vendor.contact_email}
              </span>
            )}
          </div>
        </div>
        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6b5a4a] hover:text-brand-400 transition-colors flex-shrink-0"
            title="Visit website"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Full mode: detailed card
  // ---------------------------------------------------------------------------
  return (
    <div className="card card-hover p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-medium text-sm text-[#f5ede0] truncate">
            {vendor.business_name}
          </h3>
          {vendor.organization && (
            <p className="text-[10px] text-[#6b5a4a] mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {vendor.organization.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catConfig.color}`}>
            {catConfig.label}
          </span>
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6b5a4a] hover:text-brand-400 transition-colors p-1"
              title="Visit website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Location & contact */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9c8876] mb-3">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </span>
        )}
        {vendor.contact_name && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {vendor.contact_name}
          </span>
        )}
        {vendor.contact_email && (
          <a
            href={`mailto:${vendor.contact_email}`}
            className="flex items-center gap-1 hover:text-brand-400 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            {vendor.contact_email}
          </a>
        )}
        {vendor.contact_phone && (
          <a
            href={`tel:${vendor.contact_phone}`}
            className="flex items-center gap-1 hover:text-brand-400 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            {vendor.contact_phone}
          </a>
        )}
      </div>

      {/* Description */}
      {vendor.description && (
        <p className="text-xs text-[#9c8876] mb-3 line-clamp-2">
          {vendor.description}
        </p>
      )}

      {/* Service area */}
      {vendor.service_area && (
        <p className="text-[11px] text-[#6b5a4a] mb-3 flex items-center gap-1">
          <Globe className="w-3 h-3" />
          Serves: {vendor.service_area}
        </p>
      )}

      {/* Specialties chips */}
      {vendor.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSpecialties.map((specialty) => (
            <span
              key={specialty}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#251f19] text-[#9c8876] border border-[#2e271f]"
            >
              {specialty}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#251f19] text-[#6b5a4a] border border-[#2e271f]">
              +{overflowCount} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
