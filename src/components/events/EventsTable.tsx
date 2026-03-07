"use client";

import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Event, PricingData, PaymentData } from "@/types";

const STATUS_CLASSES: Record<string, string> = {
  draft: "badge-draft",
  proposed: "badge-proposed",
  confirmed: "badge-confirmed",
  completed: "badge-completed",
  canceled: "badge-canceled",
};

function PaymentBadge({ pricing, payment }: { pricing: PricingData | null; payment: PaymentData | null }) {
  if (!pricing) return <span className="text-[#6b5a4a]">&mdash;</span>;
  const paid = payment?.totalPaid ?? 0;
  const total = pricing.suggestedPrice;
  if (paid >= total)
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/40">
        Paid
      </span>
    );
  if (paid > 0)
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400 border border-yellow-800/40">
        Partial
      </span>
    );
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#251f19] text-[#6b5a4a] border border-[#2e271f]">
      Unpaid
    </span>
  );
}

export function EventsTable({ events }: { events: Event[] }) {
  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {events.map((event) => {
              const p = event.pricing_data as PricingData | null;
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="card block p-4 hover:bg-[#1c1814] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-sm truncate">{event.name}</span>
                    <span className={`${STATUS_CLASSES[event.status] ?? "badge-draft"} flex-shrink-0`}>{event.status}</span>
                  </div>
                  <div className="text-xs text-[#9c8876] mb-1">{event.client_name}</div>
                  <div className="flex items-center gap-3 text-xs text-[#6b5a4a]">
                    <span>{format(new Date(event.event_date), "MMM d, yyyy")}</span>
                    <span>{event.guest_count} guests</span>
                    {p && <span className="text-[#9c8876]">{formatCurrency(p.suggestedPrice)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2e271f]">
                  {["Event", "Client", "Date", "Guests", "Revenue", "Margin", "Payment", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs text-[#6b5a4a] uppercase tracking-wider font-medium px-5 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const p = event.pricing_data as PricingData | null;
                  const pay = event.payment_data as PaymentData | null;
                  return (
                    <tr key={event.id} className="border-b border-[#1c1814] hover:bg-[#1c1814] transition-colors">
                      <td className="px-5 py-3.5 font-medium text-sm max-w-[180px]">
                        <Link
                          href={`/events/${event.id}`}
                          className="hover:text-brand-400 transition-colors truncate block"
                        >
                          {event.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#9c8876]">{event.client_name}</td>
                      <td className="px-5 py-3.5 text-sm text-[#9c8876] whitespace-nowrap">
                        {format(new Date(event.event_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#9c8876]">{event.guest_count}</td>
                      <td className="px-5 py-3.5 text-sm">
                        {p ? formatCurrency(p.suggestedPrice) : <span className="text-[#6b5a4a]">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {p ? formatPercent(p.projectedMargin) : <span className="text-[#6b5a4a]">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentBadge pricing={p} payment={pay} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={STATUS_CLASSES[event.status] ?? "badge-draft"}>{event.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          Open &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
    </>
  );
}
