"use client";

import { MapPin, Users, ExternalLink, Building2 } from "lucide-react";

type Props = {
  venue: {
    id: string;
    venue_name: string;
    description: string | null;
    city: string | null;
    state: string | null;
    capacity_seated: number | null;
    capacity_standing: number | null;
    indoor_outdoor: string | null;
    website: string | null;
    amenities: string[];
    photos: string[];
    organization?: { name: string; slug: string | null } | null;
  };
  compact?: boolean;
};

const INDOOR_OUTDOOR_LABEL: Record<string, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Indoor / Outdoor",
};

export function VenueCard({ venue, compact = false }: Props) {
  const location = [venue.city, venue.state].filter(Boolean).join(", ");
  const capacityParts: string[] = [];
  if (venue.capacity_seated) capacityParts.push(`Seats ${venue.capacity_seated}`);
  if (venue.capacity_standing) capacityParts.push(`Standing ${venue.capacity_standing}`);
  const capacityText = capacityParts.join(" \u00b7 ");
  const indoorOutdoorLabel = venue.indoor_outdoor
    ? INDOOR_OUTDOOR_LABEL[venue.indoor_outdoor] ?? venue.indoor_outdoor
    : null;

  const maxChips = 5;
  const visibleAmenities = venue.amenities.slice(0, maxChips);
  const overflowCount = venue.amenities.length - maxChips;

  // ---------------------------------------------------------------------------
  // Compact mode: single-row inline card
  // ---------------------------------------------------------------------------
  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[#182030] border border-[#2A3A5C] rounded-lg px-3 py-2.5">
        <Building2 className="w-4 h-4 text-[#D4A373] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[#F4F1ED] truncate block">
            {venue.venue_name}
          </span>
          <div className="flex items-center gap-3 text-[11px] text-[#7A8BA8]">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location}
              </span>
            )}
            {capacityText && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {capacityText}
              </span>
            )}
            {indoorOutdoorLabel && <span>{indoorOutdoorLabel}</span>}
          </div>
        </div>
        {venue.website && (
          <a
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7A8BA8] hover:text-brand-400 transition-colors flex-shrink-0"
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
          <h3 className="font-medium text-sm text-[#F4F1ED] truncate">
            {venue.venue_name}
          </h3>
          {venue.organization && (
            <p className="text-[10px] text-[#7A8BA8] mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {venue.organization.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {indoorOutdoorLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">
              {indoorOutdoorLabel}
            </span>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7A8BA8] hover:text-brand-400 transition-colors p-1"
              title="Visit website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Location & capacity */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#D4A373] mb-3">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </span>
        )}
        {capacityText && (
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {capacityText}
          </span>
        )}
      </div>

      {/* Description */}
      {venue.description && (
        <p className="text-xs text-[#D4A373] mb-3 line-clamp-2">
          {venue.description}
        </p>
      )}

      {/* Amenities chips */}
      {venue.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleAmenities.map((amenity) => (
            <span
              key={amenity}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2A44] text-[#D4A373] border border-[#2A3A5C]"
            >
              {amenity}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F2A44] text-[#7A8BA8] border border-[#2A3A5C]">
              +{overflowCount} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
