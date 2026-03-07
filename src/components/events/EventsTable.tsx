"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Download } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";
import type { Event, PricingData, PaymentData } from "@/types";

const STATUS_CLASSES: Record<string, string> = {
  draft: "badge-draft",
  proposed: "badge-proposed",
  confirmed: "badge-confirmed",
  completed: "badge-completed",
  canceled: "badge-canceled",
};

const STATUSES = ["all", "draft", "proposed", "confirmed", "completed", "canceled"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  draft: "Draft",
  proposed: "Proposed",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Canceled",
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
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = useMemo(() => {
    let result = events;

    if (activeStatus !== "all") {
      result = result.filter((e) => e.status === activeStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.client_name.toLowerCase().includes(q) ||
          (e.venue && e.venue.toLowerCase().includes(q))
      );
    }

    return result;
  }, [events, activeStatus, searchQuery]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                activeStatus === status
                  ? "bg-brand-950 text-brand-400 border-brand-800"
                  : "bg-transparent text-[#6b5a4a] border-[#2e271f] hover:text-[#9c8876]"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5a4a]" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button
            onClick={() => {
              const rows = filteredEvents.map((event) => {
                const p = event.pricing_data as PricingData | null;
                const pay = event.payment_data as PaymentData | null;
                const paid = pay?.totalPaid ?? 0;
                const total = p?.suggestedPrice ?? 0;
                let paymentStatus = "Unpaid";
                if (p && paid >= total) paymentStatus = "Paid";
                else if (p && paid > 0) paymentStatus = "Partial";
                return {
                  "Event Name": event.name,
                  Client: event.client_name,
                  Date: format(new Date(event.event_date), "MMM d, yyyy"),
                  Guests: event.guest_count,
                  Revenue: p ? p.suggestedPrice : null,
                  Margin: p ? +(p.projectedMargin * 100).toFixed(1) : null,
                  "Payment Status": p ? paymentStatus : null,
                  Status: event.status,
                };
              });
              downloadCSV(rows, "events.csv");
            }}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-[#9c8876] mb-4">
        {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"} found
      </p>

      {filteredEvents.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#6b5a4a] text-sm">No events match your filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
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
              {filteredEvents.map((event) => {
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
      )}
    </>
  );
}
