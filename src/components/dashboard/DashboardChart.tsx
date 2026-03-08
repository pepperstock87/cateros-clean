"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

type Point = { month: string; revenue: number; profit: number; events: number };

export function DashboardChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d4801f" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#d4801f" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#D4A373", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#D4A373", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={{ background: "#1A2538", border: "1px solid #2A3A5C", borderRadius: "8px", color: "#F4F1ED" }} formatter={(v: number) => [formatCurrency(v)]} labelStyle={{ color: "#D4A373", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#D4A373" }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#d4801f" strokeWidth={2} fill="url(#rev)" />
        <Area type="monotone" dataKey="profit" name="Profit" stroke="#4ade80" strokeWidth={2} fill="url(#pft)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
