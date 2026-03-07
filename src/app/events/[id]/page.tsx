import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Users, CalendarDays, Mail, ClipboardList, FileText, Clock, Phone, Receipt, DollarSign, Edit, Trash2, ExternalLink } from "lucide-react";
import { DeleteEventButton } from "@/components/events/DeleteEventButton";
import { DuplicateEventButton } from "@/components/events/DuplicateEventButton";
import { SaveAsTemplateButton } from "@/components/events/SaveAsTemplateButton";
import { PricingEngine } from "@/components/events/PricingEngine";
import { EventStatusSelect } from "@/components/events/EventStatusSelect";
import { EventLifecycle } from "@/components/events/EventLifecycle";
import { EventProfitLoss } from "@/components/events/EventProfitLoss";
import { GenerateProposalButton } from "@/components/proposals/GenerateProposalButton";
import { PaymentTracker } from "@/components/events/PaymentTracker";
import { StaffAssignments } from "@/components/events/StaffAssignments";
import { InlineSuggestion } from "@/components/assistant/InlineSuggestion";
import { formatCurrency } from "@/lib/utils";
import { EventActivityLog } from "@/components/events/EventActivityLog";
import { EventDetailTabs } from "@/components/events/EventDetailTabs";
import type { ActivityItem } from "@/components/events/EventActivityLog";
import type { Event, PricingData, PaymentData } from "@/types";

type Props = { params: Promise<{ id: string }> };

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase.from("events").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!event) notFound();

  const e = event as Event;

  // Fetch related data in parallel
  const [proposalsRes, receiptsRes, invoicesRes, assignmentsRes, staffRes] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, title, status, share_token, created_at")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("receipts")
      .select("id, vendor, total_amount, receipt_date, category")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .order("receipt_date", { ascending: false }),
    supabase
      .from("distributor_invoices")
      .select("id, distributor, total_amount, invoice_date")
      .eq("user_id", user.id),
    supabase
      .from("event_staff_assignments")
      .select("id, staff_member_id, role, start_time, end_time, confirmed, notes, created_at, staff_members(name, role, hourly_rate, phone)")
      .eq("event_id", id)
      .eq("user_id", user.id),
    supabase
      .from("staff_members")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  const proposals = proposalsRes.data ?? [];
  const receipts = receiptsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const allStaff = staffRes.data ?? [];
  const spendingTotal = receipts.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
  const pricing = e.pricing_data as PricingData | null;

  // Build activity items
  const activities: ActivityItem[] = [];

  activities.push({
    id: "created",
    type: "created",
    title: "Event created",
    date: e.created_at,
  });

  for (const p of proposals) {
    activities.push({
      id: `proposal-${p.id}`,
      type: "proposal",
      title: `Proposal "${p.title}" created`,
      detail: `Status: ${p.status}`,
      date: p.created_at,
    });
  }

  const paymentData = e.payment_data as PaymentData | null;
  if (paymentData?.payments) {
    for (const pay of paymentData.payments) {
      activities.push({
        id: `payment-${pay.id}`,
        type: "payment",
        title: `Payment received`,
        detail: `${formatCurrency(pay.amount)} via ${pay.method}${pay.note ? ` — ${pay.note}` : ""}`,
        date: pay.date,
      });
    }
  }

  for (const a of assignments) {
    activities.push({
      id: `staff-${a.id}`,
      type: "staff",
      title: `${(a as any).staff_members?.name ?? "Staff"} assigned`,
      detail: a.role ?? undefined,
      date: (a as any).created_at ?? e.created_at,
    });
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All events
          </Link>
          <h1 className="font-display text-2xl font-semibold truncate">{e.name}</h1>
          <p className="text-sm text-[#9c8876] mt-1">{e.client_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <EventStatusSelect eventId={e.id} currentStatus={e.status} />
          {e.pricing_data && <GenerateProposalButton event={e} />}
          <Link href={`/events/${e.id}/beo`} className="btn-secondary flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />Production Sheet
          </Link>
          <Link href={`/events/${e.id}/edit`} className="btn-secondary flex items-center gap-2">
            <Edit className="w-4 h-4" />Edit
          </Link>
          <DuplicateEventButton eventId={e.id} />
          {e.pricing_data && <SaveAsTemplateButton eventId={e.id} />}
          <InlineSuggestion prompt={`Help me price the "${e.name}" event for ${e.guest_count} guests on ${e.event_date}. What should I charge?`} label="Help me price this" />
          <DeleteEventButton eventId={e.id} eventName={e.name} />
        </div>
      </div>

      {/* Lifecycle Progress */}
      <div className="card p-4 mb-6">
        <EventLifecycle status={e.status} />
      </div>

      {/* Tabbed Content */}
      <EventDetailTabs>
        {{
          overview: (
            <div>
              {/* Event info cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="stat-label">Date</span>
                  </div>
                  <div className="text-sm font-medium">{format(new Date(e.event_date), "EEE, MMM d, yyyy")}</div>
                  {(e.start_time || e.end_time) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-[#9c8876]">
                      <Clock className="w-3 h-3" />
                      {e.start_time && formatTime(e.start_time)}
                      {e.start_time && e.end_time && " – "}
                      {e.end_time && formatTime(e.end_time)}
                    </div>
                  )}
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="stat-label">Guests</span>
                  </div>
                  <div className="text-sm font-medium">{e.guest_count}</div>
                  {pricing && (
                    <div className="text-xs text-[#9c8876] mt-1">{formatCurrency(pricing.suggestedPrice / pricing.guestCount)}/person</div>
                  )}
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="stat-label">Venue</span>
                  </div>
                  <div className="text-sm font-medium truncate">{e.venue || "—"}</div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="stat-label">Revenue</span>
                  </div>
                  <div className="text-sm font-medium text-brand-300">{pricing ? formatCurrency(pricing.suggestedPrice) : "—"}</div>
                  {pricing && (
                    <div className={`text-xs mt-1 ${pricing.projectedMargin >= 25 ? "text-green-400" : pricing.projectedMargin >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                      {pricing.projectedMargin.toFixed(1)}% margin
                    </div>
                  )}
                </div>
              </div>

              {/* Contact info row */}
              {(e.client_email || e.client_phone) && (
                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-[#9c8876]">
                  {e.client_email && (
                    <a href={`mailto:${e.client_email}`} className="flex items-center gap-1.5 hover:text-[#f5ede0] transition-colors">
                      <Mail className="w-3.5 h-3.5" />{e.client_email}
                    </a>
                  )}
                  {e.client_phone && (
                    <a href={`tel:${e.client_phone}`} className="flex items-center gap-1.5 hover:text-[#f5ede0] transition-colors">
                      <Phone className="w-3.5 h-3.5" />{e.client_phone}
                    </a>
                  )}
                </div>
              )}

              {/* Linked proposals */}
              {proposals.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-medium text-sm mb-3 text-[#9c8876]">Proposals</h2>
                  <div className="flex flex-wrap gap-2">
                    {proposals.map((p: any) => (
                      <div key={p.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1714] border border-[#2e271f] text-sm">
                        <Link href={`/proposals/${p.id}`} className="inline-flex items-center gap-2 hover:text-brand-300 transition-colors">
                          <FileText className="w-3.5 h-3.5 text-[#9c8876]" />
                          <span>{p.title}</span>
                          <span className={`badge text-[10px] ${p.status === "draft" ? "badge-draft" : p.status === "sent" ? "badge-proposed" : p.status === "accepted" ? "badge-confirmed" : "badge-canceled"}`}>
                            {p.status}
                          </span>
                        </Link>
                        {p.share_token && (
                          <Link href={`/p/${p.share_token}/portal`} className="text-[#6b5a4a] hover:text-brand-400 transition-colors" title="Client portal">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked spending */}
              {receipts.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-medium text-sm text-[#9c8876]">Event Spending</h2>
                    <Link href="/spending" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all spending</Link>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Receipt className="w-3.5 h-3.5 text-[#9c8876]" />
                        {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} linked
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(spendingTotal)}</span>
                    </div>
                    <div className="space-y-1.5">
                      {receipts.slice(0, 5).map((r: any) => (
                        <div key={r.id} className="flex justify-between text-xs text-[#9c8876]">
                          <span>{r.vendor || "Unknown vendor"}{r.category ? ` · ${r.category}` : ""}</span>
                          <span>{formatCurrency(Number(r.total_amount) || 0)}</span>
                        </div>
                      ))}
                      {receipts.length > 5 && (
                        <p className="text-xs text-[#6b5a4a]">+{receipts.length - 5} more</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {e.notes && (
                <div className="card p-4">
                  <h2 className="font-medium text-sm mb-2 text-[#9c8876]">Notes</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.notes}</p>
                </div>
              )}
            </div>
          ),

          pricing: (
            <div>
              {/* Profit & Loss - show when pricing exists */}
              {pricing && (
                <div className="mb-6">
                  <EventProfitLoss
                    revenue={pricing.suggestedPrice}
                    estimatedCost={pricing.totalCost}
                    actualSpending={spendingTotal}
                    receiptCount={receipts.length}
                  />
                </div>
              )}

              {/* Pricing Engine */}
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold mb-1">Pricing Engine</h2>
                <p className="text-sm text-[#9c8876]">Build your cost model. Calculations update in real time.</p>
              </div>

              <PricingEngine eventId={e.id} guestCount={e.guest_count} initialPricing={e.pricing_data as PricingData | null} />
            </div>
          ),

          payments: (
            <div>
              {pricing ? (
                <PaymentTracker
                  eventId={e.id}
                  suggestedPrice={pricing.suggestedPrice}
                  initialPayment={e.payment_data as PaymentData | null}
                />
              ) : (
                <div className="card p-8 text-center">
                  <DollarSign className="w-8 h-8 text-[#9c8876] mx-auto mb-3" />
                  <h3 className="font-medium text-sm mb-1">No pricing set</h3>
                  <p className="text-sm text-[#9c8876]">Set up pricing in the Pricing tab first to track payments.</p>
                </div>
              )}
            </div>
          ),

          staff: (
            <div>
              <StaffAssignments
                eventId={e.id}
                assignments={assignments as any}
                staffMembers={allStaff}
                eventStartTime={e.start_time}
                eventEndTime={e.end_time}
              />
            </div>
          ),

          activity: (
            <div>
              {activities.length > 0 ? (
                <>
                  <h2 className="font-display text-lg font-semibold mb-1">Activity Log</h2>
                  <p className="text-sm text-[#9c8876] mb-4">Timeline of events and changes</p>
                  <EventActivityLog activities={activities} />
                </>
              ) : (
                <div className="card p-8 text-center">
                  <Clock className="w-8 h-8 text-[#9c8876] mx-auto mb-3" />
                  <h3 className="font-medium text-sm mb-1">No activity yet</h3>
                  <p className="text-sm text-[#9c8876]">Activity will appear here as you work on this event.</p>
                </div>
              )}
            </div>
          ),
        }}
      </EventDetailTabs>
    </div>
  );
}
