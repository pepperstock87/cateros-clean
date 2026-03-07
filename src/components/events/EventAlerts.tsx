"use client";

import { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import Link from "next/link";
import type { Event, PricingData } from "@/types";

type Alert = {
  id: string;
  severity: "red" | "amber" | "blue";
  message: string;
  link?: string;
  linkLabel?: string;
};

type Props = {
  event: Event;
  daysUntilEvent: number;
  hasStaff: boolean;
  depositPaid: boolean;
};

export function EventAlerts({ event, daysUntilEvent, hasStaff, depositPaid }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const pricing = event.pricing_data as PricingData | null;
  const alerts: Alert[] = [];

  if (daysUntilEvent === 1) {
    alerts.push({
      id: "tomorrow",
      severity: "blue",
      message: "Event is tomorrow!",
    });
  }

  if (daysUntilEvent <= 3 && daysUntilEvent >= 0 && !pricing) {
    alerts.push({
      id: "no-pricing-urgent",
      severity: "red",
      message: `No pricing set \u2014 event in ${daysUntilEvent} day${daysUntilEvent !== 1 ? "s" : ""}`,
      link: `/events/${event.id}?tab=pricing`,
      linkLabel: "Set pricing",
    });
  }

  if (daysUntilEvent <= 7 && daysUntilEvent >= 0 && !hasStaff) {
    alerts.push({
      id: "no-staff",
      severity: "amber",
      message: `Staff not assigned \u2014 event in ${daysUntilEvent} day${daysUntilEvent !== 1 ? "s" : ""}`,
      link: `/events/${event.id}?tab=staff`,
      linkLabel: "Assign staff",
    });
  }

  if (daysUntilEvent <= 14 && daysUntilEvent >= 0 && !depositPaid) {
    alerts.push({
      id: "no-deposit",
      severity: "amber",
      message: `Deposit unpaid \u2014 event in ${daysUntilEvent} day${daysUntilEvent !== 1 ? "s" : ""}`,
      link: `/events/${event.id}?tab=payments`,
      linkLabel: "Track payment",
    });
  }

  if (pricing && pricing.projectedMargin < 30) {
    alerts.push({
      id: "low-margin",
      severity: "amber",
      message: `Low margin warning: ${pricing.projectedMargin.toFixed(1)}%`,
      link: `/events/${event.id}?tab=pricing`,
      linkLabel: "Adjust pricing",
    });
  }

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const borderColors = {
    red: "border-l-red-500",
    amber: "border-l-amber-500",
    blue: "border-l-blue-400",
  };

  const bgColors = {
    red: "bg-red-950/20",
    amber: "bg-amber-950/15",
    blue: "bg-blue-950/15",
  };

  const iconColors = {
    red: "text-red-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
  };

  return (
    <div className="space-y-2 mb-6">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-[#2e271f] border-l-4 ${borderColors[alert.severity]} ${bgColors[alert.severity]}`}
        >
          {alert.severity === "blue" ? (
            <Info className={`w-4 h-4 flex-shrink-0 ${iconColors[alert.severity]}`} />
          ) : (
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${iconColors[alert.severity]}`} />
          )}
          <span className="text-sm flex-1">{alert.message}</span>
          {alert.link && (
            <Link
              href={alert.link}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
            >
              {alert.linkLabel}
            </Link>
          )}
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
            className="text-[#6b5a4a] hover:text-[#9c8876] transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
