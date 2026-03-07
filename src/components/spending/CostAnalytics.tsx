"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
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
import { format, parseISO } from "date-fns";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";

const COLORS = ["#c4956a", "#d4801f", "#a67c52", "#8b6914", "#b8860b", "#cd853f", "#deb887", "#d2691e"];

type Receipt = {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string | null;
};

type Invoice = {
  id: string;
  distributor: string;
  invoice_date: string;
  total: number;
};

export function CostAnalytics({
  receipts,
  invoices,
  isPro = false,
}: {
  receipts: Receipt[];
  invoices: Invoice[];
  isPro?: boolean;
}) {
  // Category breakdown from receipts
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    receipts.forEach((r) => {
      const cat = r.category || "Uncategorized";
      map[cat] = (map[cat] || 0) + r.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [receipts]);

  // Monthly spending trend (receipts + invoices combined)
  const monthlyData = useMemo(() => {
    const map: Record<string, { receipts: number; invoices: number }> = {};

    receipts.forEach((r) => {
      const key = format(parseISO(r.date), "yyyy-MM");
      if (!map[key]) map[key] = { receipts: 0, invoices: 0 };
      map[key].receipts += r.amount;
    });

    invoices.forEach((inv) => {
      const key = format(parseISO(inv.invoice_date), "yyyy-MM");
      if (!map[key]) map[key] = { receipts: 0, invoices: 0 };
      map[key].invoices += inv.total;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => ({
        month: format(parseISO(key + "-01"), "MMM yyyy"),
        Receipts: val.receipts,
        Invoices: val.invoices,
        Total: val.receipts + val.invoices,
      }));
  }, [receipts, invoices]);

  // Top 5 vendors
  const topVendors = useMemo(() => {
    const map: Record<string, number> = {};
    receipts.forEach((r) => {
      map[r.vendor] = (map[r.vendor] || 0) + r.amount;
    });
    invoices.forEach((inv) => {
      map[inv.distributor] = (map[inv.distributor] || 0) + inv.total;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [receipts, invoices]);

  // Category cards with month-over-month change
  const categoryCards = useMemo(() => {
    const now = new Date();
    const thisMonth = format(now, "yyyy-MM");
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = format(lastMonthDate, "yyyy-MM");

    const thisMonthByCategory: Record<string, number> = {};
    const lastMonthByCategory: Record<string, number> = {};

    receipts.forEach((r) => {
      const cat = r.category || "Uncategorized";
      const month = format(parseISO(r.date), "yyyy-MM");
      if (month === thisMonth) {
        thisMonthByCategory[cat] = (thisMonthByCategory[cat] || 0) + r.amount;
      } else if (month === lastMonth) {
        lastMonthByCategory[cat] = (lastMonthByCategory[cat] || 0) + r.amount;
      }
    });

    const allCats = new Set([...Object.keys(thisMonthByCategory), ...Object.keys(lastMonthByCategory)]);
    return Array.from(allCats)
      .map((cat) => {
        const current = thisMonthByCategory[cat] || 0;
        const previous = lastMonthByCategory[cat] || 0;
        const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
        return { category: cat, current, previous, change };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 6);
  }, [receipts]);

  if (receipts.length === 0 && invoices.length === 0) {
    return null;
  }

  if (!isPro) {
    return (
      <div className="relative">
        <div className="opacity-20 blur-sm pointer-events-none" aria-hidden="true">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="card p-4 md:p-5 h-64" />
            <div className="card p-4 md:p-5 h-64" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <UpgradePrompt
            message="Spending analytics is a Pro feature. Upgrade to see cost breakdowns and trends."
            plan="pro"
          />
        </div>
      </div>
    );
  }

  const maxVendorAmount = topVendors.length > 0 ? topVendors[0].amount : 1;

  return (
    <div className="space-y-6">
      {/* Category Breakdown + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Pie Chart - Category Breakdown */}
        {categoryData.length > 0 && (
          <div className="card p-4 md:p-5">
            <h3 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider mb-4">
              Spend by Category
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1c1814",
                    border: "1px solid #2e271f",
                    borderRadius: "8px",
                    color: "#f5ede0",
                  }}
                  formatter={(v: number) => [formatCurrency(v)]}
                  labelStyle={{ color: "#9c8876", fontSize: 12 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#9c8876" }}
                  formatter={(value) => <span style={{ color: "#9c8876" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar Chart - Monthly Spending Trend */}
        {monthlyData.length > 0 && (
          <div className="card p-4 md:p-5">
            <h3 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider mb-4">
              Monthly Spending Trend
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e271f" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9c8876", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: "#9c8876", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1c1814",
                    border: "1px solid #2e271f",
                    borderRadius: "8px",
                    color: "#f5ede0",
                  }}
                  formatter={(v: number) => [formatCurrency(v)]}
                  labelStyle={{ color: "#9c8876", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9c8876" }} />
                <Bar dataKey="Receipts" stackId="a" fill="#c4956a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Invoices" stackId="a" fill="#d4801f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Vendors + Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top 5 Vendors */}
        {topVendors.length > 0 && (
          <div className="card p-4 md:p-5">
            <h3 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider mb-4">
              Top 5 Vendors
            </h3>
            <div className="space-y-3">
              {topVendors.map((v, i) => (
                <div key={v.name} className="flex items-center gap-3">
                  <span className="text-xs text-[#6b5a4a] w-4 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{v.name}</span>
                      <span className="text-sm text-[#9c8876] flex-shrink-0 ml-2">
                        {formatCurrency(v.amount)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#2e271f] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(v.amount / maxVendorAmount) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Cards with MoM change */}
        {categoryCards.length > 0 && (
          <div className="card p-4 md:p-5">
            <h3 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider mb-4">
              Cost by Category (this month)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {categoryCards.map((c) => (
                <div key={c.category} className="p-3 rounded-lg border border-[#2e271f] bg-[#151210]">
                  <div className="text-xs text-[#9c8876] mb-1 truncate">{c.category}</div>
                  <div className="text-sm font-semibold">{formatCurrency(c.current)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {c.change === 0 ? (
                      <span className="text-[10px] text-[#6b5a4a]">No change</span>
                    ) : c.change > 0 ? (
                      <span className="text-[10px] text-red-400">+{Math.round(c.change)}% vs last month</span>
                    ) : (
                      <span className="text-[10px] text-green-400">{Math.round(c.change)}% vs last month</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
