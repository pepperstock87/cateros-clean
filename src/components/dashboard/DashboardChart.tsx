"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
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
import { BarChart3, TrendingUp } from "lucide-react";

type Point = { month: string; revenue: number; profit: number; events: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-[#D4A373] mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#7A8BA8]">{entry.name}:</span>
          <span className="text-[#F4F1ED] font-medium">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      {payload[0]?.payload?.events !== undefined && (
        <div className="flex items-center gap-2 text-xs mt-1 pt-1 border-t border-[#2A3A5C]">
          <div className="w-2 h-2 rounded-full bg-[#7A8BA8]" />
          <span className="text-[#7A8BA8]">Events:</span>
          <span className="text-[#F4F1ED] font-medium">
            {payload[0].payload.events}
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardChart({ data }: { data: Point[] }) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = data.reduce((s, d) => s + d.profit, 0);
  const totalEvents = data.reduce((s, d) => s + d.events, 0);

  return (
    <div>
      {/* Chart header with summary + toggle */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4 md:gap-6">
          <div>
            <span className="text-[10px] text-[#7A8BA8] uppercase tracking-wider">6-mo Revenue</span>
            <p className="text-sm md:text-lg font-semibold font-display">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <span className="text-[10px] text-[#7A8BA8] uppercase tracking-wider">6-mo Profit</span>
            <p className="text-sm md:text-lg font-semibold font-display text-green-400">{formatCurrency(totalProfit)}</p>
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] text-[#7A8BA8] uppercase tracking-wider">Total Events</span>
            <p className="text-sm md:text-lg font-semibold font-display">{totalEvents}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#182030] border border-[#2A3A5C] rounded-lg p-1">
          <button
            onClick={() => setChartType("area")}
            className={`p-1.5 rounded-md transition-all ${
              chartType === "area"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#2A3A5C]"
            }`}
            title="Area chart"
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`p-1.5 rounded-md transition-all ${
              chartType === "bar"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#2A3A5C]"
            }`}
            title="Bar chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        {chartType === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4A373" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#D4A373" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pftGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#D4A373" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#D4A373"
              strokeWidth={2}
              fill="url(#revGrad)"
            />
            <Area
              type="monotone"
              dataKey="profit"
              name="Profit"
              stroke="#4ade80"
              strokeWidth={2}
              fill="url(#pftGrad)"
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#D4A373" }} />
            <Bar dataKey="revenue" name="Revenue" fill="#D4A373" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill="#4ade80" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
