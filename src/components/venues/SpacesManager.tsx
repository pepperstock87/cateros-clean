"use client";

import { useState } from "react";
import { createSpaceAction, updateSpaceAction, deleteSpaceAction } from "@/lib/actions/spaces";
import type { VenueSpace, SpaceType } from "@/types";
import { Plus, Edit2, Archive, X, Save } from "lucide-react";

const SPACE_TYPES: { value: SpaceType; label: string }[] = [
  { value: "ballroom", label: "Ballroom" },
  { value: "conference_room", label: "Conference Room" },
  { value: "outdoor_garden", label: "Outdoor Garden" },
  { value: "patio", label: "Patio" },
  { value: "rooftop", label: "Rooftop" },
  { value: "dining_room", label: "Dining Room" },
  { value: "ceremony_space", label: "Ceremony Space" },
  { value: "cocktail_lounge", label: "Cocktail Lounge" },
  { value: "tent", label: "Tent" },
  { value: "other", label: "Other" },
];

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

const INDOOR_OUTDOOR_OPTIONS = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "covered_outdoor", label: "Covered Outdoor" },
];

type Props = {
  spaces: VenueSpace[];
  venueProfileId: string;
};

type FormData = {
  name: string;
  description: string;
  space_type: string;
  capacity_seated: string;
  capacity_standing: string;
  square_footage: string;
  hourly_rate: string;
  daily_rate: string;
  half_day_rate: string;
  setup_time_minutes: string;
  teardown_time_minutes: string;
  indoor_outdoor: string;
  amenities: string[];
};

const initialFormData: FormData = {
  name: "",
  description: "",
  space_type: "",
  capacity_seated: "",
  capacity_standing: "",
  square_footage: "",
  hourly_rate: "",
  daily_rate: "",
  half_day_rate: "",
  setup_time_minutes: "60",
  teardown_time_minutes: "60",
  indoor_outdoor: "",
  amenities: [],
};

export function SpacesManager({ spaces, venueProfileId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [spaces_, setSpaces] = useState<VenueSpace[]>(spaces);
  const [customAmenity, setCustomAmenity] = useState("");

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setFormData(initialFormData);
    setEditingId(null);
    setShowForm(false);
    setCustomAmenity("");
  }

  function openEditForm(space: VenueSpace) {
    setFormData({
      name: space.name,
      description: space.description ?? "",
      space_type: space.space_type ?? "",
      capacity_seated: space.capacity_seated?.toString() ?? "",
      capacity_standing: space.capacity_standing?.toString() ?? "",
      square_footage: space.square_footage?.toString() ?? "",
      hourly_rate: space.hourly_rate?.toString() ?? "",
      daily_rate: space.daily_rate?.toString() ?? "",
      half_day_rate: space.half_day_rate?.toString() ?? "",
      setup_time_minutes: space.setup_time_minutes.toString(),
      teardown_time_minutes: space.teardown_time_minutes.toString(),
      indoor_outdoor: space.indoor_outdoor ?? "",
      amenities: [...space.amenities],
    });
    setEditingId(space.id);
    setShowForm(true);
  }

  function toggleAmenity(amenity: string) {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }

  function removeAmenity(amenity: string) {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }));
  }

  function addCustomAmenity() {
    const trimmed = customAmenity.trim();
    if (trimmed && !formData.amenities.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, trimmed],
      }));
      setCustomAmenity("");
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      showToast("Space name is required.", "error");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error } = await updateSpaceAction(editingId, {
          name: formData.name.trim(),
          description: formData.description || undefined,
          space_type: formData.space_type || undefined,
          capacity_seated: formData.capacity_seated ? parseInt(formData.capacity_seated) : undefined,
          capacity_standing: formData.capacity_standing ? parseInt(formData.capacity_standing) : undefined,
          square_footage: formData.square_footage ? parseInt(formData.square_footage) : undefined,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
          daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : undefined,
          half_day_rate: formData.half_day_rate ? parseFloat(formData.half_day_rate) : undefined,
          setup_time_minutes: formData.setup_time_minutes ? parseInt(formData.setup_time_minutes) : undefined,
          teardown_time_minutes: formData.teardown_time_minutes ? parseInt(formData.teardown_time_minutes) : undefined,
          indoor_outdoor: formData.indoor_outdoor || undefined,
          amenities: formData.amenities,
        });

        if (error) {
          showToast(error, "error");
        } else {
          setSpaces((prev) =>
            prev.map((s) =>
              s.id === editingId
                ? {
                    ...s,
                    name: formData.name.trim(),
                    description: formData.description || null,
                    space_type: (formData.space_type || null) as SpaceType | null,
                    capacity_seated: formData.capacity_seated ? parseInt(formData.capacity_seated) : null,
                    capacity_standing: formData.capacity_standing ? parseInt(formData.capacity_standing) : null,
                    square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
                    hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
                    daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
                    half_day_rate: formData.half_day_rate ? parseFloat(formData.half_day_rate) : null,
                    setup_time_minutes: formData.setup_time_minutes ? parseInt(formData.setup_time_minutes) : 60,
                    teardown_time_minutes: formData.teardown_time_minutes ? parseInt(formData.teardown_time_minutes) : 60,
                    indoor_outdoor: (formData.indoor_outdoor || null) as 'indoor' | 'outdoor' | 'covered_outdoor' | null,
                    amenities: formData.amenities,
                    updated_at: new Date().toISOString(),
                  }
                : s
            )
          );
          showToast("Space updated successfully.", "success");
          resetForm();
        }
      } else {
        const { data: newSpace, error } = await createSpaceAction({
          venue_profile_id: venueProfileId,
          name: formData.name.trim(),
          description: formData.description || undefined,
          space_type: formData.space_type || undefined,
          capacity_seated: formData.capacity_seated ? parseInt(formData.capacity_seated) : undefined,
          capacity_standing: formData.capacity_standing ? parseInt(formData.capacity_standing) : undefined,
          square_footage: formData.square_footage ? parseInt(formData.square_footage) : undefined,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
          daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : undefined,
          half_day_rate: formData.half_day_rate ? parseFloat(formData.half_day_rate) : undefined,
          setup_time_minutes: formData.setup_time_minutes ? parseInt(formData.setup_time_minutes) : 60,
          teardown_time_minutes: formData.teardown_time_minutes ? parseInt(formData.teardown_time_minutes) : 60,
          indoor_outdoor: formData.indoor_outdoor || undefined,
          amenities: formData.amenities,
        });

        if (error) {
          showToast(error, "error");
        } else if (newSpace) {
          setSpaces((prev) => [...prev, newSpace]);
          showToast("Space created successfully.", "success");
          resetForm();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(spaceId: string) {
    if (!confirm("Are you sure you want to archive this space?")) return;

    setSaving(true);
    try {
      const { error } = await deleteSpaceAction(spaceId);
      if (error) {
        showToast(error, "error");
      } else {
        setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
        showToast("Space archived successfully.", "success");
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[#2A3A5C] bg-[#0C1220] px-3 py-2.5 text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors";
  const labelClass = "block text-sm font-medium text-[#B8C4D8] mb-1.5";
  const selectClass =
    "w-full rounded-lg border border-[#2A3A5C] bg-[#0C1220] px-3 py-2.5 text-sm text-[#F4F1ED] focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors";

  return (
    <div className="relative space-y-6">
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

      {/* Header with Add Button */}
      {!showForm && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F4F1ED]">Spaces</h2>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Space
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-[#2A3A5C] bg-[#182030] p-6 space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#F4F1ED]">
              {editingId ? "Edit Space" : "Add New Space"}
            </h3>
            <button
              onClick={resetForm}
              className="text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors"
              disabled={saving}
            >
              <X size={20} />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className={labelClass}>Space Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Grand Ballroom"
              className={inputClass}
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this space..."
              rows={3}
              className={inputClass}
              disabled={saving}
            />
          </div>

          {/* Space Type */}
          <div>
            <label className={labelClass}>Space Type</label>
            <select
              value={formData.space_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, space_type: e.target.value }))}
              className={selectClass}
              disabled={saving}
            >
              <option value="">Select a type</option>
              {SPACE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Indoor/Outdoor */}
          <div>
            <label className={labelClass}>Indoor/Outdoor</label>
            <select
              value={formData.indoor_outdoor}
              onChange={(e) => setFormData((prev) => ({ ...prev, indoor_outdoor: e.target.value }))}
              className={selectClass}
              disabled={saving}
            >
              <option value="">Select</option>
              {INDOOR_OUTDOOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Capacity Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Capacity (Seated)</label>
              <input
                type="number"
                value={formData.capacity_seated}
                onChange={(e) => setFormData((prev) => ({ ...prev, capacity_seated: e.target.value }))}
                placeholder="e.g. 200"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Capacity (Standing)</label>
              <input
                type="number"
                value={formData.capacity_standing}
                onChange={(e) => setFormData((prev) => ({ ...prev, capacity_standing: e.target.value }))}
                placeholder="e.g. 300"
                className={inputClass}
                disabled={saving}
              />
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <label className={labelClass}>Square Footage</label>
            <input
              type="number"
              value={formData.square_footage}
              onChange={(e) => setFormData((prev) => ({ ...prev, square_footage: e.target.value }))}
              placeholder="e.g. 5000"
              className={inputClass}
              disabled={saving}
            />
          </div>

          {/* Rates Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="e.g. 500"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Daily Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.daily_rate}
                onChange={(e) => setFormData((prev) => ({ ...prev, daily_rate: e.target.value }))}
                placeholder="e.g. 2500"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Half-Day Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.half_day_rate}
                onChange={(e) => setFormData((prev) => ({ ...prev, half_day_rate: e.target.value }))}
                placeholder="e.g. 1500"
                className={inputClass}
                disabled={saving}
              />
            </div>
          </div>

          {/* Setup/Teardown Times */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Setup Time (minutes)</label>
              <input
                type="number"
                value={formData.setup_time_minutes}
                onChange={(e) => setFormData((prev) => ({ ...prev, setup_time_minutes: e.target.value }))}
                placeholder="60"
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Teardown Time (minutes)</label>
              <input
                type="number"
                value={formData.teardown_time_minutes}
                onChange={(e) => setFormData((prev) => ({ ...prev, teardown_time_minutes: e.target.value }))}
                placeholder="60"
                className={inputClass}
                disabled={saving}
              />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className={labelClass}>Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {COMMON_AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 text-sm text-[#B8C4D8] cursor-pointer hover:text-[#F4F1ED] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="w-4 h-4 rounded border-[#2A3A5C] bg-[#0C1220] text-brand-500 focus:ring-brand-500"
                    disabled={saving}
                  />
                  {amenity}
                </label>
              ))}
            </div>

            {/* Custom Amenities */}
            {formData.amenities.length > COMMON_AMENITIES.filter((a) => formData.amenities.includes(a)).length && (
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.amenities
                  .filter((a) => !COMMON_AMENITIES.includes(a))
                  .map((amenity) => (
                    <div
                      key={amenity}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-sm"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="text-brand-200 hover:text-brand-100"
                        disabled={saving}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Add Custom Amenity */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addCustomAmenity();
                  }
                }}
                placeholder="Add custom amenity..."
                className={inputClass}
                disabled={saving}
              />
              <button
                type="button"
                onClick={addCustomAmenity}
                className="px-4 py-2.5 rounded-lg bg-[#1A2538] border border-[#2A3A5C] text-[#B8C4D8] hover:text-[#F4F1ED] hover:border-brand-500 transition-colors text-sm font-medium"
                disabled={saving}
              >
                Add
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:bg-[#1A2538] disabled:text-[#7A8BA8] transition-colors text-sm font-medium"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Space"}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-[#1A2538] border border-[#2A3A5C] text-[#B8C4D8] hover:text-[#F4F1ED] hover:border-brand-500 disabled:text-[#7A8BA8] transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Spaces Grid */}
      {!showForm && spaces_.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces_.map((space) => (
            <div
              key={space.id}
              className="card rounded-xl border border-[#2A3A5C] bg-[#182030] p-5 hover:border-brand-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[#F4F1ED]">{space.name}</h3>
                  {space.space_type && (
                    <p className="text-xs text-brand-300 mt-1">
                      {SPACE_TYPES.find((t) => t.value === space.space_type)?.label || space.space_type}
                    </p>
                  )}
                </div>
              </div>

              {space.description && (
                <p className="text-sm text-[#B8C4D8] mb-4 line-clamp-2">{space.description}</p>
              )}

              {/* Capacity */}
              {(space.capacity_seated || space.capacity_standing) && (
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-[#7A8BA8]">
                  {space.capacity_seated && (
                    <div className="bg-[#0C1220] rounded px-2 py-1">
                      <span className="text-[#D4A373] font-medium">{space.capacity_seated}</span> seated
                    </div>
                  )}
                  {space.capacity_standing && (
                    <div className="bg-[#0C1220] rounded px-2 py-1">
                      <span className="text-[#D4A373] font-medium">{space.capacity_standing}</span> standing
                    </div>
                  )}
                </div>
              )}

              {/* Rates */}
              {(space.hourly_rate || space.daily_rate) && (
                <div className="text-sm text-[#D4A373] mb-4">
                  {space.daily_rate && <div>${space.daily_rate}/day</div>}
                  {space.hourly_rate && <div>${space.hourly_rate}/hour</div>}
                </div>
              )}

              {/* Amenities */}
              {space.amenities.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {space.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="inline-block px-2 py-1 rounded text-xs bg-brand-500/20 text-brand-300"
                      >
                        {amenity}
                      </span>
                    ))}
                    {space.amenities.length > 3 && (
                      <span className="inline-block px-2 py-1 rounded text-xs text-[#7A8BA8]">
                        +{space.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-[#2A3A5C]">
                <button
                  onClick={() => openEditForm(space)}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1A2538] border border-[#2A3A5C] text-[#B8C4D8] hover:text-[#F4F1ED] hover:border-brand-500 disabled:text-[#7A8BA8] transition-colors text-sm font-medium"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(space.id)}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1A2538] border border-[#2A3A5C] text-[#B8C4D8] hover:text-red-300 hover:border-red-500/30 disabled:text-[#7A8BA8] transition-colors text-sm font-medium"
                >
                  <Archive size={14} />
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!showForm && spaces_.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#2A3A5C] bg-[#0C1220]/50 p-12 text-center">
          <p className="text-[#7A8BA8] text-sm mb-4">No spaces added yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Your First Space
          </button>
        </div>
      )}
    </div>
  );
}
