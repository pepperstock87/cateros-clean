import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";
import { TrendingUp, CalendarDays, DollarSign, Percent, Plus, ArrowRight, AlertTriangle } from "lucide-react";
import type { Event, PricingData, PaymentData, ClientMessage } from "@/types";
import { DashboardChart } from "@/components/dashboard/DashboardChart";
import { InlineSuggestion } from "@/components/assistant/InlineSuggestion";

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const { data: allEvents } = await supabase
    .from("events").select("*").eq("user_id", userId).order("event_date", { ascending: false });

  const events: Event[] = allEvents ?? [];
  const thisMonthEvents = events.filter(e => e.event_date >= monthStart && e.event_date <= monthEnd);
  const active = thisMonthEvents.filter(e => e.status === "confirmed" || e.status === "completed");

  const monthRevenue = active.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
  const monthCost = active.reduce((s, e) => s + ((e.pricing_data as PricingData)?.totalCost ?? 0), 0);
  const monthProfit = monthRevenue - monthCost;
  const avgMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = startOfMonth(d).toISOString();
    const end = endOfMonth(d).toISOString();
    const mEvents = events.filter(e =>
      e.event_date >= start && e.event_date <= end &&
      (e.status === "confirmed" || e.status === "completed")
    );
    const revenue = mEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
    const cost = mEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.totalCost ?? 0), 0);
    return { month: format(d, "MMM"), revenue, profit: revenue - cost, events: mEvents.length };
  });

  // Outstanding payments
  const eventsWithBalances = events
    .filter(e => {
      const pricing = e.pricing_data as PricingData | null;
      const payment = e.payment_data as PaymentData | null;
      if (!pricing || e.status === "canceled" || e.status === "completed") return false;
      const totalPaid = payment?.totalPaid ?? 0;
      return pricing.suggestedPrice - totalPaid > 0;
    })
    .slice(0, 5);

  const totalOutstanding = events.reduce((s, e) => {
    const pricing = e.pricing_data as PricingData | null;
    const payment = e.payment_data as PaymentData | null;
    if (!pricing || e.status === "canceled") return s;
    return s + (pricing.suggestedPrice - (payment?.totalPaid ?? 0));
  }, 0);

  // Action Items: Proposals with revision requests
  const { data: revisionProposals } = await supabase
    .from("proposals")
    .select("id, title, event_id, events(name)")
    .eq("user_id", userId)
    .eq("status", "sent")
    .not("client_messages", "eq", "[]");

  const proposalsNeedingRevision = (revisionProposals ?? []).filter((p: any) => {
    const messages = (p.client_messages ?? []) as ClientMessage[];
    return messages.some(m => m.action === "revision_requested");
  });

  // Action Items: Draft events within 7 days
  const sevenDaysOut = addDays(now, 7).toISOString();
  const draftEventsNeedingAttention = events.filter(
    e => e.status === "draft" && e.event_date > now.toISOString() && e.event_date <= sevenDaysOut
  );

  // Action Items: Overdue deposits (confirmed, within 14 days, deposit not met)
  const fourteenDaysOut = addDays(now, 14).toISOString();
  const overdueDeposits = events.filter(e => {
    if (e.status !== "confirmed") return false;
    if (e.event_date > fourteenDaysOut || e.event_date < now.toISOString()) return false;
    const payment = e.payment_data as PaymentData | null;
    if (!payment || !payment.depositRequired) return false;
    return (payment.totalPaid ?? 0) < payment.depositRequired;
  });

  return {
    totalEventsThisMonth: thisMonthEvents.length,
    totalRevenueThisMonth: monthRevenue,
    totalProfitThisMonth: monthProfit,
    avgMarginThisMonth: avgMargin,
    upcomingEvents: events.filter(e => e.event_date > now.toISOString() && e.status !== "canceled").slice(0, 5),
    recentEvents: events.slice(0, 8),
    monthlyData,
    eventsWithBalances,
    totalOutstanding,
    proposalsNeedingRevision,
    draftEventsNeedingAttention,
    overdueDeposits,
  };
}

const STATUS_CLASSES: Record<string, string> = {
  draft: "badge-draft", proposed: "badge-proposed",
  confirmed: "badge-confirmed", completed: "badge-completed", canceled: "badge-canceled",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const stats = await getDashboardData(user.id);
  const h = new Date().getHours();
  const greeting = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header - Mobile friendly */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">
            Good {greeting}, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-xs md:text-sm text-[#9c8876] mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <InlineSuggestion prompt="How's my business doing this month? Analyze my events, margins, and revenue." label="How's my business?" />
          <Link href="/events/new" className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-initial">
            <Plus className="w-4 h-4" />
            <span>New event</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { icon: CalendarDays, label: "Events", fullLabel: "Events this month", value: stats.totalEventsThisMonth, color: "text-brand-400", raw: true },
          { icon: DollarSign, label: "Revenue", fullLabel: "Revenue", value: stats.totalRevenueThisMonth, color: "text-brand-400" },
          { icon: TrendingUp, label: "Profit", fullLabel: "Profit", value: stats.totalProfitThisMonth, color: "text-green-400", green: true },
          { icon: Percent, label: "Margin", fullLabel: "Avg Margin", value: stats.avgMarginThisMonth, color: "text-brand-400", pct: true },
        ].map(({ icon: Icon, label, fullLabel, value, color, green, pct, raw }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="stat-label">
                <span className="hidden sm:inline">{fullLabel}</span>
                <span className="sm:hidden">{label}</span>
              </span>
            </div>
            <div className={`stat-value text-lg md:text-2xl ${green ? "text-green-400" : ""}`}>
              {raw ? value : pct ? formatPercent(value as number) : formatCurrency(value as number)}
            </div>
          </div>
        ))}
      </div>

      {/* Action Items & Notifications */}
      {(stats.proposalsNeedingRevision.length > 0 || stats.draftEventsNeedingAttention.length > 0 || stats.overdueDeposits.length > 0) && (
        <div className="card border-amber-500/30 bg-amber-950/10 p-4 md:p-5 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-medium text-xs md:text-sm text-amber-400 uppercase tracking-wider">Action Items & Notifications</h2>
          </div>
          <div className="space-y-2">
            {stats.proposalsNeedingRevision.map((p: any) => (
              <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-950/20 transition-colors border border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-[10px] md:text-xs text-amber-400/70">Revision requested{p.events?.name ? ` — ${p.events.name}` : ""}</div>
                </div>
                <span className="text-[10px] md:text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full flex-shrink-0">Revision</span>
              </Link>
            ))}
            {stats.draftEventsNeedingAttention.map((e: Event) => (
              <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-950/20 transition-colors border border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.name}</div>
                  <div className="text-[10px] md:text-xs text-amber-400/70">Still in draft — event on {format(new Date(e.event_date), "MMM d")}</div>
                </div>
                <span className="text-[10px] md:text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full flex-shrink-0">Draft</span>
              </Link>
            ))}
            {stats.overdueDeposits.map((e: Event) => {
              const payment = e.payment_data as PaymentData;
              return (
                <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-950/20 transition-colors border border-amber-500/20">
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-[10px] md:text-xs text-amber-400/70">
                      Deposit overdue — {formatCurrency(payment.totalPaid)} of {formatCurrency(payment.depositRequired)} received
                    </div>
                  </div>
                  <span className="text-[10px] md:text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full flex-shrink-0">Deposit</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart & Upcoming Events - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 card p-4 md:p-5">
          <h2 className="font-medium text-xs md:text-sm mb-4 text-[#9c8876] uppercase tracking-wider">
            <span className="hidden sm:inline">Revenue vs Profit — 6 months</span>
            <span className="sm:hidden">6 Month Overview</span>
          </h2>
          <DashboardChart data={stats.monthlyData} />
        </div>

        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider">Upcoming</h2>
            <Link href="/events" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              All<ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.upcomingEvents.length === 0 ? (
            <p className="text-xs md:text-sm text-[#6b5a4a] text-center py-6">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {stats.upcomingEvents.map(e => (
                <Link key={e.id} href={`/events/${e.id}`} className="block p-3 rounded-lg hover:bg-[#1c1814] transition-colors border border-[#2e271f]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-xs md:text-sm truncate">{e.name}</span>
                    <span className={`${STATUS_CLASSES[e.status]} text-[10px] md:text-xs whitespace-nowrap`}>{e.status}</span>
                  </div>
                  <div className="text-[10px] md:text-xs text-[#6b5a4a]">{format(new Date(e.event_date), "MMM d")} • {e.guest_count} guests</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding Payments */}
      {stats.eventsWithBalances.length > 0 && (
        <div className="card p-4 md:p-5 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider">Outstanding Payments</h2>
            <span className="text-sm font-semibold text-yellow-400">{formatCurrency(stats.totalOutstanding)}</span>
          </div>
          <div className="space-y-2">
            {stats.eventsWithBalances.map(e => {
              const pricing = e.pricing_data as PricingData;
              const payment = e.payment_data as PaymentData | null;
              const paid = payment?.totalPaid ?? 0;
              const balance = pricing.suggestedPrice - paid;
              const pctPaid = (paid / pricing.suggestedPrice) * 100;
              return (
                <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1c1814] transition-colors border border-[#2e271f]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-[10px] text-[#6b5a4a]">{e.client_name} · {format(new Date(e.event_date), "MMM d")}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-yellow-400">{formatCurrency(balance)}</div>
                    <div className="text-[10px] text-[#6b5a4a]">{formatCurrency(paid)} of {formatCurrency(pricing.suggestedPrice)} paid</div>
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-[#2e271f] flex-shrink-0 overflow-hidden">
                    <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(pctPaid, 100)}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Events - Mobile scrollable */}
      <div className="card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider">Recent Events</h2>
          <Link href="/events" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            View all<ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.recentEvents.length === 0 ? (
          <p className="text-sm text-[#6b5a4a] text-center py-8">
            No events yet.{" "}
            <Link href="/events/new" className="text-brand-400 hover:text-brand-300 underline">Create your first event</Link>
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
              <table className="w-full text-xs md:text-sm">
                <thead className="text-[#6b5a4a] border-b border-[#2e271f]">
                  <tr>
                    <th className="text-left py-2 font-medium">Event</th>
                    <th className="text-left py-2 font-medium hidden sm:table-cell">Client</th>
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-right py-2 font-medium hidden md:table-cell">Value</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e271f]">
                  {stats.recentEvents.map(e => (
                    <tr key={e.id} className="hover:bg-[#1c1814] transition-colors">
                      <td className="py-3">
                        <Link href={`/events/${e.id}`} className="font-medium hover:text-brand-300 block truncate max-w-[120px] sm:max-w-none">
                          {e.name}
                        </Link>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className="text-[#9c8876] truncate block max-w-[150px]">{e.client_name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-[#9c8876] whitespace-nowrap">{format(new Date(e.event_date), "MMM d")}</span>
                      </td>
                      <td className="py-3 text-right hidden md:table-cell">
                        {e.pricing_data ? formatCurrency((e.pricing_data as PricingData).suggestedPrice) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <span className={STATUS_CLASSES[e.status]}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
