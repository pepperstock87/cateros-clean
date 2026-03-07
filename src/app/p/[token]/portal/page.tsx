import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Users, MapPin, Clock, DollarSign, CheckCircle, FileText, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Event, PricingData, PaymentData, PaymentScheduleItem, Payment } from "@/types";
import { ClientResponse } from "../ClientResponse";
import { ClientPayButton } from "@/components/payments/ClientPayButton";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { PortalTimeline } from "@/components/portal/PortalTimeline";
import { PortalMenu } from "@/components/portal/PortalMenu";
import { PortalVendors } from "@/components/portal/PortalVendors";
import { PortalDocuments } from "@/components/portal/PortalDocuments";
import Link from "next/link";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function ClientPortalPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { payment: paymentStatus } = await searchParams;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, event:events(*)")
    .eq("share_token", token)
    .single();

  if (!proposal) notFound();

  const { data: settings } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", proposal.user_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", proposal.user_id)
    .single();

  const event = proposal.event as Event | null;
  const pricing = event?.pricing_data as PricingData | null;
  const payment = event?.payment_data as PaymentData | null;
  const companyName = settings?.business_name || profile?.company_name || "Catering Company";

  // Fetch payment schedules and payments from the new tables
  const [schedulesRes, paymentsRes] = await Promise.all([
    supabase
      .from("payment_schedules")
      .select("*")
      .eq("event_id", proposal.event_id)
      .order("sort_order"),
    supabase
      .from("payments")
      .select("*")
      .eq("event_id", proposal.event_id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
  ]);

  const schedules = (schedulesRes.data ?? []) as PaymentScheduleItem[];
  const paidPayments = (paymentsRes.data ?? []) as Payment[];
  const hasNewPaymentSystem = schedules.length > 0;

  // Calculate totals from new system if available, otherwise fall back to old
  const scheduledTotal = hasNewPaymentSystem
    ? schedules.reduce((sum, s) => sum + Number(s.amount), 0)
    : 0;
  const newSystemTotalPaid = hasNewPaymentSystem
    ? paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    : 0;

  // Old system fallback values
  const totalPaid = hasNewPaymentSystem ? newSystemTotalPaid : (payment?.totalPaid ?? 0);
  const totalDue = hasNewPaymentSystem ? scheduledTotal : (pricing?.suggestedPrice ?? 0);
  const balanceDue = totalDue - totalPaid;
  const depositRequired = payment?.depositRequired ?? Math.round(totalDue * 0.5 * 100) / 100;
  const depositPaid = totalPaid >= depositRequired;

  function getScheduleStatusBadge(status: string) {
    switch (status) {
      case "paid":
        return { label: "Paid", className: "bg-green-900/40 text-green-400 border-green-800/50" };
      case "due":
        return { label: "Due", className: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50" };
      case "failed":
        return { label: "Failed", className: "bg-red-900/40 text-red-400 border-red-800/50" };
      case "waived":
        return { label: "Waived", className: "bg-zinc-800/40 text-zinc-400 border-zinc-700/50" };
      case "refunded":
        return { label: "Refunded", className: "bg-purple-900/40 text-purple-400 border-purple-800/50" };
      default:
        return { label: "Pending", className: "bg-[#2e271f] text-[#9c8876] border-[#3d3428]" };
    }
  }

  function formatTime(time: string | null): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  // -- Tab content builders --

  const overviewContent = (
    <div className="space-y-6">
      {/* Event details cards */}
      {event && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="text-xs text-[#9c8876]">Date</span>
            </div>
            <div className="text-sm font-medium">{format(new Date(event.event_date), "EEE, MMM d, yyyy")}</div>
          </div>
          {(event.start_time || event.end_time) && (
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#9c8876]" />
                <span className="text-xs text-[#9c8876]">Time</span>
              </div>
              <div className="text-sm font-medium">
                {event.start_time && formatTime(event.start_time)}
                {event.start_time && event.end_time && " – "}
                {event.end_time && formatTime(event.end_time)}
              </div>
            </div>
          )}
          <div className="card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-[#9c8876]" />
              <span className="text-xs text-[#9c8876]">Guests</span>
            </div>
            <div className="text-sm font-medium">{event.guest_count}</div>
          </div>
          {event.venue && (
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#9c8876]" />
                <span className="text-xs text-[#9c8876]">Venue</span>
              </div>
              <div className="text-sm font-medium truncate">{event.venue}</div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {event && (
        <PortalTimeline
          event={event}
          proposal={{
            status: proposal.status,
            created_at: proposal.created_at,
            contract_accepted_at: proposal.contract_accepted_at,
            viewed_at: proposal.viewed_at,
          }}
          payments={paidPayments}
        />
      )}

      {/* Investment summary */}
      {pricing && (
        <div className="card p-5">
          <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">Investment Summary</h3>
          <div className="space-y-2">
            {pricing.foodCostTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Food & Menu</span>
                <span>{formatCurrency(pricing.foodCostTotal)}</span>
              </div>
            )}
            {pricing.staffingTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Staffing</span>
                <span>{formatCurrency(pricing.staffingTotal)}</span>
              </div>
            )}
            {pricing.rentalsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Rentals</span>
                <span>{formatCurrency(pricing.rentalsTotal)}</span>
              </div>
            )}
            {pricing.barTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Bar</span>
                <span>{formatCurrency(pricing.barTotal)}</span>
              </div>
            )}
            <div className="border-t border-[#2e271f] pt-2 flex justify-between text-sm">
              <span className="text-[#9c8876]">Service Fee + Tax</span>
              <span>{formatCurrency(pricing.adminFee + pricing.taxAmount)}</span>
            </div>
            <div className="border-t border-[#2e271f] pt-2 flex justify-between items-baseline">
              <span className="font-semibold text-brand-300">Total</span>
              <span className="text-xl font-semibold text-brand-300">{formatCurrency(pricing.suggestedPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Client response / proposal actions */}
      {proposal.status !== "booked" && proposal.status !== "declined" && proposal.status !== "expired" && (
        <ClientResponse
          shareToken={token}
          currentStatus={proposal.status}
          clientMessages={proposal.client_messages ?? []}
          terms={proposal.terms}
          companyName={companyName}
          eventName={event?.name || "Event"}
          totalAmount={pricing?.suggestedPrice ?? 0}
          bookingConfig={(event?.booking_config as any) ?? null}
        />
      )}
    </div>
  );

  const menuContent = <PortalMenu pricingData={pricing} />;

  const paymentsContent = (
    <div className="space-y-6">
      {pricing && (proposal.status === "accepted" || proposal.status === "booked" || proposal.status === "approved" || proposal.status === "signed" || proposal.status === "deposit_paid") ? (
        <div className="card p-5">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#9c8876]" />
            Payment Status
          </h3>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-xs text-[#9c8876] mb-1">Total</div>
              <div className="text-sm font-semibold">{formatCurrency(totalDue)}</div>
            </div>
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-xs text-[#9c8876] mb-1">Paid</div>
              <div className="text-sm font-semibold text-green-400">{formatCurrency(totalPaid)}</div>
            </div>
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-xs text-[#9c8876] mb-1">Balance</div>
              <div className={`text-sm font-semibold ${balanceDue > 0 ? "text-yellow-400" : "text-green-400"}`}>
                {formatCurrency(balanceDue)}
              </div>
            </div>
          </div>

          {/* Payment progress */}
          {totalDue > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[#2e271f] overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min((totalPaid / totalDue) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-[#9c8876]">{Math.round((totalPaid / totalDue) * 100)}%</span>
            </div>
          )}

          {/* New payment schedule system */}
          {hasNewPaymentSystem ? (
            <>
              <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3">Payment Schedule</div>
              <div className="space-y-2 mb-4">
                {schedules.map((schedule) => {
                  const badge = getScheduleStatusBadge(schedule.status);
                  const isPayable = schedule.status === "pending" || schedule.status === "due";
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#2e271f] bg-[#1a1613]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate">{schedule.installment_name}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#9c8876]">
                          <span className="font-medium">{formatCurrency(schedule.amount)}</span>
                          {schedule.due_date && (
                            <>
                              <span>·</span>
                              <span>Due {format(new Date(schedule.due_date), "MMM d, yyyy")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isPayable && (
                        <div className="ml-3 flex-shrink-0">
                          <ClientPayButton
                            shareToken={token}
                            paymentScheduleId={schedule.id}
                            amount={schedule.amount}
                            installmentName={schedule.installment_name}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Payment history from new system */}
              {paidPayments.length > 0 && (
                <div className="pt-3 border-t border-[#2e271f]">
                  <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">Payment History</div>
                  <div className="space-y-1.5">
                    {paidPayments.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs text-[#9c8876]">
                        <span>
                          {p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "—"}
                          {p.payment_method_type ? ` · ${p.payment_method_type}` : ""}
                        </span>
                        <span className="text-green-400">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Old system fallback: deposit status */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-[#2e271f]">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${depositPaid ? "bg-green-400" : "bg-yellow-400"}`} />
                <div className="flex-1">
                  <div className="text-xs text-[#9c8876]">
                    Deposit of {formatCurrency(depositRequired)} {depositPaid ? "received" : "required"}
                  </div>
                </div>
              </div>

              {/* Old system fallback: payment history */}
              {payment?.payments && payment.payments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#2e271f]">
                  <div className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">Payment History</div>
                  <div className="space-y-1.5">
                    {payment.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs text-[#9c8876]">
                        <span>{p.date} · {p.method}{p.note ? ` · ${p.note}` : ""}</span>
                        <span className="text-green-400">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <DollarSign className="w-10 h-10 text-[#3d3428] mx-auto mb-3" />
          <p className="text-sm text-[#6b5a4a]">Payment details will appear here once the proposal is approved.</p>
        </div>
      )}
    </div>
  );

  const vendorsContent = event ? (
    <PortalVendors eventId={event.id} />
  ) : (
    <div className="card p-8 text-center">
      <p className="text-sm text-[#6b5a4a]">No vendor information available.</p>
    </div>
  );

  const documentsContent = (
    <PortalDocuments shareToken={token} proposalTitle={proposal.title || "Event Proposal"} />
  );

  return (
    <div className="min-h-screen bg-[#0f0d0b]">
      {/* Header */}
      <div className="border-b border-[#2e271f]">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="" className="h-8 mb-2 object-contain" />
              )}
              <h1 className="font-display text-lg font-semibold">{companyName}</h1>
              {(settings?.phone || settings?.email) && (
                <p className="text-xs text-[#9c8876] mt-0.5">
                  {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <Link
              href={`/p/${token}`}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              View Proposal
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Payment status banners */}
        {paymentStatus === "success" && (
          <div className="card p-4 border-green-900/50 bg-green-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-sm font-medium text-green-400">Payment received! Thank you.</span>
            </div>
          </div>
        )}
        {paymentStatus === "canceled" && (
          <div className="card p-4 border-yellow-900/50 bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <span className="text-sm font-medium text-yellow-400">Payment was canceled. You can try again below.</span>
            </div>
          </div>
        )}

        {/* Event header */}
        {event && (
          <div>
            <h2 className="font-display text-2xl font-semibold mb-1">{event.name}</h2>
            <p className="text-sm text-[#9c8876]">
              Welcome, {event.client_name}
              {(proposal.status === "accepted" || proposal.status === "booked") && " — Your event is confirmed!"}
            </p>
          </div>
        )}

        {/* Status banner */}
        {(proposal.status === "accepted" || proposal.status === "booked") && (
          <div className="card p-4 border-green-900/50 bg-green-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">Event Confirmed</span>
            </div>
          </div>
        )}

        {/* Tabbed content */}
        <PortalTabs>
          {{
            overview: overviewContent,
            menu: menuContent,
            payments: paymentsContent,
            vendors: vendorsContent,
            documents: documentsContent,
          }}
        </PortalTabs>

        {/* Footer */}
        <div className="text-center text-xs text-[#6b5a4a] pt-4 pb-8">
          Powered by Cateros
        </div>
      </div>
    </div>
  );
}
