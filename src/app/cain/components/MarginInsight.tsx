"use client";

import { AlertTriangle, AlertOctagon, TrendingUp, DollarSign, PiggyBank } from "lucide-react";
import type { CainMarginAnalysis } from "@/lib/cain/types";
import { formatCurrency } from "@/lib/utils";

interface MarginInsightProps {
  analysis: CainMarginAnalysis;
  guestCount: number;
}

function marginColor(percent: number): string {
  if (percent >= 28) return "text-green-400";
  if (percent >= 20) return "text-yellow-400";
  return "text-red-400";
}

function CostBar({ analysis }: { analysis: CainMarginAnalysis }) {
  const total = analysis.foodCostPercent + analysis.laborCostPercent + analysis.rentalsCostPercent;
  const overhead = Math.max(0, 100 - total - analysis.marginPercent);
  const margin = Math.max(0, analysis.marginPercent);

  const segments = [
    { label: "Food", pct: analysis.foodCostPercent, color: "bg-orange-500" },
    { label: "Labor", pct: analysis.laborCostPercent, color: "bg-blue-500" },
    { label: "Rentals", pct: analysis.rentalsCostPercent, color: "bg-purple-500" },
    { label: "Admin/Tax", pct: overhead, color: "bg-gray-500" },
    { label: "Margin", pct: margin, color: "bg-green-500" },
  ].filter((s) => s.pct > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-5 rounded-lg overflow-hidden">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.color} transition-all`}
            style={{ width: `${Math.max(seg.pct, 1)}%` }}
            title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
            <span>{seg.label} {seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarginInsight({ analysis, guestCount }: MarginInsightProps) {
  const hasCritical = analysis.costFlags.some((f) => f.severity === "critical");
  const hasWarning = analysis.costFlags.some((f) => f.severity === "warning");

  return (
    <div className="space-y-4 pt-3">
      {/* Cost Breakdown Bar */}
      <CostBar analysis={analysis} />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={TrendingUp}
          label="Margin"
          value={`${analysis.marginPercent}%`}
          valueClass={marginColor(analysis.marginPercent)}
        />
        <MetricCard
          icon={DollarSign}
          label="Cost/Guest"
          value={formatCurrency(analysis.totalCostPerGuest)}
        />
        <MetricCard
          icon={DollarSign}
          label="Price/Guest"
          value={formatCurrency(analysis.pricePerGuest)}
        />
        {analysis.inventoryCredit > 0 && (
          <MetricCard
            icon={PiggyBank}
            label="Inventory Credit"
            value={formatCurrency(analysis.inventoryCredit)}
            valueClass="text-green-400"
          />
        )}
      </div>

      {/* Cost Flags */}
      {analysis.costFlags.length > 0 && (
        <div className="space-y-2">
          {analysis.costFlags.map((flag, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${
                flag.severity === "critical"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-yellow-500/30 bg-yellow-500/10"
              }`}
            >
              {flag.severity === "critical" ? (
                <AlertOctagon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              )}
              <div className="text-xs">
                <p className="text-[var(--text-primary)]">{flag.message}</p>
                {flag.suggestion && (
                  <p className="text-[var(--text-muted)] mt-1">{flag.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Comparison */}
      {analysis.pastEventComparison && (
        <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]/50 rounded-lg px-3 py-2.5 space-y-1">
          <p className="font-medium text-[var(--text-secondary)]">
            Compared to {analysis.pastEventComparison.eventCount} past event{analysis.pastEventComparison.eventCount !== 1 ? "s" : ""}:
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {analysis.pastEventComparison.avgMargin !== null && (
              <span>Avg margin: {analysis.pastEventComparison.avgMargin}%</span>
            )}
            {analysis.pastEventComparison.avgPricePerGuest !== null && (
              <span>Avg price/guest: {formatCurrency(analysis.pastEventComparison.avgPricePerGuest)}</span>
            )}
            {analysis.pastEventComparison.avgFoodCostPercent !== null && (
              <span>Avg food cost: {analysis.pastEventComparison.avgFoodCostPercent}%</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  valueClass = "text-[var(--text-primary)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[var(--bg-primary)]/50 rounded-lg px-3 py-2.5 text-center">
      <Icon className="w-3.5 h-3.5 text-[var(--text-muted)] mx-auto mb-1" />
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
    </div>
  );
}
