"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VenueCard } from "@/components/venues/VenueCard";
import {
  MapPin,
  Search,
  Building2,
  X,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import type { VenueProfile } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  eventId: string;
  currentVenue: string | null;
  eventOrganizations: Array<{
    organization_id: string;
    relationship_type: string;
  }>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventVenueSelector({
  eventId,
  currentVenue,
  eventOrganizations,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  // Find existing venue org link
  const venueOrgLink = eventOrganizations.find(
    (eo) => eo.relationship_type === "venue"
  );

  // Linked venue profile
  const [linkedVenue, setLinkedVenue] = useState<VenueProfile | null>(null);
  const [loadingLinked, setLoadingLinked] = useState(!!venueOrgLink);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VenueProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Fetch linked venue profile
  // ---------------------------------------------------------------------------

  const fetchLinkedVenue = useCallback(async () => {
    if (!venueOrgLink) {
      setLinkedVenue(null);
      setLoadingLinked(false);
      return;
    }

    setLoadingLinked(true);
    try {
      const { data, error } = await supabase
        .from("venue_profiles")
        .select("*, organization:organizations(name, slug)")
        .eq("organization_id", venueOrgLink.organization_id)
        .maybeSingle();

      if (error) throw error;
      setLinkedVenue(data as VenueProfile | null);
    } catch {
      // Venue profile may not exist for this org — that's fine
      setLinkedVenue(null);
    } finally {
      setLoadingLinked(false);
    }
  }, [venueOrgLink, supabase]);

  useEffect(() => {
    fetchLinkedVenue();
  }, [fetchLinkedVenue]);

  // ---------------------------------------------------------------------------
  // Venue search (debounced)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const term = `%${searchQuery.trim()}%`;
        const { data } = await supabase
          .from("venue_profiles")
          .select("*, organization:organizations(name, slug)")
          .or(`venue_name.ilike.${term},city.ilike.${term}`)
          .limit(6);

        setSearchResults((data as VenueProfile[]) ?? []);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, supabase]);

  // Close search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ---------------------------------------------------------------------------
  // Link a venue to the event
  // ---------------------------------------------------------------------------

  async function linkVenue(venue: VenueProfile) {
    setLinking(true);
    try {
      const { error: insertErr } = await supabase
        .from("event_organizations")
        .insert({
          event_id: eventId,
          organization_id: venue.organization_id,
          relationship_type: "venue" as const,
          role_label: venue.venue_name,
          is_primary: false,
          status: "active",
        });

      if (insertErr) throw insertErr;

      toast.success(`Venue "${venue.venue_name}" linked to event`);
      setLinkedVenue(venue);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to link venue";
      toast.error(message);
    } finally {
      setLinking(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Loading state
  if (loadingLinked) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-[#6b5a4a] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading venue...
        </div>
      </div>
    );
  }

  // Venue already linked — show it
  if (linkedVenue) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-[#9c8876] uppercase tracking-wide">
            Event Venue
          </span>
        </div>
        <VenueCard
          venue={{
            id: linkedVenue.id,
            venue_name: linkedVenue.venue_name,
            description: linkedVenue.description,
            city: linkedVenue.city,
            state: linkedVenue.state,
            capacity_seated: linkedVenue.capacity_seated,
            capacity_standing: linkedVenue.capacity_standing,
            indoor_outdoor: linkedVenue.indoor_outdoor,
            website: linkedVenue.website,
            amenities: linkedVenue.amenities,
            photos: linkedVenue.photos,
            organization: linkedVenue.organization
              ? { name: linkedVenue.organization.name, slug: (linkedVenue.organization as Record<string, unknown>).slug as string | null }
              : null,
          }}
        />
      </div>
    );
  }

  // No venue linked — show current venue text (if any) + search UI
  return (
    <div className="card p-5" ref={searchRef}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#9c8876]" />
          <span className="text-sm font-medium text-[#f5ede0]">Venue</span>
        </div>
        {!showSearch && (
          <button
            onClick={() => setShowSearch(true)}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Link a Venue
          </button>
        )}
      </div>

      {/* Current venue text (legacy field) */}
      {currentVenue && !showSearch && (
        <p className="text-xs text-[#9c8876] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          {currentVenue}
          <span className="text-[10px] text-[#6b5a4a]">(text only)</span>
        </p>
      )}

      {/* Empty state */}
      {!currentVenue && !showSearch && (
        <div className="text-center py-4">
          <Building2 className="w-6 h-6 text-[#2e271f] mx-auto mb-1.5" />
          <p className="text-xs text-[#6b5a4a]">No venue linked</p>
          <p className="text-[10px] text-[#6b5a4a] mt-0.5">
            Link a venue to see capacity, amenities, and more.
          </p>
        </div>
      )}

      {/* Search UI */}
      {showSearch && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b5a4a]" />
            <input
              type="text"
              className="input text-sm w-full pl-8 pr-8"
              placeholder="Search venues by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b5a4a] hover:text-[#9c8876] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Searching indicator */}
          {searching && (
            <div className="flex items-center gap-2 text-[#6b5a4a] text-xs py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching venues...
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {searchResults.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => linkVenue(venue)}
                  disabled={linking}
                  className="w-full text-left transition-colors rounded-lg hover:ring-1 hover:ring-brand-800/60 focus:ring-1 focus:ring-brand-800/60 focus:outline-none"
                >
                  <VenueCard
                    venue={{
                      id: venue.id,
                      venue_name: venue.venue_name,
                      description: venue.description,
                      city: venue.city,
                      state: venue.state,
                      capacity_seated: venue.capacity_seated,
                      capacity_standing: venue.capacity_standing,
                      indoor_outdoor: venue.indoor_outdoor,
                      website: venue.website,
                      amenities: venue.amenities,
                      photos: venue.photos,
                      organization: venue.organization
                        ? { name: venue.organization.name, slug: (venue.organization as Record<string, unknown>).slug as string | null }
                        : null,
                    }}
                    compact
                  />
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {searchQuery.trim() &&
            !searching &&
            searchResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-[#6b5a4a]">
                  No venues found for &quot;{searchQuery.trim()}&quot;
                </p>
              </div>
            )}

          {/* Linking indicator */}
          {linking && (
            <div className="flex items-center gap-2 text-brand-400 text-xs py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Linking venue...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
