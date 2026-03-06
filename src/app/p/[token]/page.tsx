import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Users, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Event, PricingData } from "@/types";
import { ClientResponse } from "./ClientResponse";

type Props = { params: Promise<{ token: string }> };

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params;

  // Use service role to bypass RLS
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

  // Fetch business settings for branding
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
  const companyName = settings?.business_name || profile?.company_name || "Catering Company";

  return (
    <div className="min-h-screen bg-[#0f0d0b]">
      {/* Header */}
      <div className="border-b border-[#2e271f]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="" className="h-10 mb-3 object-contain" />
              )}
              <h1 className="font-display text-xl font-semibold">{companyName}</h1>
              {(settings?.phone || settings?.email) && (
                <p className="text-xs text-[#9c8876] mt-1">
                  {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-[#9c8876]">
              <div className="uppercase tracking-wider font-medium text-brand-400 mb-1">Catering Proposal</div>
              <div>Prepared {format(new Date(proposal.created_at), "MMMM d, yyyy")}</div>
              <div>Valid for 30 days</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Event details */}
        {event && (
          <div>
            <h2 className="font-display text-2xl font-semibold mb-1">{event.name}</h2>
            <p className="text-sm text-[#9c8876] mb-4">Prepared for {event.client_name}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
                  <span className="text-xs text-[#9c8876]">Date</span>
                </div>
                <div className="text-sm font-medium">{format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}</div>
              </div>
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
          </div>
        )}

        {/* Custom message */}
        {proposal.custom_message && (
          <div className="card p-6">
            <p className="text-sm italic text-[#9c8876] leading-relaxed">{proposal.custom_message}</p>
          </div>
        )}

        {/* Menu */}
        {pricing && pricing.menuItems.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">Menu</h3>
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2e271f]">
                    <th className="text-left text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Item</th>
                    <th className="text-right text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Qty</th>
                    <th className="text-right text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Per Person</th>
                    <th className="text-right text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.menuItems.map((item) => (
                    <tr key={item.id} className="border-b border-[#1c1814]">
                      <td className="px-5 py-3 text-sm">{item.name}</td>
                      <td className="px-5 py-3 text-sm text-right text-[#9c8876]">{item.quantity}</td>
                      <td className="px-5 py-3 text-sm text-right text-[#9c8876]">{formatCurrency(item.costPerPerson)}</td>
                      <td className="px-5 py-3 text-sm text-right">{formatCurrency(item.costPerPerson * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staffing */}
        {pricing && pricing.staffing.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">Staffing</h3>
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2e271f]">
                    <th className="text-left text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Role</th>
                    <th className="text-right text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Staff</th>
                    <th className="text-right text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Hours</th>
                    <th className="text-right text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.staffing.map((s) => (
                    <tr key={s.id} className="border-b border-[#1c1814]">
                      <td className="px-5 py-3 text-sm">{s.role}</td>
                      <td className="px-5 py-3 text-sm text-right text-[#9c8876]">{s.headcount}</td>
                      <td className="px-5 py-3 text-sm text-right text-[#9c8876]">{s.hours}</td>
                      <td className="px-5 py-3 text-sm text-right">{formatCurrency(s.hourlyRate * s.hours * s.headcount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing summary */}
        {pricing && (
          <div>
            <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">Investment</h3>
            <div className="card p-5 space-y-2.5">
              {[
                { label: "Food & Menu", value: pricing.foodCostTotal },
                { label: "Staffing", value: pricing.staffingTotal },
                ...(pricing.rentalsTotal > 0 ? [{ label: "Rentals & Equipment", value: pricing.rentalsTotal }] : []),
                ...(pricing.barTotal > 0 ? [{ label: `Bar (${pricing.barPackage?.label || "Bar"})`, value: pricing.barTotal }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-[#9c8876]">{row.label}</span>
                  <span>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="border-t border-[#2e271f] pt-2.5 flex justify-between text-sm">
                <span className="text-[#9c8876]">Subtotal</span>
                <span>{formatCurrency(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Service Fee ({pricing.adminPercent}%)</span>
                <span>{formatCurrency(pricing.adminFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9c8876]">Tax ({pricing.taxPercent}%)</span>
                <span>{formatCurrency(pricing.taxAmount)}</span>
              </div>
              <div className="border-t border-[#2e271f] pt-3 flex justify-between items-baseline">
                <span className="font-semibold text-brand-300">Total Investment</span>
                <span className="text-2xl font-semibold text-brand-300">{formatCurrency(pricing.suggestedPrice)}</span>
              </div>
              <div className="text-xs text-[#9c8876] text-right">
                {formatCurrency(pricing.suggestedPrice / pricing.guestCount)} per guest
              </div>
            </div>
          </div>
        )}

        {/* Terms */}
        {proposal.terms && (
          <div>
            <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">Terms & Conditions</h3>
            <div className="card p-5">
              <p className="text-sm text-[#9c8876] leading-relaxed whitespace-pre-wrap">{proposal.terms}</p>
            </div>
          </div>
        )}

        {/* Client response */}
        <ClientResponse shareToken={token} currentStatus={proposal.status} />

        {/* Footer */}
        <div className="text-center text-xs text-[#6b5a4a] pt-4 pb-8">
          Powered by Cateros
        </div>
      </div>
    </div>
  );
}
