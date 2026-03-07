"use client";

import { CheckCircle2, Circle, Shield } from "lucide-react";
import type { Event, PricingData } from "@/types";

type ChecklistItem = {
  label: string;
  complete: boolean;
  status: string;
};

type Props = {
  event: Event;
  hasProposal: boolean;
  hasStaff: boolean;
  depositPaid: boolean;
};

export function EventChecklist({ event, hasProposal, hasStaff, depositPaid }: Props) {
  const pricing = event.pricing_data as PricingData | null;

  const items: ChecklistItem[] = [
    {
      label: "Event details complete",
      complete: !!(event.name && event.event_date && event.guest_count && event.venue),
      status: event.name && event.event_date && event.guest_count && event.venue
        ? "All fields filled"
        : "Missing " + [!event.name && "name", !event.event_date && "date", !event.guest_count && "guest count", !event.venue && "venue"].filter(Boolean).join(", "),
    },
    {
      label: "Client contact added",
      complete: !!(event.client_name && (event.client_email || event.client_phone)),
      status: event.client_name && (event.client_email || event.client_phone)
        ? "Contact info on file"
        : "Missing " + [!event.client_name && "client name", !(event.client_email || event.client_phone) && "email or phone"].filter(Boolean).join(", "),
    },
    {
      label: "Pricing configured",
      complete: !!(pricing && pricing.menuItems && pricing.menuItems.length > 0),
      status: pricing && pricing.menuItems && pricing.menuItems.length > 0
        ? `${pricing.menuItems.length} item${pricing.menuItems.length !== 1 ? "s" : ""} priced`
        : "No pricing set",
    },
    {
      label: "Proposal sent",
      complete: hasProposal,
      status: hasProposal ? "Proposal created" : "No proposal yet",
    },
    {
      label: "Staff assigned",
      complete: hasStaff,
      status: hasStaff ? "Staff confirmed" : "No staff assigned",
    },
    {
      label: "Deposit received",
      complete: depositPaid,
      status: depositPaid ? "Deposit collected" : "Awaiting deposit",
    },
  ];

  const completed = items.filter((i) => i.complete).length;
  const total = items.length;
  const allComplete = completed === total;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Readiness Checklist</h3>
        {allComplete && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            <Shield className="w-3 h-3" />
            Event Ready
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-[#9c8876] mb-1">
          <span>{completed} of {total} complete</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#2e271f] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allComplete ? "bg-green-400" : "bg-brand-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            {item.complete ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[#6b5a4a] mt-0.5 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className={`text-sm ${item.complete ? "text-[#f5ede0]" : "text-[#9c8876]"}`}>
                {item.label}
              </div>
              <div className="text-xs text-[#6b5a4a]">{item.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
