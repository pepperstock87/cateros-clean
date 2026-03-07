"use client";

import { useState } from "react";
import { upsertVenueProfileAction } from "@/lib/actions/venues";
import type { VenueProfile } from "@/types";
import { MapPin, Save, X, Plus } from "lucide-react";

const COMMON_AMENITIES = [
  "Kitchen",
  "Bar",
  "Dance Floor",
  "AV Equipment",
  "Outdoor Space",
  "Parking",
  "Coat Check",
  "Bridal Suite",
  "Stage",
  "Wi-Fi",
  "Restrooms",
  "Handicap Accessible",
  "Elevator",
  "Loading Dock",
  "Tables & Chairs",
  "Linens",
];

type Props = {
  venueProfile: VenueProfile | null;
  organizationId: string;
};

export function VenueProfileEditor({ venueProfile, organizationId }: Props) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [venueName, setVenueName] = useState(venueProfile?.venue_name ?? "");
  const [description, setDescription] = useState(venueProfile?.description ?? "");
  const [addressLine1, setAddressLine1] = useState(venueProfile?.address_line_1 ?? "");
  const [addressLine2, setAddressLine2] = useState(venueProfile?.address_line_2 ?? "");
  const [city, setCity] = useState(venueProfile?.city ?? "");
  const [state, setState] = useState(venueProfile?.state ?? "");
  const [postalCode, setPostalCode] = useState(venueProfile?.postal_code ?? "");
  const [capacitySeated, setCapacitySeated] = useState<string>(
    venueProfile?.capacity_seated?.toString() ?? ""
  );
  const [capacityStanding, setCapacityStanding] = useState<string>(
    venueProfile?.capacity_standing?.toString() ?? ""
  );
  const [website, setWebsite] = useState(venueProfile?.website ?? "");
  const [indoorOutdoor, setIndoorOutdoor] = useState<string>(venueProfile?.indoor_outdoor ?? "");
  const [indoorOutdoorNotes, setIndoorOutdoorNotes] = useState(venueProfile?.indoor_outdoor_notes ?? "");
  const [parkingNotes, setParkingNotes] = useState(venueProfile?.parking_notes ?? "");
  const [accessNotes, setAccessNotes] = useState(venueProfile?.access_notes ?? "");
  const [amenities, setAmenities] = useState<string[]>(venueProfile?.amenities ?? []);
  const [customAmenity, setCustomAmenity] = useState("");

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleAmenity(amenity: string) {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  }

  function addCustomAmenity() {
    const trimmed = customAmenity.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
      setCustomAmenity("");
    }
  }

  async function handleSave() {
    if (!venueName.trim()) {
      showToast("Venue name is required.", "error");
      return;
    }

    setSaving(true);
    const { error } = await upsertVenueProfileAction({
      venue_name: venueName.trim(),
      description: description || undefined,
      address_line_1: addressLine1 || undefined,
      address_line_2: addressLine2 || undefined,
      city: city || undefined,
      state: state || undefined,
      postal_code: postalCode || undefined,
      capacity_seated: capacitySeated ? parseInt(capacitySeated) : undefined,
      capacity_standing: capacityStanding ? parseInt(capacityStanding) : undefined,
      website: website || undefined,
      indoor_outdoor: indoorOutdoor || undefined,
      indoor_outdoor_notes: indoorOutdoorNotes || undefined,
      parking_notes: parkingNotes || undefined,
      access_notes: accessNotes || undefined,
      amenities,
    });
    setSaving(false);

    if (error) {
      showToast(error, "error");
    } else {
      showToast("Venue profile saved successfully.", "success");
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
        {/* Venue Name */}
        <div>
          <label className={labelClass}>Venue Name *</label>
          <input
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="e.g. The Grand Ballroom"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your venue, its atmosphere, and what makes it special..."
            rows={4}
            className={inputClass}
          />
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Address Line 1</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main St"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Address Line 2</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite 100"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label className={labelClass}>Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="12345"
              className={inputClass}
            />
          </div>
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Seated Capacity</label>
            <input
              type="number"
              value={capacitySeated}
              onChange={(e) => setCapacitySeated(e.target.value)}
              placeholder="e.g. 200"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Standing Capacity</label>
            <input
              type="number"
              value={capacityStanding}
              onChange={(e) => setCapacityStanding(e.target.value)}
              placeholder="e.g. 350"
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
            placeholder="https://yourvenue.com"
            className={inputClass}
          />
        </div>

        {/* Indoor/Outdoor */}
        <div>
          <label className={labelClass}>Indoor / Outdoor</label>
          <select
            value={indoorOutdoor}
            onChange={(e) => setIndoorOutdoor(e.target.value)}
            className={inputClass}
          >
            <option value="">Select...</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="both">Both</option>
          </select>
        </div>

        {indoorOutdoor && (
          <div>
            <label className={labelClass}>Indoor/Outdoor Notes</label>
            <textarea
              value={indoorOutdoorNotes}
              onChange={(e) => setIndoorOutdoorNotes(e.target.value)}
              placeholder="Additional details about indoor/outdoor spaces..."
              rows={2}
              className={inputClass}
            />
          </div>
        )}

        {/* Parking & Access */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Parking Notes</label>
            <textarea
              value={parkingNotes}
              onChange={(e) => setParkingNotes(e.target.value)}
              placeholder="Parking lot, valet, street parking..."
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Access Notes</label>
            <textarea
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder="Loading dock, freight elevator, vendor entrance..."
              rows={2}
              className={inputClass}
            />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className={labelClass}>Amenities</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_AMENITIES.map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  amenities.includes(amenity)
                    ? "bg-brand-950 text-brand-300 border-brand-800/60"
                    : "bg-[#0f0d0b] text-[#9c8876] border-[#2e271f] hover:border-[#4a3f33] hover:text-[#c4b5a4]"
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>

          {/* Custom amenities that aren't in the common list */}
          {amenities
            .filter((a) => !COMMON_AMENITIES.includes(a))
            .map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-950 text-brand-300 border border-brand-800/60 mr-2 mb-2"
              >
                {amenity}
                <button
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

          {/* Add custom amenity */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customAmenity}
              onChange={(e) => setCustomAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomAmenity();
                }
              }}
              placeholder="Add custom amenity..."
              className={`${inputClass} max-w-xs`}
            />
            <button
              type="button"
              onClick={addCustomAmenity}
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
            {saving ? "Saving..." : "Save Venue Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
