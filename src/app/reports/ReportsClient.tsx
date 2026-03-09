"use client";

import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  DollarSign, Users, CalendarDays, TrendingUp, TrendingDown,
  UserCheck, Repeat, Target, Award, Utensils,
} from "lucide-react";

// --- Types ---

type MonthlyRevenue = {
  month: string;
  monthShort: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  eventCount: number;
};

type RevenueByStatus = { status: string; revenue: number; count: number };

type ClientData = {
  id: string;
  name: string;
  company: string | null;
  eventCount: number;
  lifetimeRevenue: number;
  status: string;
};

type EventByMonth = { month: string; total: number; [key: string]: string | number };

type ProfitableEvent = {
  id: string;
  name: string;
  client_name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

type StaffUtil = { name: string; role: string; count: number };

type ReportsData = {
  monthlyRevenue: MonthlyRevenue[];
  revenueByStatus: RevenueByStatus[];
  totalRevenueYTD: number;
  avgEventValue: number;
  revenueGrowth: number;
  top10Clients: ClientData[];
  clientAcquisition: { month: string; count: number }[];
  totalClients: number;
  activeClients: number;
  avgClientValue: number;
  repeatRate: number;
  clientStatusBreakdown: { status: string; count: number }[];
  eventsByMonth: EventByMonth[];
  totalEvents: number;
  avgGuestCount: number;
  completionRate: number;
  avgEventVal: number;
  busiestMonths: { month: string; count: number }[];
  topVenues: { venue: string; count: number }[];
  marginBuckets: { range: string; count: number }[];
  top5Profitable: ProfitableEvent[];
  bottom5Profitable: ProfitableEvent[];
  avgMargin: number;
  bestMargin: number;
  totalProfit: number;
  foodCostPct: number;
  marginTrend: { month: string; margin: number }[];
  staffUtilization: StaffUtil[];
  totalStaff: number;
  avgEventsPerStaff: number;
  mostActiveStaff: string;
};

// --- Chart theme ---

const CHART_COLORS = {
  gold: "#D4A373",
  green: "#4ade80",
  blue: "#60a5fa",
  purple: "#a78bfa",
  rose: "#fb7185",
  amber: "#fbbf24",
  teal: "#2dd4bf",
};

const MULTI_COLORS = [
  CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.blue,
  CHART_COLORS.purple, CHART_COLORS.rose, CHART_COLORS.amber, CHART_COLORS.teal,
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: CHART_COLORS.blue,
  completed: CHART_COLORS.green,
  canceled: CHART_COLORS.rose,
  draft: "#7A8BA8",
  proposed: CHART_COLORS.amber,
};

function ChartTooltip({ active, payload, label, isCurrency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-[#D4A373] mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#7A8BA8]">{entry.name}:</span>
          <span className="text-[#F4F1ED] font-medium">
            {isCurrency ? formatCurrency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function NumberTooltip({ active, payload, label }: any) {
  return <ChartTooltip active={active} payload={payload} label={label} isCurrency={false} />;
}

function PercentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-[#D4A373] mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#7A8BA8]">{entry.name}:</span>
          <span className="text-[#F4F1ED] font-medium">{formatPercent(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// --- Summary card ---

function SummaryCard({ icon: Icon, label, value, subtext }: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#D4A373]" />
        <span className="text-xs text-[#7A8BA8] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-semibold font-display text-[#F4F1ED]">{value}</div>
      {subtext && <div className="text-[10px] text-[#7A8BA8] mt-1">{subtext}</div>}
    </div>
  );
}

// --- Tab definitions ---

const TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "clients", label: "Clients" },
  { key: "events", label: "Events" },
  { key: "profitability", label: "Profitability" },
  { key: "staff", label: "Staff" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// --- Axis styling ---

const axisProps = {
  tick: { fill: "#D4A373", fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
};

// --- Main component ---

export function ReportsClient({ data }: { data: ReportsData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("revenue");

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold text-[#F4F1ED]">
          Reports & Analytics
        </h1>
        <p className="text-xs md:text-sm text-[#D4A373] mt-1">
          Comprehensive business insights and performance metrics
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 md:mb-8 overflow-x-auto pb-1 border-b border-[#2A3A5C]">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === tab.key
                ? "text-[#D4A373] border-[#D4A373]"
                : "text-[#7A8BA8] border-transparent hover:text-[#F4F1ED] hover:border-[#7A8BA8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "revenue" && <RevenueTab data={data} />}
      {activeTab === "clients" && <ClientsTab data={data} />}
      {activeTab === "events" && <EventsTab data={data} />}
      {activeTab === "profitability" && <ProfitabilityTab data={data} />}
      {activeTab === "staff" && <StaffTab data={data} />}
    </div>
  );
}

// ======================= REVENUE TAB =======================

function RevenueTab({ data }: { data: ReportsData }) {
  const currentMonthRev = data.monthlyRevenue[data.monthlyRevenue.length - 1]?.revenue ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <SummaryCard icon={DollarSign} label="Revenue (YTD)" value={formatCurrency(data.totalRevenueYTD)} />
        <SummaryCard icon={Target} label="Avg Event Value" value={formatCurrency(data.avgEventValue)} />
        <SummaryCard icon={DollarSign} label="This Month" value={formatCurrency(currentMonthRev)} />
        <SummaryCard
          icon={data.revenueGrowth >= 0 ? TrendingUp : TrendingDown}
          label="Revenue Growth"
          value={formatPercent(data.revenueGrowth)}
          subtext="Last 3 months vs prior 3"
        />
      </div>

      {/* Monthly revenue chart */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Monthly Revenue — Last 12 Months
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.monthlyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4A373" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#D4A373" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="monthShort" {...axisProps} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} {...axisProps} width={50} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#D4A373" strokeWidth={2} fill="url(#revAreaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by status */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Revenue by Event Status
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.revenueByStatus} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="status" {...axisProps} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} {...axisProps} width={50} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
              {data.revenueByStatus.map((entry, i) => (
                <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS.gold} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by month table */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Monthly Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="text-[#7A8BA8] border-b border-[#2A3A5C]">
              <tr>
                <th className="text-left py-2 font-medium">Month</th>
                <th className="text-right py-2 font-medium">Revenue</th>
                <th className="text-right py-2 font-medium hidden sm:table-cell">Cost</th>
                <th className="text-right py-2 font-medium">Profit</th>
                <th className="text-right py-2 font-medium hidden md:table-cell">Margin</th>
                <th className="text-right py-2 font-medium">Events</th>
                <th className="text-center py-2 font-medium w-10">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3A5C]">
              {[...data.monthlyRevenue].reverse().map((m, i, arr) => {
                const prev = arr[i + 1];
                const isUp = prev ? m.revenue > prev.revenue : false;
                const isDown = prev ? m.revenue < prev.revenue : false;
                return (
                  <tr key={m.month} className="hover:bg-[#0C1220]/50 transition-colors">
                    <td className="py-2.5 text-[#F4F1ED]">{m.month}</td>
                    <td className="py-2.5 text-right text-[#F4F1ED]">{formatCurrency(m.revenue)}</td>
                    <td className="py-2.5 text-right text-[#7A8BA8] hidden sm:table-cell">{formatCurrency(m.cost)}</td>
                    <td className="py-2.5 text-right text-green-400">{formatCurrency(m.profit)}</td>
                    <td className="py-2.5 text-right text-[#D4A373] hidden md:table-cell">{formatPercent(m.margin)}</td>
                    <td className="py-2.5 text-right text-[#F4F1ED]">{m.eventCount}</td>
                    <td className="py-2.5 text-center">
                      {isUp && <TrendingUp className="w-3.5 h-3.5 text-green-400 inline" />}
                      {isDown && <TrendingDown className="w-3.5 h-3.5 text-red-400 inline" />}
                      {!isUp && !isDown && <span className="text-[#7A8BA8]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ======================= CLIENTS TAB =======================

function ClientsTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <SummaryCard icon={Users} label="Total Clients" value={String(data.totalClients)} />
        <SummaryCard icon={UserCheck} label="Active Clients" value={String(data.activeClients)} />
        <SummaryCard icon={DollarSign} label="Avg Client Value" value={formatCurrency(data.avgClientValue)} />
        <SummaryCard icon={Repeat} label="Repeat Rate" value={formatPercent(data.repeatRate)} />
      </div>

      {/* Top 10 clients by revenue */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Top 10 Clients by Lifetime Revenue
        </h3>
        {data.top10Clients.length === 0 ? (
          <p className="text-sm text-[#7A8BA8] text-center py-8">No client data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.top10Clients.length * 36)}>
            <BarChart data={data.top10Clients} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} {...axisProps} />
              <YAxis dataKey="name" type="category" {...axisProps} width={100} tick={{ fill: "#F4F1ED", fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="lifetimeRevenue" name="Revenue" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Client acquisition over time */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          New Clients per Month
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.clientAcquisition} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={30} allowDecimals={false} />
            <Tooltip content={<NumberTooltip />} />
            <Line type="monotone" dataKey="count" name="New Clients" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ fill: CHART_COLORS.blue, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Client status breakdown */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Client Status Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.clientStatusBreakdown} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="status" {...axisProps} />
            <YAxis {...axisProps} width={30} allowDecimals={false} />
            <Tooltip content={<NumberTooltip />} />
            <Bar dataKey="count" name="Clients" radius={[4, 4, 0, 0]}>
              {data.clientStatusBreakdown.map((_, i) => (
                <Cell key={i} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ======================= EVENTS TAB =======================

function EventsTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <SummaryCard icon={CalendarDays} label="Total Events" value={String(data.totalEvents)} />
        <SummaryCard icon={Users} label="Avg Guest Count" value={String(data.avgGuestCount)} />
        <SummaryCard icon={Award} label="Completion Rate" value={formatPercent(data.completionRate)} />
        <SummaryCard icon={DollarSign} label="Avg Event Value" value={formatCurrency(data.avgEventVal)} />
      </div>

      {/* Events by month */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Events by Month
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.eventsByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={30} allowDecimals={false} />
            <Tooltip content={<NumberTooltip />} />
            <Bar dataKey="completed" name="Completed" stackId="status" fill={STATUS_COLORS.completed} />
            <Bar dataKey="confirmed" name="Confirmed" stackId="status" fill={STATUS_COLORS.confirmed} />
            <Bar dataKey="proposed" name="Proposed" stackId="status" fill={STATUS_COLORS.proposed} />
            <Bar dataKey="draft" name="Draft" stackId="status" fill={STATUS_COLORS.draft} />
            <Bar dataKey="canceled" name="Canceled" stackId="status" fill={STATUS_COLORS.canceled} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Busiest months + Top venues side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
          <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
            Busiest Months
          </h3>
          {data.busiestMonths.length === 0 ? (
            <p className="text-sm text-[#7A8BA8] text-center py-4">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.busiestMonths.map((m, i) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-[#7A8BA8] w-4">{i + 1}.</span>
                  <span className="text-sm text-[#F4F1ED] flex-1">{m.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-[#2A3A5C] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#D4A373]"
                        style={{ width: `${(m.count / (data.busiestMonths[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#D4A373] font-medium w-8 text-right">{m.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
          <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
            Most Popular Venues
          </h3>
          {data.topVenues.length === 0 ? (
            <p className="text-sm text-[#7A8BA8] text-center py-4">No venue data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topVenues.map((v, i) => (
                <div key={v.venue} className="flex items-center gap-3">
                  <span className="text-xs text-[#7A8BA8] w-4">{i + 1}.</span>
                  <span className="text-sm text-[#F4F1ED] flex-1 truncate">{v.venue}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-[#2A3A5C] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#60a5fa]"
                        style={{ width: `${(v.count / (data.topVenues[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#60a5fa] font-medium w-8 text-right">{v.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================= PROFITABILITY TAB =======================

function ProfitabilityTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <SummaryCard icon={Target} label="Avg Margin" value={formatPercent(data.avgMargin)} />
        <SummaryCard icon={Award} label="Best Margin" value={formatPercent(data.bestMargin)} />
        <SummaryCard icon={DollarSign} label="Total Profit" value={formatCurrency(data.totalProfit)} />
        <SummaryCard icon={Utensils} label="Food Cost %" value={formatPercent(data.foodCostPct)} />
      </div>

      {/* Margin distribution */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Profit Margin Distribution
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.marginBuckets} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="range" {...axisProps} />
            <YAxis {...axisProps} width={30} allowDecimals={false} />
            <Tooltip content={<NumberTooltip />} />
            <Bar dataKey="count" name="Events" radius={[4, 4, 0, 0]}>
              {data.marginBuckets.map((_, i) => (
                <Cell key={i} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Margin trend */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Average Margin Trend
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.marginTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} {...axisProps} width={40} />
            <Tooltip content={<PercentTooltip />} />
            <Line type="monotone" dataKey="margin" name="Margin" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ fill: CHART_COLORS.green, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 most profitable + Bottom 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
          <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
            Top 5 Most Profitable Events
          </h3>
          {data.top5Profitable.length === 0 ? (
            <p className="text-sm text-[#7A8BA8] text-center py-4">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[#7A8BA8] border-b border-[#2A3A5C]">
                  <tr>
                    <th className="text-left py-2 font-medium">Event</th>
                    <th className="text-right py-2 font-medium">Revenue</th>
                    <th className="text-right py-2 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3A5C]">
                  {data.top5Profitable.map(e => (
                    <tr key={e.id} className="hover:bg-[#0C1220]/50 transition-colors">
                      <td className="py-2.5">
                        <div className="text-[#F4F1ED] font-medium truncate max-w-[140px]">{e.name}</div>
                        <div className="text-[10px] text-[#7A8BA8]">{e.client_name}</div>
                      </td>
                      <td className="py-2.5 text-right text-[#F4F1ED]">{formatCurrency(e.revenue)}</td>
                      <td className="py-2.5 text-right text-green-400 font-medium">{formatPercent(e.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
          <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
            Bottom 5 Least Profitable Events
          </h3>
          {data.bottom5Profitable.length === 0 ? (
            <p className="text-sm text-[#7A8BA8] text-center py-4">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[#7A8BA8] border-b border-[#2A3A5C]">
                  <tr>
                    <th className="text-left py-2 font-medium">Event</th>
                    <th className="text-right py-2 font-medium">Revenue</th>
                    <th className="text-right py-2 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3A5C]">
                  {data.bottom5Profitable.map(e => (
                    <tr key={e.id} className="hover:bg-[#0C1220]/50 transition-colors">
                      <td className="py-2.5">
                        <div className="text-[#F4F1ED] font-medium truncate max-w-[140px]">{e.name}</div>
                        <div className="text-[10px] text-[#7A8BA8]">{e.client_name}</div>
                      </td>
                      <td className="py-2.5 text-right text-[#F4F1ED]">{formatCurrency(e.revenue)}</td>
                      <td className="py-2.5 text-right text-red-400 font-medium">{formatPercent(e.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================= STAFF TAB =======================

function StaffTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <SummaryCard icon={Users} label="Total Staff" value={String(data.totalStaff)} />
        <SummaryCard icon={CalendarDays} label="Avg Events/Person" value={data.avgEventsPerStaff.toFixed(1)} />
        <SummaryCard icon={Award} label="Most Active" value={data.mostActiveStaff} />
      </div>

      {/* Staff utilization chart */}
      <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
        <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
          Staff Utilization — Events per Team Member
        </h3>
        {data.staffUtilization.length === 0 ? (
          <p className="text-sm text-[#7A8BA8] text-center py-8">No staff assignment data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.staffUtilization.length * 36)}>
            <BarChart data={data.staffUtilization} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5C" horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis dataKey="name" type="category" {...axisProps} width={100} tick={{ fill: "#F4F1ED", fontSize: 11 }} />
              <Tooltip content={<NumberTooltip />} />
              <Bar dataKey="count" name="Assignments" radius={[0, 4, 4, 0]}>
                {data.staffUtilization.map((_, i) => (
                  <Cell key={i} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Staff details table */}
      {data.staffUtilization.length > 0 && (
        <div className="bg-[#1A2538] border border-[#2A3A5C] rounded-xl p-4 md:p-5">
          <h3 className="text-xs text-[#D4A373] uppercase tracking-wider font-medium mb-4">
            Staff Assignment Details
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="text-[#7A8BA8] border-b border-[#2A3A5C]">
                <tr>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Role</th>
                  <th className="text-right py-2 font-medium">Assignments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3A5C]">
                {data.staffUtilization.map(s => (
                  <tr key={s.name} className="hover:bg-[#0C1220]/50 transition-colors">
                    <td className="py-2.5 text-[#F4F1ED] font-medium">{s.name}</td>
                    <td className="py-2.5 text-[#7A8BA8]">{s.role || "—"}</td>
                    <td className="py-2.5 text-right text-[#D4A373] font-medium">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
