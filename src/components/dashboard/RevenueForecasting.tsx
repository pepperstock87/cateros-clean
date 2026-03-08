"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO, addMonths, startOfMonth } from "date-fns";

type EventInput = {
  date: string;
  status: string;
  pricing_data: any;
};

export function RevenueForecasting({ events }: { events: EventInput[] }) {
  const now = new Date();

  // Upcoming events only (in the future)
  const futureEvents = useMemo(
    () => events.filter((e) => e.date > now.toISOString()),
    [events]
  );

  // Monthly revenue breakdown: confirmed vs pending/proposed
  const monthlyForecast = useMemo(() => {
    const months: Record<string, { confirmed: number; pipeline: number }> = {};

    // Initialize next 3 months
    for (let i = 0; i < 3; i++) {
      const d = addMonths(startOfMonth(now), i);
      const key = format(d, "yyyy-MM");
      months[key] = { confirmed: 0, pipeline: 0 };
    }

    futureEvents.forEach((e) => {
      const key = format(parseISO(e.date), "yyyy-MM");
      if (!months[key]) return; // outside 3-month window
      const revenue = e.pricing_data?.suggestedPrice ?? 0;
      if (e.status === "confirmed") {
        months[key].confirmed += revenue;
      } else if (e.status === "proposed" || e.status === "draft") {
        months[key].pipeline += revenue;
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: format(parseISO(key + "-01"), "MMM yyyy"),
        Confirmed: val.confirmed,
        Pipeline: val.pipeline,
      }));
  }, [futureEvents]);

  // Totals for next 3 months
  const totalConfirmed = monthlyForecast.reduce((s, m) => s + m.Confirmed, 0);
  const totalPipeline = monthlyForecast.reduce((s, m) => s + m.Pipeline, 0);
  const totalProjected = totalConfirmed + totalPipeline;

  // Conversion rate
  const totalEvents = futureEvents.length;
  const confirmedCount = futureEvents.filter((e) => e.status === "confirmed").length;
  const conversionRate = totalEvents > 0 ? (confirmedCount / totalEvents) * 100 : 0;

  if (futureEvents.length === 0) {
    return (
      <div className="card p-4 md:p-5">
        <h3 className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider mb-4">
          Revenue Forecast
        </h3>
        <p className="text-sm text-[#7A8BA8] text-center py-6">
          No upcoming events to forecast.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 md:p-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="p-3 rounded-lg border border-[#2A3A5C] bg-[#151210]">
          <div className="text-xs text-[#D4A373] mb-1">Projected (3 mo)</div>
          <div className="text-lg font-semibold font-display">{formatCurrency(totalProjected)}</div>
        </div>
        <div className="p-3 rounded-lg border border-[#2A3A5C] bg-[#151210]">
          <div className="text-xs text-[#D4A373] mb-1">Confirmed</div>
          <div className="text-lg font-semibold font-display text-green-400">
            {formatCurrency(totalConfirmed)}
          </div>
        </div>
        <div className="p-3 rounded-lg border border-[#2A3A5C] bg-[#151210]">
          <div className="text-xs text-[#D4A373] mb-1">Conversion Rate</div>
          <div className="text-lg font-semibold font-display">
            {conversionRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-[#7A8BA8]">
            {confirmedCount}/{totalEvents} events
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={monthlyForecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#D4A373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "#D4A373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#1A2538",
              border: "1px solid #2A3A5C",
              borderRadius: "8px",
              color: "#F4F1ED",
            }}
            formatter={(v: number) => [formatCurrency(v)]}
            labelStyle={{ color: "#D4A373", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#D4A373" }} />
          <Bar dataKey="Confirmed" stackId="forecast" fill="#4ade80" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Pipeline" stackId="forecast" fill="#c4956a" opacity={0.6} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
