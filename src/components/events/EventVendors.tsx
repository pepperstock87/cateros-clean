"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  Search,
  Users,
  MapPin,
  Music,
  Flower2,
  Package,
  Star,
  X,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Organization,
  EventOrganization,
  VendorRelationshipType,
} from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  eventId: string;
  isAdmin: boolean;
};

// ---------------------------------------------------------------------------
// Relationship config
// ---------------------------------------------------------------------------

const RELATIONSHIP_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  caterer: {
    label: "Caterer",
    color: "bg-brand-950 text-brand-300 border-brand-800/60",
    icon: Users,
  },
  venue: {
    label: "Venue",
    color: "bg-blue-950 text-blue-300 border-blue-800/60",
    icon: MapPin,
  },
  planner: {
    label: "Planner",
    color: "bg-purple-950 text-purple-300 border-purple-800/60",
    icon: Users,
  },
  rental_vendor: {
    label: "Rental",
    color: "bg-amber-950 text-amber-300 border-amber-800/60",
    icon: Package,
  },
  florist: {
    label: "Florist",
    color: "bg-pink-950 text-pink-300 border-pink-800/60",
    icon: Flower2,
  },
  entertainment_vendor: {
    label: "Entertainment",
    color: "bg-green-950 text-green-300 border-green-800/60",
    icon: Music,
  },
  other_vendor: {
    label: "Other",
    color: "bg-[#1c1814] text-[#9c8876] border-[#2e271f]",
    icon: Building2,
  },
};

const RELATIONSHIP_OPTIONS: { value: VendorRelationshipType; label: string }[] = [
  { value: "caterer", label: "Caterer" },
  { value: "venue", label: "Venue" },
  { value: "planner", label: "Planner" },
  { value: "rental_vendor", label: "Rental Company" },
  { value: "florist", label: "Florist" },
  { value: "entertainment_vendor", label: "Entertainment" },
  { value: "other_vendor", label: "Other" },
];

// ---------------------------------------------------------------------------
// Vendor form state
// ---------------------------------------------------------------------------

type VendorFormData = {
  organization_id: string | null;
  organization_name: string;
  relationship_type: VendorRelationshipType;
  role_label: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
};

const EMPTY_FORM: VendorFormData = {
  organization_id: null,
  organization_name: "",
  relationship_type: "other_vendor",
  role_label: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventVendors({ eventId, isAdmin }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // Data
  const [vendors, setVendors] = useState<EventOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add vendor
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "external">("search");
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Org search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VendorFormData>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Remove
  const [removingId, setRemovingId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch vendors
  // -------------------------------------------------------------------------

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("event_organizations")
        .select("*, organization:organizations(*)")
        .eq("event_id", eventId)
        .neq("status", "removed")
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (fetchErr) throw fetchErr;
      setVendors((data as EventOrganization[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load vendors";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // -------------------------------------------------------------------------
  // Org search (debounced)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("organizations")
          .select("*")
          .ilike("name", `%${searchQuery.trim()}%`)
          .eq("status", "active")
          .limit(8);

        setSearchResults((data as Organization[]) ?? []);
        setShowResults(true);
      } catch {
        // silent – user can keep typing
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, supabase]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // -------------------------------------------------------------------------
  // Select org from search
  // -------------------------------------------------------------------------

  function selectOrg(org: Organization) {
    setForm((f) => ({
      ...f,
      organization_id: org.id,
      organization_name: org.name,
      relationship_type: org.organization_type,
      contact_name: org.primary_contact_name ?? "",
      contact_email: org.primary_contact_email ?? "",
      contact_phone: org.primary_contact_phone ?? "",
    }));
    setSearchQuery("");
    setShowResults(false);
  }

  // -------------------------------------------------------------------------
  // Add vendor
  // -------------------------------------------------------------------------

  async function handleAdd() {
    if (!form.organization_id && addMode === "search") {
      toast.error("Please select an organization");
      return;
    }
    if (addMode === "external" && !form.organization_name.trim()) {
      toast.error("Please enter a vendor name");
      return;
    }

    setSaving(true);
    try {
      let orgId = form.organization_id;

      // If external vendor, create a placeholder organization
      if (addMode === "external" && !orgId) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: newOrg, error: orgErr } = await supabase
          .from("organizations")
          .insert({
            name: form.organization_name.trim(),
            organization_type: form.relationship_type,
            primary_contact_name: form.contact_name || null,
            primary_contact_email: form.contact_email || null,
            primary_contact_phone: form.contact_phone || null,
            status: "active",
          })
          .select()
          .single();

        if (orgErr) throw orgErr;
        orgId = newOrg.id;
      }

      const { error: insertErr } = await supabase
        .from("event_organizations")
        .insert({
          event_id: eventId,
          organization_id: orgId,
          relationship_type: form.relationship_type,
          role_label: form.role_label || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          notes: form.notes || null,
          is_primary: false,
          status: "active",
        });

      if (insertErr) throw insertErr;

      toast.success("Vendor added to event");
      setForm(EMPTY_FORM);
      setShowAdd(false);
      setAddMode("search");
      await fetchVendors();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add vendor";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Edit vendor
  // -------------------------------------------------------------------------

  function startEdit(v: EventOrganization) {
    setEditingId(v.id);
    setEditForm({
      role_label: v.role_label ?? "",
      contact_name: v.contact_name ?? "",
      contact_email: v.contact_email ?? "",
      contact_phone: v.contact_phone ?? "",
      notes: v.notes ?? "",
    });
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setEditSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from("event_organizations")
        .update({
          role_label: editForm.role_label || null,
          contact_name: editForm.contact_name || null,
          contact_email: editForm.contact_email || null,
          contact_phone: editForm.contact_phone || null,
          notes: editForm.notes || null,
        })
        .eq("id", editingId);

      if (updateErr) throw updateErr;

      toast.success("Vendor updated");
      setEditingId(null);
      setEditForm({});
      await fetchVendors();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update vendor";
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Remove vendor
  // -------------------------------------------------------------------------

  async function handleRemove(id: string) {
    if (!confirm("Remove this vendor from the event?")) return;
    setRemovingId(id);
    try {
      const { error: removeErr } = await supabase
        .from("event_organizations")
        .update({ status: "removed" })
        .eq("id", id);

      if (removeErr) throw removeErr;

      toast.success("Vendor removed");
      await fetchVendors();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove vendor";
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function RelBadge({ type }: { type: string }) {
    const cfg = RELATIONSHIP_CONFIG[type] ?? RELATIONSHIP_CONFIG.other_vendor;
    const Icon = cfg.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
      >
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const isActive = status === "active";
    return (
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          isActive
            ? "bg-green-950 text-green-300 border border-green-800/60"
            : "bg-yellow-950 text-yellow-300 border border-yellow-800/60"
        }`}
      >
        {isActive ? "Active" : "Invited"}
      </span>
    );
  }

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-center gap-2 py-8 text-[#6b5a4a] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading vendors...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5">
        <div className="text-center py-8">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button
            onClick={fetchVendors}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#9c8876]" />
          Vendors
          <span className="text-xs text-[#6b5a4a]">({vendors.length})</span>
        </h2>
        {isAdmin && (
          <button
            onClick={() => {
              setShowAdd(!showAdd);
              if (showAdd) {
                setForm(EMPTY_FORM);
                setAddMode("search");
                setSearchQuery("");
              }
            }}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {showAdd ? "Cancel" : "+ Add Vendor"}
          </button>
        )}
      </div>

      {/* Vendor list */}
      {vendors.length > 0 ? (
        <div className="space-y-3 mb-4">
          {vendors.map((v) => {
            const isEditing = editingId === v.id;

            return (
              <div
                key={v.id}
                className="bg-[#1a1714] border border-[#2e271f] rounded-xl p-4"
              >
                {isEditing ? (
                  /* ---- Inline edit form ---- */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#f5ede0]">
                        {v.organization?.name ?? "Unknown Vendor"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({});
                        }}
                        className="text-[#6b5a4a] hover:text-[#9c8876] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="label">Role Label</label>
                      <input
                        type="text"
                        className="input text-sm w-full"
                        placeholder="e.g. Lead caterer, AV provider..."
                        value={editForm.role_label ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, role_label: e.target.value }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label">Contact Name</label>
                        <input
                          type="text"
                          className="input text-sm w-full"
                          value={editForm.contact_name ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, contact_name: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input
                          type="email"
                          className="input text-sm w-full"
                          value={editForm.contact_email ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, contact_email: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Phone</label>
                        <input
                          type="tel"
                          className="input text-sm w-full"
                          value={editForm.contact_phone ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, contact_phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Notes</label>
                      <textarea
                        className="input text-sm w-full"
                        rows={2}
                        value={editForm.notes ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </div>

                    <button
                      onClick={handleSaveEdit}
                      disabled={editSaving}
                      className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5"
                    >
                      {editSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Edit3 className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </div>
                ) : (
                  /* ---- Vendor card display ---- */
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#f5ede0]">
                          {v.organization?.name ?? "Unknown Vendor"}
                        </span>
                        <RelBadge type={v.relationship_type} />
                        {v.is_primary && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800/60">
                            <Star className="w-2.5 h-2.5" />
                            Primary
                          </span>
                        )}
                        <StatusBadge status={v.status} />
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(v)}
                            className="text-[#6b5a4a] hover:text-brand-400 transition-colors p-1"
                            title="Edit vendor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemove(v.id)}
                            disabled={removingId === v.id}
                            className="text-[#6b5a4a] hover:text-red-400 transition-colors p-1"
                            title="Remove vendor"
                          >
                            {removingId === v.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {v.role_label && (
                      <p className="text-xs text-[#9c8876] mb-1.5">{v.role_label}</p>
                    )}

                    {/* Contact info */}
                    {(v.contact_name || v.contact_email || v.contact_phone) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#9c8876] mb-1.5">
                        {v.contact_name && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {v.contact_name}
                          </span>
                        )}
                        {v.contact_email && (
                          <a
                            href={`mailto:${v.contact_email}`}
                            className="flex items-center gap-1 hover:text-brand-400 transition-colors"
                          >
                            <Mail className="w-3 h-3" />
                            {v.contact_email}
                          </a>
                        )}
                        {v.contact_phone && (
                          <a
                            href={`tel:${v.contact_phone}`}
                            className="flex items-center gap-1 hover:text-brand-400 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            {v.contact_phone}
                          </a>
                        )}
                      </div>
                    )}

                    {v.notes && (
                      <p className="text-[11px] text-[#6b5a4a] mt-1">{v.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 mb-4">
          <Building2 className="w-8 h-8 text-[#2e271f] mx-auto mb-2" />
          <p className="text-xs text-[#6b5a4a]">No vendors added yet</p>
          {isAdmin && (
            <p className="text-[10px] text-[#6b5a4a] mt-1">
              Click &quot;+ Add Vendor&quot; to assign vendors to this event.
            </p>
          )}
        </div>
      )}

      {/* Add vendor form */}
      {showAdd && (
        <div className="p-4 rounded-xl border border-[#2e271f] bg-[#1a1714] space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddMode("search");
                setForm(EMPTY_FORM);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                addMode === "search"
                  ? "bg-brand-950 text-brand-300 border-brand-800/60"
                  : "text-[#6b5a4a] border-[#2e271f] hover:text-[#9c8876]"
              }`}
            >
              <Search className="w-3 h-3 inline mr-1" />
              Search Platform
            </button>
            <button
              onClick={() => {
                setAddMode("external");
                setForm(EMPTY_FORM);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                addMode === "external"
                  ? "bg-brand-950 text-brand-300 border-brand-800/60"
                  : "text-[#6b5a4a] border-[#2e271f] hover:text-[#9c8876]"
              }`}
            >
              <Plus className="w-3 h-3 inline mr-1" />
              Add External Vendor
            </button>
          </div>

          {/* Organization search */}
          {addMode === "search" && (
            <div ref={searchRef} className="relative">
              <label className="label">Search Organizations</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b5a4a]" />
                <input
                  type="text"
                  className="input text-sm w-full pl-8"
                  placeholder="Type to search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b5a4a] animate-spin" />
                )}
              </div>

              {/* Search results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-[#141210] border border-[#2e271f] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => selectOrg(org)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#1a1714] transition-colors border-b border-[#2e271f] last:border-b-0"
                    >
                      <div className="text-sm text-[#f5ede0]">{org.name}</div>
                      <div className="text-[10px] text-[#6b5a4a] flex items-center gap-2 mt-0.5">
                        <RelBadge type={org.organization_type} />
                        {org.primary_contact_email && (
                          <span>{org.primary_contact_email}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showResults && searchQuery.trim() && searchResults.length === 0 && !searching && (
                <div className="absolute z-10 mt-1 w-full bg-[#141210] border border-[#2e271f] rounded-lg shadow-xl p-3 text-center">
                  <p className="text-xs text-[#6b5a4a]">No organizations found</p>
                  <button
                    onClick={() => {
                      setAddMode("external");
                      setForm((f) => ({ ...f, organization_name: searchQuery.trim() }));
                      setSearchQuery("");
                      setShowResults(false);
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors"
                  >
                    Add as external vendor instead
                  </button>
                </div>
              )}

              {/* Selected org display */}
              {form.organization_id && (
                <div className="mt-2 flex items-center gap-2 bg-[#141210] border border-[#2e271f] rounded-lg px-3 py-2">
                  <Building2 className="w-4 h-4 text-[#9c8876] flex-shrink-0" />
                  <span className="text-sm text-[#f5ede0] flex-1">
                    {form.organization_name}
                  </span>
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        organization_id: null,
                        organization_name: "",
                      }))
                    }
                    className="text-[#6b5a4a] hover:text-[#9c8876] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* External vendor name */}
          {addMode === "external" && (
            <div>
              <label className="label">Vendor Name</label>
              <input
                type="text"
                className="input text-sm w-full"
                placeholder="Enter vendor/business name..."
                value={form.organization_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, organization_name: e.target.value }))
                }
              />
            </div>
          )}

          {/* Shared fields – visible once an org is selected or in external mode */}
          {(form.organization_id || addMode === "external") && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Relationship Type</label>
                  <select
                    className="input text-sm w-full"
                    value={form.relationship_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        relationship_type: e.target.value as VendorRelationshipType,
                      }))
                    }
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Role Label (optional)</label>
                  <input
                    type="text"
                    className="input text-sm w-full"
                    placeholder="e.g. Lead caterer, AV provider..."
                    value={form.role_label}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role_label: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Contact Name</label>
                  <input
                    type="text"
                    className="input text-sm w-full"
                    placeholder="Contact person"
                    value={form.contact_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input text-sm w-full"
                    placeholder="vendor@email.com"
                    value={form.contact_email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input text-sm w-full"
                    placeholder="(555) 123-4567"
                    value={form.contact_phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_phone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input text-sm w-full"
                  rows={2}
                  placeholder="Any special instructions or details..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={saving}
                className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add to Event
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
