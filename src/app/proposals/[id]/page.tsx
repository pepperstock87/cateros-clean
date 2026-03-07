import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Users, MapPin, FileText, Mail, MessageSquare } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Proposal, Event, PricingData, ClientMessage } from "@/types";
import { ProposalActions } from "./ProposalActions";
import { ReplyToClient } from "./ReplyToClient";
import { ProposalComments } from "@/components/proposals/ProposalComments";
import { RevisionHistory } from "@/components/proposals/RevisionHistory";
import { CreateRevisionButton } from "@/components/proposals/CreateRevisionButton";
import { getUserEntitlements } from "@/lib/entitlements";

type Props = { params: Promise<{ id: string }> };

type ProposalWithEvent = Proposal & { event: Event | null };

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("proposals")
    .select("*, event:events(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) notFound();
  const { isPro } = await getUserEntitlements();
  const proposal = data as ProposalWithEvent;
  const event = proposal.event;
  const pricing = event?.pricing_data as PricingData | null;

  // Fetch all revisions for this event (siblings in the revision chain)
  const { data: revisionRows } = await supabase
    .from("proposals")
    .select("id, revision_number, revision_notes, status, created_at")
    .eq("event_id", proposal.event_id)
    .eq("user_id", user.id)
    .order("revision_number", { ascending: true });

  const revisions = (revisionRows ?? []).map((r) => ({
    id: r.id as string,
    revision_number: r.revision_number as number,
    revision_notes: r.revision_notes as string | null,
    status: r.status as string,
    created_at: r.created_at as string,
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/proposals" className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All proposals
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{proposal.title}</h1>
            {proposal.revision_number > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-900/40 text-brand-300 border border-brand-800/40 font-medium">
                v{proposal.revision_number}
              </span>
            )}
          </div>
          <p className="text-sm text-[#9c8876] mt-1">
            Created {format(new Date(proposal.created_at), "MMMM d, yyyy")}
            {proposal.updated_at !== proposal.created_at && (
              <> · Updated {format(new Date(proposal.updated_at), "MMMM d, yyyy")}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CreateRevisionButton proposalId={proposal.id} eventId={proposal.event_id} isPro={isPro} />
          <ProposalActions proposal={proposal} event={event} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event details */}
          {event && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-sm">Event Details</h2>
                <Link href={`/events/${event.id}`} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  View event
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="stat-label mb-1">Event</div>
                  <div className="text-sm font-medium">{event.name}</div>
                </div>
                <div>
                  <div className="stat-label mb-1">Client</div>
                  <div className="text-sm font-medium">{event.client_name}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
                  <span className="text-sm">{format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#9c8876]" />
                  <span className="text-sm">{event.guest_count} guests</span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="text-sm">{event.venue}</span>
                  </div>
                )}
                {event.client_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="text-sm">{event.client_email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom message */}
          {proposal.custom_message && (
            <div className="card p-5">
              <h2 className="font-medium text-sm mb-3">Client Message</h2>
              <p className="text-sm text-[#9c8876] italic leading-relaxed">{proposal.custom_message}</p>
            </div>
          )}

          {/* Client messages */}
          {proposal.client_messages && proposal.client_messages.length > 0 && (
            <div className="card p-5">
              <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#9c8876]" />
                Client Messages
                <span className="text-xs text-[#9c8876]">({proposal.client_messages.length})</span>
              </h2>
              <div className="space-y-3">
                {proposal.client_messages.map((m: ClientMessage) => (
                  <div key={m.id} className={`p-3 rounded-lg text-sm ${m.from === "client" ? "bg-brand-950/50 border border-brand-800/30" : "bg-[#1a1714] border border-[#2e271f]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-[#9c8876] uppercase">
                          {m.from === "client" ? "Client" : "You"}
                        </span>
                        {m.action === "revision_requested" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400 border border-yellow-800/40">
                            Revision requested
                          </span>
                        )}
                        {m.action === "accepted" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/40">
                            Accepted
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6b5a4a]">
                        {format(new Date(m.created_at), "MMM d 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-[#f5ede0]">{m.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply to client */}
          {proposal.status === "sent" && (
            <ReplyToClient proposalId={proposal.id} />
          )}

          {/* Comments thread */}
          <ProposalComments proposalId={proposal.id} />

          {/* Pricing breakdown */}
          {pricing && (
            <div className="card p-5">
              <h2 className="font-medium text-sm mb-4">Pricing Breakdown</h2>

              {pricing.menuItems.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">Menu</h3>
                  <div className="space-y-1.5">
                    {pricing.menuItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="text-[#9c8876]">{formatCurrency(item.costPerPerson)} x {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pricing.staffing.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">Staffing</h3>
                  <div className="space-y-1.5">
                    {pricing.staffing.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span>{s.role} ({s.headcount} x {s.hours}hrs)</span>
                        <span className="text-[#9c8876]">{formatCurrency(s.hourlyRate * s.hours * s.headcount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pricing.rentals.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">Rentals & Equipment</h3>
                  <div className="space-y-1.5">
                    {pricing.rentals.map((r) => (
                      <div key={r.id} className="flex justify-between text-sm">
                        <span>{r.item} (x{r.quantity})</span>
                        <span className="text-[#9c8876]">{formatCurrency(r.unitCost * r.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-[#2e271f] pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#9c8876]">Subtotal</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9c8876]">Admin ({pricing.adminPercent}%)</span>
                  <span>{formatCurrency(pricing.adminFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9c8876]">Tax ({pricing.taxPercent}%)</span>
                  <span>{formatCurrency(pricing.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-brand-300 pt-2 border-t border-[#2e271f]">
                  <span>Total Investment</span>
                  <span>{formatCurrency(pricing.suggestedPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Terms */}
          {proposal.terms && (
            <div className="card p-5">
              <h2 className="font-medium text-sm mb-3">Terms & Conditions</h2>
              <p className="text-sm text-[#9c8876] leading-relaxed whitespace-pre-wrap">{proposal.terms}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {pricing && (
            <div className="card p-5">
              <h3 className="font-medium text-sm mb-4">Summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="stat-label">Total Investment</div>
                  <div className="text-xl font-semibold text-brand-300">{formatCurrency(pricing.suggestedPrice)}</div>
                </div>
                <div>
                  <div className="stat-label">Per Guest</div>
                  <div className="text-lg font-semibold">{formatCurrency(pricing.suggestedPrice / pricing.guestCount)}</div>
                </div>
                <div>
                  <div className="stat-label">Projected Margin</div>
                  <div className={`text-lg font-semibold ${pricing.projectedMargin >= 25 ? "text-green-400" : pricing.projectedMargin >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                    {formatPercent(pricing.projectedMargin)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <RevisionHistory proposalId={proposal.id} revisions={revisions} />

          <div className="card p-5">
            <h3 className="font-medium text-sm mb-3">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium">Created</div>
                  <div className="text-xs text-[#9c8876]">{format(new Date(proposal.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                </div>
              </div>
              {proposal.updated_at !== proposal.created_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#9c8876] mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium">Last updated</div>
                    <div className="text-xs text-[#9c8876]">{format(new Date(proposal.updated_at), "MMM d, yyyy 'at' h:mm a")}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
