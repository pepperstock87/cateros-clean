import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Users, MapPin, Clock, DollarSign, CheckCircle, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Event, PricingData, PaymentData } from "@/types";
import { ClientResponse } from "../ClientResponse";
import Link from "next/link";

type Props = { params: Promise<{ token: string }> };

export default async function ClientPortalPage({ params }: Props) {
  const { token } = await params;

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
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", proposal.user_id)
    .single();

  const event = proposal.event as Event | null;
  const pricing = event?.pricing_data as PricingData | null;
  const payment = event?.payment_data as PaymentData | null;
  const companyName = settings?.business_name || profile?.company_name || "Catering Company";

  const totalPaid = payment?.totalPaid ?? 0;
  const totalDue = pricing?.suggestedPrice ?? 0;
  const balanceDue = totalDue - totalPaid;
  const depositRequired = payment?.depositRequired ?? Math.round(totalDue * 0.5 * 100) / 100;
  const depositPaid = totalPaid >= depositRequired;

  function formatTime(time: string | null): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

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
        {/* Event header */}
        {event && (
          <div>
            <h2 className="font-display text-2xl font-semibold mb-1">{event.name}</h2>
            <p className="text-sm text-[#9c8876]">
              Welcome, {event.client_name}
              {proposal.status === "accepted" && " — Your event is confirmed!"}
            </p>
          </div>
        )}

        {/* Status banner */}
        {proposal.status === "accepted" && (
          <div className="card p-4 border-green-900/50 bg-green-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">Event Confirmed</span>
            </div>
          </div>
        )}

        {/* Event details */}
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

        {/* Payment status - only show for confirmed events */}
        {pricing && proposal.status === "accepted" && (
          <div className="card p-5">
            <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#9c8876]" />
              Payment Status
            </h3>
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

            {/* Deposit status */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[#2e271f]">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${depositPaid ? "bg-green-400" : "bg-yellow-400"}`} />
              <div className="flex-1">
                <div className="text-xs text-[#9c8876]">
                  Deposit of {formatCurrency(depositRequired)} {depositPaid ? "received" : "required"}
                </div>
              </div>
            </div>

            {/* Payment progress */}
            {totalDue > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[#2e271f] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.min((totalPaid / totalDue) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[#9c8876]">{Math.round((totalPaid / totalDue) * 100)}%</span>
              </div>
            )}

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
          </div>
        )}

        {/* Proposal pricing summary */}
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

        {/* Messages & response */}
        {proposal.status !== "accepted" && proposal.status !== "declined" && (
          <ClientResponse shareToken={token} currentStatus={proposal.status} clientMessages={proposal.client_messages ?? []} />
        )}

        {/* Footer */}
        <div className="text-center text-xs text-[#6b5a4a] pt-4 pb-8">
          Powered by Cateros
        </div>
      </div>
    </div>
  );
}
