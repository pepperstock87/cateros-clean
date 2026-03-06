import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { BEOActions } from "./BEOActions";
import type { Event, PricingData } from "@/types";

type Props = { params: Promise<{ id: string }> };

export default async function BEOPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase.from("events").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!event) notFound();

  const e = event as Event;
  const p = e.pricing_data as PricingData | null;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; }
          nav, aside, [data-sidebar] { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="p-8 max-w-4xl mx-auto">
        <BEOActions event={e} />

        {/* BEO Content - light theme for print readability */}
        <div className="bg-white rounded-xl shadow-sm border border-[#2e271f] print:shadow-none print:border-none print:rounded-none">
          {/* Header */}
          <div className="bg-gray-900 text-white px-8 py-6 rounded-t-xl print:rounded-none">
            <h1 className="text-2xl font-bold tracking-tight">BANQUET EVENT ORDER</h1>
            <p className="text-gray-400 text-sm mt-1">Internal Use Only</p>
          </div>

          {/* Event Details */}
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{e.name}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700">
              <div><span className="font-semibold text-gray-900">Client:</span> {e.client_name}</div>
              <div><span className="font-semibold text-gray-900">Date:</span> {format(new Date(e.event_date), "EEEE, MMMM d, yyyy")}</div>
              {e.start_time && e.end_time && (
                <div><span className="font-semibold text-gray-900">Time:</span> {e.start_time} - {e.end_time}</div>
              )}
              <div><span className="font-semibold text-gray-900">Guests:</span> {e.guest_count}</div>
              {e.venue && (
                <div><span className="font-semibold text-gray-900">Venue:</span> {e.venue}</div>
              )}
              {e.client_email && (
                <div><span className="font-semibold text-gray-900">Contact:</span> {e.client_email}</div>
              )}
              <div><span className="font-semibold text-gray-900">Status:</span> <span className="capitalize">{e.status}</span></div>
            </div>
          </div>

          {p && (
            <>
              {/* Menu */}
              {p.menuItems?.length > 0 && (
                <div className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Menu</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-600">
                        <th className="text-left py-2 font-semibold">Item</th>
                        <th className="text-right py-2 font-semibold">Qty</th>
                        <th className="text-right py-2 font-semibold">Cost/Person</th>
                        <th className="text-right py-2 font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {p.menuItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2">{item.name}</td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(item.costPerPerson)}</td>
                          <td className="text-right py-2">{formatCurrency(item.costPerPerson * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-gray-900">
                        <td className="py-2" colSpan={3}>Total</td>
                        <td className="text-right py-2">{formatCurrency(p.foodCostTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Staffing Plan */}
              {p.staffing?.length > 0 && (
                <div className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Staffing Plan</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-600">
                        <th className="text-left py-2 font-semibold">Role</th>
                        <th className="text-right py-2 font-semibold">Headcount</th>
                        <th className="text-right py-2 font-semibold">Hours</th>
                        <th className="text-right py-2 font-semibold">Rate</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {p.staffing.map((s) => (
                        <tr key={s.id} className="border-b border-gray-100">
                          <td className="py-2">{s.role}</td>
                          <td className="text-right py-2">{s.headcount}</td>
                          <td className="text-right py-2">{s.hours}</td>
                          <td className="text-right py-2">{formatCurrency(s.hourlyRate)}/hr</td>
                          <td className="text-right py-2">{formatCurrency(s.hourlyRate * s.hours * s.headcount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-gray-900">
                        <td className="py-2" colSpan={4}>Total</td>
                        <td className="text-right py-2">{formatCurrency(p.staffingTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Equipment / Rentals */}
              {p.rentals?.length > 0 && (
                <div className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Equipment / Rentals</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-600">
                        <th className="text-left py-2 font-semibold">Item</th>
                        <th className="text-right py-2 font-semibold">Qty</th>
                        <th className="text-right py-2 font-semibold">Unit Cost</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {p.rentals.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100">
                          <td className="py-2">{r.item}</td>
                          <td className="text-right py-2">{r.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(r.unitCost)}</td>
                          <td className="text-right py-2">{formatCurrency(r.unitCost * r.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-gray-900">
                        <td className="py-2" colSpan={3}>Total</td>
                        <td className="text-right py-2">{formatCurrency(p.rentalsTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Bar Package */}
              {p.barPackage && (
                <div className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Bar Package</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-600">
                        <th className="text-left py-2 font-semibold">Package</th>
                        <th className="text-right py-2 font-semibold">Cost/Person</th>
                        <th className="text-right py-2 font-semibold">Guests</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-100">
                        <td className="py-2">{p.barPackage.label}</td>
                        <td className="text-right py-2">{formatCurrency(p.barPackage.costPerPerson)}</td>
                        <td className="text-right py-2">{p.guestCount}</td>
                        <td className="text-right py-2">{formatCurrency(p.barTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cost Summary */}
              <div className="px-8 py-6 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Cost Summary (Internal)</h3>
                <table className="w-full text-sm">
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Food & Menu</td>
                      <td className="text-right py-2">{formatCurrency(p.foodCostTotal)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Staffing</td>
                      <td className="text-right py-2">{formatCurrency(p.staffingTotal)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Rentals & Equipment</td>
                      <td className="text-right py-2">{formatCurrency(p.rentalsTotal)}</td>
                    </tr>
                    {p.barPackage && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2">Bar ({p.barPackage.label})</td>
                        <td className="text-right py-2">{formatCurrency(p.barTotal)}</td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-200 font-medium text-gray-900">
                      <td className="py-2">Subtotal</td>
                      <td className="text-right py-2">{formatCurrency(p.subtotal)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Admin / Service Fee ({p.adminPercent}%)</td>
                      <td className="text-right py-2">{formatCurrency(p.adminFee)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2">Tax ({p.taxPercent}%)</td>
                      <td className="text-right py-2">{formatCurrency(p.taxAmount)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="text-gray-900 font-bold text-base">
                      <td className="py-3">Total Cost</td>
                      <td className="text-right py-3">{formatCurrency(p.totalCost)}</td>
                    </tr>
                    <tr className="text-gray-600">
                      <td className="py-1 text-xs">Suggested Price</td>
                      <td className="text-right py-1 text-xs">{formatCurrency(p.suggestedPrice)}</td>
                    </tr>
                    <tr className="text-gray-600">
                      <td className="py-1 text-xs">Projected Margin ({p.targetMarginPercent}%)</td>
                      <td className="text-right py-1 text-xs">{formatCurrency(p.projectedMargin)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {!p && (
            <div className="px-8 py-12 text-center text-gray-400">
              <p className="text-sm">No pricing data available. Add items in the Pricing Engine first.</p>
            </div>
          )}

          {/* Notes */}
          {e.notes && (
            <div className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{e.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-4 text-xs text-gray-400 text-center">
            Banquet Event Order &middot; Internal Use Only &middot; Generated {format(new Date(), "MMMM d, yyyy")}
          </div>
        </div>
      </div>
    </>
  );
}
