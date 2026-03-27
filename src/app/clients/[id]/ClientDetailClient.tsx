"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency, safeParseDate } from "@/lib/utils";
import { updateClientAction } from "@/lib/actions/clients";
import {
  Save,
  Loader2,
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  MapPin,
  Tag,
  StickyNote,
  UtensilsCrossed,
  MessageSquare,
  Pencil,
  X,
  Check,
} from "lucide-react";
import type { Client, Event, Proposal, PricingData } from "@/types";

const statusColors: Record<string, string> = {
  draft: "bg-[#2A3A5C] text-[#D4A373]",
  proposed: "bg-blue-900/30 text-blue-400",
  confirmed: "bg-emerald-900/30 text-emerald-400",
  completed: "bg-green-900/30 text-green-400",
  canceled: "bg-red-900/30 text-red-400",
  sent: "bg-blue-900/30 text-blue-400",
  viewed: "bg-cyan-900/30 text-cyan-400",
  approved: "bg-emerald-900/30 text-emerald-400",
  signed: "bg-green-900/30 text-green-400",
  deposit_paid: "bg-green-900/30 text-green-300",
  booked: "bg-green-900/30 text-green-400",
  declined: "bg-red-900/30 text-red-400",
  expired: "bg-red-900/30 text-red-400",
};

const clientStatusColors: Record<string, string> = {
  lead: "bg-blue-900/30 text-blue-400",
  active: "bg-emerald-900/30 text-emerald-400",
  past: "bg-[#2A3A5C] text-[#D4A373]",
  archived: "bg-red-900/30 text-red-400",
};

type Financials = {
  totalRevenue: number;
  totalEvents: number;
  avgEventValue: number;
  lastBookedDate: string | null;
};

type Props = {
  client: Client;
  events: Event[];
  proposals: Proposal[];
  financials: Financials;
};

export function ClientDetailClient({ client, events, proposals, financials }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState(client.first_name);
  const [lastName, setLastName] = useState(client.last_name);
  const [companyName, setCompanyName] = useState(client.company_name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(client.address_line1 ?? "");
  const [addressLine2, setAddressLine2] = useState(client.address_line2 ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [state, setState] = useState(client.state ?? "");
  const [zip, setZip] = useState(client.zip ?? "");
  const [tagsInput, setTagsInput] = useState(client.tags?.join(", ") ?? "");
  const [status, setStatus] = useState(client.status);
  const [dietaryNotes, setDietaryNotes] = useState(client.dietary_notes ?? "");
  const [communicationPrefs, setCommunicationPrefs] = useState(
    client.communication_preferences ?? ""
  );
  const [notes, setNotes] = useState(client.notes ?? "");

  function cancelEditing() {
    setIsEditing(false);
    setFirstName(client.first_name);
    setLastName(client.last_name);
    setCompanyName(client.company_name ?? "");
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setAddressLine1(client.address_line1 ?? "");
    setAddressLine2(client.address_line2 ?? "");
    setCity(client.city ?? "");
    setState(client.state ?? "");
    setZip(client.zip ?? "");
    setTagsInput(client.tags?.join(", ") ?? "");
    setStatus(client.status);
    setDietaryNotes(client.dietary_notes ?? "");
    setCommunicationPrefs(client.communication_preferences ?? "");
    setNotes(client.notes ?? "");
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("first_name", firstName);
    formData.set("last_name", lastName);
    formData.set("company_name", companyName);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("address_line1", addressLine1);
    formData.set("address_line2", addressLine2);
    formData.set("city", city);
    formData.set("state", state);
    formData.set("zip", zip);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    formData.set("tags", JSON.stringify(tags));
    formData.set("status", status);
    formData.set("dietary_notes", dietaryNotes);
    formData.set("communication_preferences", communicationPrefs);
    formData.set("notes", notes);

    startTransition(async () => {
      try {
        await updateClientAction(client.id, formData);
        setSaved(true);
        setIsEditing(false);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Failed to update client:", err);
      }
    });
  }

  const inputClass =
    "w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]";
  const readonlyClass = "text-sm text-[#F4F1ED]";

  // Tags as pills
  const tagsList = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-semibold truncate">
              {firstName} {lastName}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                clientStatusColors[status] ?? "bg-[#2A3A5C] text-[#D4A373]"
              }`}
            >
              {status}
            </span>
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          {companyName && (
            <p className="text-sm text-[#D4A373] mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {companyName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={cancelEditing}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* a) Client Info */}
      <div className="card p-5 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#7A8BA8] mb-1">First Name</label>
            {isEditing ? (
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            ) : (
              <p className={readonlyClass}>{firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#7A8BA8] mb-1">Last Name</label>
            {isEditing ? (
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            ) : (
              <p className={readonlyClass}>{lastName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#7A8BA8] mb-1">Company</label>
            {isEditing ? (
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
              />
            ) : (
              <p className={readonlyClass}>
                {companyName || <span className="text-[#7A8BA8]">--</span>}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#7A8BA8] mb-1">Status</label>
            {isEditing ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Client["status"])}
                className={inputClass}
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="past">Past</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                  clientStatusColors[status] ?? "bg-[#2A3A5C] text-[#D4A373]"
                }`}
              >
                {status}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#7A8BA8] mb-1">
              <Mail className="w-3 h-3 inline mr-1" />
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            ) : (
              <p className={readonlyClass}>
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-[#D4A373] hover:text-[#F4F1ED] transition-colors"
                  >
                    {email}
                  </a>
                ) : (
                  <span className="text-[#7A8BA8]">--</span>
                )}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#7A8BA8] mb-1">
              <Phone className="w-3 h-3 inline mr-1" />
              Phone
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            ) : (
              <p className={readonlyClass}>
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="text-[#D4A373] hover:text-[#F4F1ED] transition-colors"
                  >
                    {phone}
                  </a>
                ) : (
                  <span className="text-[#7A8BA8]">--</span>
                )}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-[#7A8BA8] mb-1">
              <MapPin className="w-3 h-3 inline mr-1" />
              Address
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Address line 1"
                  className={inputClass}
                />
                <input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Address line 2"
                  className={inputClass}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className={inputClass}
                  />
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className={inputClass}
                  />
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="ZIP"
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <p className={readonlyClass}>
                {addressLine1 || city || state ? (
                  <>
                    {addressLine1 && <span>{addressLine1}</span>}
                    {addressLine2 && <span>, {addressLine2}</span>}
                    {(city || state || zip) && (
                      <span>
                        {addressLine1 ? ", " : ""}
                        {[city, state].filter(Boolean).join(", ")}
                        {zip ? ` ${zip}` : ""}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[#7A8BA8]">--</span>
                )}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-[#7A8BA8] mb-1">
              <Tag className="w-3 h-3 inline mr-1" />
              Tags
            </label>
            {isEditing ? (
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vip, corporate, wedding..."
                className={inputClass}
              />
            ) : tagsList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#2A3A5C] text-[#D4A373] text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#7A8BA8] text-sm">--</p>
            )}
          </div>
        </div>
      </div>

      {/* b) Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="stat-label">Lifetime Revenue</span>
          </div>
          <div className="text-lg font-semibold text-brand-300">
            {formatCurrency(financials.totalRevenue)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="stat-label">Total Events</span>
          </div>
          <div className="text-lg font-semibold">{financials.totalEvents}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="stat-label">Avg Event Value</span>
          </div>
          <div className="text-lg font-semibold text-brand-300">
            {formatCurrency(financials.avgEventValue)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="stat-label">Last Booked</span>
          </div>
          <div className="text-sm font-medium" suppressHydrationWarning>
            {financials.lastBookedDate
              ? format(
                  new Date(financials.lastBookedDate + "T00:00:00Z"),
                  "MMM d, yyyy"
                )
              : "--"}
          </div>
        </div>
      </div>

      {/* c) Event History */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-1">Event History</h2>
        <p className="text-sm text-[#D4A373] mb-4">
          {events.length} {events.length === 1 ? "event" : "events"}
        </p>
        {events.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-[#7A8BA8]">No events linked to this client yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A3A5C] text-[#7A8BA8] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Event</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Venue</th>
                    <th className="text-center px-4 py-3">Guests</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const pricing = event.pricing_data as PricingData | null;
                    return (
                      <tr key={event.id} className="border-b border-[#2A3A5C]/50 hover:bg-[#1A2538] transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/events/${event.id}`}
                            className="font-medium text-[#F4F1ED] hover:text-brand-300 transition-colors inline-flex items-center gap-1"
                          >
                            {event.name}
                            <ChevronRight className="w-3 h-3 text-[#7A8BA8]" />
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#D4A373]" suppressHydrationWarning>
                          {format(safeParseDate(event.event_date), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-[#D4A373] hidden md:table-cell">
                          {event.venue ?? <span className="text-[#7A8BA8]">--</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-[#F4F1ED]">
                          {event.guest_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              statusColors[event.status] ?? "bg-[#2A3A5C] text-[#D4A373]"
                            }`}
                          >
                            {event.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-brand-300">
                          {pricing ? formatCurrency(pricing.suggestedPrice) : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* d) Proposal History */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-1">Proposal History</h2>
        <p className="text-sm text-[#D4A373] mb-4">
          {proposals.length} {proposals.length === 1 ? "proposal" : "proposals"}
        </p>
        {proposals.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-[#7A8BA8]">No proposals for this client yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A3A5C] text-[#7A8BA8] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Event</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => {
                    const event = proposal.event;
                    const pricing = event?.pricing_data as PricingData | null;
                    return (
                      <tr
                        key={proposal.id}
                        className="border-b border-[#2A3A5C]/50 hover:bg-[#1A2538] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/proposals/${proposal.id}`}
                            className="font-medium text-[#F4F1ED] hover:text-brand-300 transition-colors inline-flex items-center gap-1"
                          >
                            {proposal.title}
                            <ChevronRight className="w-3 h-3 text-[#7A8BA8]" />
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#D4A373]">
                          {event?.name ?? "--"}
                        </td>
                        <td className="px-4 py-3 text-[#D4A373] hidden md:table-cell" suppressHydrationWarning>
                          {format(new Date(proposal.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              statusColors[proposal.status] ?? "bg-[#2A3A5C] text-[#D4A373]"
                            }`}
                          >
                            {proposal.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-brand-300">
                          {pricing ? formatCurrency(pricing.suggestedPrice) : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* e) Preferences & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="w-4 h-4 text-[#D4A373]" />
            <h3 className="font-display font-semibold">Dietary Notes</h3>
          </div>
          {isEditing ? (
            <textarea
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              placeholder="Allergies, dietary restrictions, preferences..."
              rows={4}
              className={`${inputClass} resize-y`}
            />
          ) : (
            <p className="text-sm text-[#F4F1ED] whitespace-pre-wrap">
              {dietaryNotes || <span className="text-[#7A8BA8]">No dietary notes</span>}
            </p>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#D4A373]" />
            <h3 className="font-display font-semibold">Communication Preferences</h3>
          </div>
          {isEditing ? (
            <textarea
              value={communicationPrefs}
              onChange={(e) => setCommunicationPrefs(e.target.value)}
              placeholder="Preferred contact method, best times to reach, etc."
              rows={4}
              className={`${inputClass} resize-y`}
            />
          ) : (
            <p className="text-sm text-[#F4F1ED] whitespace-pre-wrap">
              {communicationPrefs || (
                <span className="text-[#7A8BA8]">No preferences set</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="w-4 h-4 text-[#D4A373]" />
          <h3 className="font-display font-semibold">General Notes</h3>
        </div>
        {isEditing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this client..."
            rows={5}
            className={`${inputClass} resize-y`}
          />
        ) : (
          <p className="text-sm text-[#F4F1ED] whitespace-pre-wrap">
            {notes || <span className="text-[#7A8BA8]">No notes</span>}
          </p>
        )}
      </div>
    </div>
  );
}
