"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  margin: number;
  totalCost: number;
  totalPrice: number;
};

export function MarginWarning({ margin, totalCost, totalPrice }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || margin >= 35) return null;

  const isLow = margin < 20;
  const borderColor = isLow ? "border-red-800/50" : "border-yellow-800/50";
  const bgColor = isLow ? "bg-red-900/20" : "bg-yellow-900/20";
  const textColor = isLow ? "text-red-400" : "text-yellow-400";
  const mutedColor = isLow ? "text-red-400/70" : "text-yellow-400/70";

  const message = isLow
    ? `Low margin alert: ${margin.toFixed(1)}%. This event may not be profitable.`
    : `Margin is below target at ${margin.toFixed(1)}%. Consider adjusting pricing.`;

  return (
    <div className={`flex items-start gap-3 rounded-lg border ${borderColor} ${bgColor} px-4 py-3 mt-4`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${textColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        <p className={`text-xs mt-1 ${mutedColor}`}>
          Cost: {formatCurrency(totalCost)} &middot; Price: {formatCurrency(totalPrice)}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-[#6b5a4a] hover:text-[#9c8876] transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
