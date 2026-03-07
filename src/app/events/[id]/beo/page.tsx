import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BEOActions } from "./BEOActions";
import type { Event, PricingData, Recipe } from "@/types";

type Props = { params: Promise<{ id: string }> };

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default async function BEOPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase.from("events").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!event) notFound();

  const e = event as Event;
  const p = e.pricing_data as PricingData | null;

  // Fetch staff assignments and recipes in parallel
  const [assignmentsRes, recipesRes] = await Promise.all([
    supabase
      .from("event_staff_assignments")
      .select("id, role, start_time, end_time, confirmed, notes, staff_members(name, role, phone)")
      .eq("event_id", id)
      .eq("user_id", user.id),
    supabase
      .from("recipes")
      .select("id, name, servings, ingredients")
      .eq("user_id", user.id),
  ]);

  const assignments = assignmentsRes.data ?? [];
  const allRecipes: Recipe[] = (recipesRes.data as any) ?? [];

  // Match menu items to recipes to build shopping list
  type ShoppingItem = { name: string; quantity: number; unit: string; totalNeeded: number };
  const shoppingMap = new Map<string, ShoppingItem>();

  if (p?.menuItems) {
    for (const menuItem of p.menuItems) {
      const recipe = allRecipes.find(r => r.name === menuItem.name);
      if (recipe?.ingredients) {
        const servingsMultiplier = menuItem.quantity / (recipe.servings || 1);
        for (const ing of recipe.ingredients) {
          const key = `${ing.name}-${ing.unit}`;
          const existing = shoppingMap.get(key);
          const needed = ing.quantity * servingsMultiplier;
          if (existing) {
            existing.totalNeeded += needed;
          } else {
            shoppingMap.set(key, {
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              totalNeeded: needed,
            });
          }
        }
      }
    }
  }
  const shoppingList = Array.from(shoppingMap.values()).sort((a, b) => a.name.localeCompare(b.name));

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

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link href={`/events/${e.id}`} className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] mb-3 transition-colors print:hidden">
          <ArrowLeft className="w-4 h-4" /> Back to event
        </Link>
        <BEOActions event={e} />

        {/* BEO Content - light theme for print readability */}
        <div className="bg-white rounded-xl shadow-sm border border-[#2e271f] print:shadow-none print:border-none print:rounded-none">
          {/* Header */}
          <div className="bg-gray-900 text-white px-8 py-6 rounded-t-xl print:rounded-none">
            <h1 className="text-2xl font-bold tracking-tight">PRODUCTION SHEET</h1>
            <p className="text-gray-400 text-sm mt-1">Internal Use Only · Generated {format(new Date(), "MMMM d, yyyy")}</p>
          </div>

          {/* Event Details */}
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{e.name}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700">
              <div><span className="font-semibold text-gray-900">Client:</span> {e.client_name}</div>
              <div><span className="font-semibold text-gray-900">Date:</span> {format(new Date(e.event_date), "EEEE, MMMM d, yyyy")}</div>
              {(e.start_time || e.end_time) && (
                <div>
                  <span className="font-semibold text-gray-900">Time:</span>{" "}
                  {e.start_time && formatTime(e.start_time)}
                  {e.start_time && e.end_time && " – "}
                  {e.end_time && formatTime(e.end_time)}
                </div>
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

          {/* Staff Roster */}
          {assignments.length > 0 && (
            <div className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Staff Roster</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600">
                    <th className="text-left py-2 font-semibold">Name</th>
                    <th className="text-left py-2 font-semibold">Role</th>
                    <th className="text-center py-2 font-semibold">Time</th>
                    <th className="text-center py-2 font-semibold">Confirmed</th>
                    <th className="text-left py-2 font-semibold">Phone</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{a.staff_members?.name ?? "—"}</td>
                      <td className="py-2">{a.role ?? a.staff_members?.role ?? "—"}</td>
                      <td className="py-2 text-center">
                        {a.start_time && a.end_time
                          ? `${formatTime(a.start_time)} – ${formatTime(a.end_time)}`
                          : "—"}
                      </td>
                      <td className="py-2 text-center">{a.confirmed ? "✓" : "—"}</td>
                      <td className="py-2">{a.staff_members?.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

              {/* Shopping List */}
              {shoppingList.length > 0 && (
                <div className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Shopping List</h3>
                  <p className="text-xs text-gray-500 mb-3">Aggregated from recipes · Based on {e.guest_count} guests</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-600">
                        <th className="text-left py-2 font-semibold">Ingredient</th>
                        <th className="text-right py-2 font-semibold">Amount Needed</th>
                        <th className="text-center py-2 font-semibold w-8">✓</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {shoppingList.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2">{item.name}</td>
                          <td className="text-right py-2">{Math.ceil(item.totalNeeded * 10) / 10} {item.unit}</td>
                          <td className="text-center py-2">
                            <div className="w-4 h-4 border border-gray-400 rounded mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Staffing Plan (from pricing) */}
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

              {/* Equipment Checklist */}
              {p.rentals?.length > 0 && (
                <div className="px-8 py-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Equipment Checklist</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-600">
                        <th className="text-left py-2 font-semibold">Item</th>
                        <th className="text-right py-2 font-semibold">Qty</th>
                        <th className="text-center py-2 font-semibold w-8">✓</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {p.rentals.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100">
                          <td className="py-2">{r.item}</td>
                          <td className="text-right py-2">{r.quantity}</td>
                          <td className="text-center py-2">
                            <div className="w-4 h-4 border border-gray-400 rounded mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
                      <td className="py-1 text-xs">Projected Margin</td>
                      <td className="text-right py-1 text-xs">{p.projectedMargin.toFixed(1)}%</td>
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
            Production Sheet &middot; Internal Use Only &middot; Generated {format(new Date(), "MMMM d, yyyy")}
          </div>
        </div>
      </div>
    </>
  );
}
