import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatPercent, safeParseDate } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, addDays, isThisWeek } from "date-fns";
import { TrendingUp, TrendingDown, Minus, CalendarDays, DollarSign, Percent, Plus, ArrowRight, FileText, Activity, Send } from "lucide-react";
import type { Event, PricingData, PaymentData, ClientMessage } from "@/types";
import { DashboardChart } from "@/components/dashboard/DashboardChart";
import { InlineSuggestion } from "@/components/assistant/InlineSuggestion";
import { RevenueGoal } from "@/components/dashboard/RevenueGoal";
import { RevenueForecasting } from "@/components/dashboard/RevenueForecasting";
import { WelcomeModal } from "@/components/dashboard/WelcomeModal";
import { ActionAlerts, type AlertItem } from "@/components/dashboard/ActionAlerts";
import { UpcomingEventsTimeline } from "@/components/dashboard/UpcomingEventsTimeline";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ClientDate, ClientGreeting } from "@/components/dashboard/ClientDate";
import { SuggestionsWidget } from "@/components/cain/SuggestionsWidget";
import { getCurrentOrg } from "@/lib/organizations";
import { isDemoSession } from "@/lib/demo";
import { VenueDashboardCards } from "@/components/dashboard/VenueDashboardCards";
import { VenueUpcomingBookings, type VenueBooking } from "@/components/dashboard/VenueUpcomingBookings";

async function getDashboardData(userId: string, orgId: string | null) {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  let eventsQuery = supabase.from("events").select("*").eq("user_id", userId);
  if (orgId) eventsQuery = eventsQuery.eq("organization_id", orgId);
  const { data: allEvents } = await eventsQuery.order("event_date", { ascending: false });

  const events: Event[] = allEvents ?? [];
  const thisMonthEvents = events.filter(e => e.event_date >= monthStart && e.event_date <= monthEnd);
  const active = thisMonthEvents.filter(e => e.status === "confirmed" || e.status === "completed");

  const monthRevenue = active.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
  const monthCost = active.reduce((s, e) => s + ((e.pricing_data as PricingData)?.totalCost ?? 0), 0);
  const monthProfit = monthRevenue - monthCost;
  const avgMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  // Last month stats for comparison
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = startOfMonth(lastMonth).toISOString();
  const lastMonthEnd = endOfMonth(lastMonth).toISOString();
  const lastMonthEvents = events.filter(e => e.event_date >= lastMonthStart && e.event_date <= lastMonthEnd);
  const lastMonthActive = lastMonthEvents.filter(e => e.status === "confirmed" || e.status === "completed");
  const lastMonthRevenue = lastMonthActive.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
  const lastMonthCost = lastMonthActive.reduce((s, e) => s + ((e.pricing_data as PricingData)?.totalCost ?? 0), 0);
  const lastMonthProfit = lastMonthRevenue - lastMonthCost;
  const lastMonthMargin = lastMonthRevenue > 0 ? (lastMonthProfit / lastMonthRevenue) * 100 : 0;

  // Pipeline data
  const proposedEvents = events.filter(e => e.status === "proposed");
  const confirmedEvents = events.filter(e => e.status === "confirmed" && e.event_date > now.toISOString());
  const proposedTotal = proposedEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);
  const confirmedTotal = confirmedEvents.reduce((s, e) => s + ((e.pricing_data as PricingData)?.suggestedPrice ?? 0), 0);

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

  // Pending proposals count
  let pendingProposalsQuery = supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["draft", "sent"]);
  if (orgId) pendingProposalsQuery = pendingProposalsQuery.eq("organization_id", orgId);
  const { count: pendingProposalsCount } = await pendingProposalsQuery;

  // Action Items: Proposals with revision requests
  let revisionQuery = supabase.from("proposals").select("id, title, event_id, events(name)").eq("user_id", userId).eq("status", "sent").not("client_messages", "eq", "[]");
  if (orgId) revisionQuery = revisionQuery.eq("organization_id", orgId);
  const { data: revisionProposals } = await revisionQuery;

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

  // Action Items: Events within 7 days with no staff assigned
  let staffAssignQuery = supabase.from("event_staff_assignments").select("event_id").eq("user_id", userId);
  if (orgId) staffAssignQuery = staffAssignQuery.eq("organization_id", orgId);
  const { data: staffAssignments } = await staffAssignQuery;
  const eventIdsWithStaff = new Set((staffAssignments ?? []).map((sa: any) => sa.event_id));
  const eventsWithoutStaff = events.filter(e =>
    e.event_date > now.toISOString() && e.event_date <= sevenDaysOut &&
    (e.status === "confirmed" || e.status === "proposed") &&
    !eventIdsWithStaff.has(e.id)
  );

  // Action Items: Events within 3 days with no pricing
  const threeDaysOut = addDays(now, 3).toISOString();
  const eventsWithoutPricing = events.filter(e =>
    e.event_date > now.toISOString() && e.event_date <= threeDaysOut &&
    e.status !== "canceled" && e.status !== "completed" &&
    !(e.pricing_data as PricingData | null)?.suggestedPrice
  );

  // Action Items: Stale proposals (sent > 5 days ago, no response)
  const fiveDaysAgo = addDays(now, -5).toISOString();
  let staleQuery = supabase.from("proposals").select("id, title, event_id, created_at, events(name)").eq("user_id", userId).eq("status", "sent").lt("created_at", fiveDaysAgo);
  if (orgId) staleQuery = staleQuery.eq("organization_id", orgId);
  const { data: staleProposalData } = await staleQuery;
  const staleProposals = (staleProposalData ?? []).filter((p: any) => {
    const messages = (p.client_messages ?? []) as ClientMessage[];
    return !messages.some(m => m.action === "accepted" || m.action === "declined" || m.action === "revision_requested");
  });

  // Count events this week for informational alert
  const eventsThisWeekCount = events.filter(e =>
    e.status !== "canceled" && isThisWeek(safeParseDate(e.event_date), { weekStartsOn: 1 })
  ).length;

  // Events needing attention: upcoming events with incomplete checklists
  const upcomingActive = events.filter(
    e => e.event_date > now.toISOString() && e.status !== "canceled" && e.status !== "completed"
  );
  const eventsNeedingChecklist = upcomingActive.filter(e => {
    const p = e.pricing_data as PricingData | null;
    const pay = e.payment_data as PaymentData | null;
    const detailsComplete = !!(e.name && e.event_date && e.guest_count && e.venue);
    const contactComplete = !!(e.client_name && (e.client_email || e.client_phone));
    const pricingComplete = !!(p && p.menuItems && p.menuItems.length > 0);
    const depositComplete = !pay?.depositRequired || (pay.totalPaid ?? 0) >= pay.depositRequired;
    return !(detailsComplete && contactComplete && pricingComplete && depositComplete);
  }).length;

  // Recent activity feed
  let activityQuery = supabase
    .from("event_activity")
    .select("id, type, description, created_at, event_id, events(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  const { data: recentActivity } = await activityQuery;

  const activityItems = (recentActivity ?? []).map((a: any) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    created_at: a.created_at,
    event_name: a.events?.name ?? null,
    event_id: a.event_id,
  }));

  return {
    totalEventsThisMonth: thisMonthEvents.length,
    totalRevenueThisMonth: monthRevenue,
    totalProfitThisMonth: monthProfit,
    avgMarginThisMonth: avgMargin,
    lastMonthEvents: lastMonthEvents.length,
    lastMonthRevenue,
    lastMonthProfit,
    lastMonthMargin,
    proposedPipeline: { total: proposedTotal, count: proposedEvents.length },
    confirmedPipeline: { total: confirmedTotal, count: confirmedEvents.length },
    pendingProposalsCount: pendingProposalsCount ?? 0,
    upcomingEvents: events.filter(e => e.event_date > now.toISOString() && e.status !== "canceled").slice(0, 10),
    recentEvents: events.slice(0, 8),
    monthlyData,
    eventsWithBalances,
    totalOutstanding,
    allEvents: events,
    proposalsNeedingRevision,
    draftEventsNeedingAttention,
    overdueDeposits,
    eventsNeedingChecklist,
    eventsWithoutStaff,
    eventsWithoutPricing,
    staleProposals,
    eventsThisWeekCount,
    activityItems,
  };
}

async function getVenueDashboardData(userId: string, orgId: string | null) {
  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysOut = addDays(now, 30).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  try {
    // Fetch upcoming bookings (next 5, within 30 days)
    let bookingsQuery = supabase
      .from("venue_bookings")
      .select("id, title, booking_date, start_time, end_time, status, venue_spaces(name)")
      .gt("booking_date", now.toISOString())
      .lt("booking_date", thirtyDaysOut)
      .order("booking_date", { ascending: true })
      .limit(5);

    if (orgId) {
      bookingsQuery = bookingsQuery.eq("organization_id", orgId);
    } else {
      bookingsQuery = bookingsQuery.eq("user_id", userId);
    }

    const { data: bookingsData } = await bookingsQuery;

    const upcomingBookings: VenueBooking[] = (bookingsData ?? []).map((b: any) => ({
      id: b.id,
      title: b.title,
      booking_date: b.booking_date,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      space_name: b.venue_spaces?.name || "Unknown Space",
    }));

    // Count today's bookings
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let todayQuery = supabase
      .from("venue_bookings")
      .select("id", { count: "exact", head: true })
      .gte("booking_date", todayStart.toISOString())
      .lte("booking_date", todayEnd.toISOString());

    if (orgId) {
      todayQuery = todayQuery.eq("organization_id", orgId);
    } else {
      todayQuery = todayQuery.eq("user_id", userId);
    }

    const { count: todayCount } = await todayQuery;

    // Count this week's bookings
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    let weekQuery = supabase
      .from("venue_bookings")
      .select("id", { count: "exact", head: true })
      .gte("booking_date", weekStart.toISOString())
      .lte("booking_date", weekEnd.toISOString());

    if (orgId) {
      weekQuery = weekQuery.eq("organization_id", orgId);
    } else {
      weekQuery = weekQuery.eq("user_id", userId);
    }

    const { count: weekCount } = await weekQuery;

    // Count pending quotes (proposals with status 'sent' or 'draft')
    let quotesQuery = supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent"]);

    if (orgId) {
      quotesQuery = quotesQuery.eq("organization_id", orgId);
    } else {
      quotesQuery = quotesQuery.eq("user_id", userId);
    }

    const { count: pendingQuotesCount } = await quotesQuery;

    // Sum revenue from confirmed bookings this month
    let revenueQuery = supabase
      .from("venue_bookings")
      .select("rental_rate")
      .eq("status", "confirmed")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd);

    if (orgId) {
      revenueQuery = revenueQuery.eq("organization_id", orgId);
    } else {
      revenueQuery = revenueQuery.eq("user_id", userId);
    }

    const { data: revenueData } = await revenueQuery;
    const monthlyRevenue =
      (revenueData ?? []).reduce((sum: number, b: any) => sum + (b.rental_rate || 0), 0);

    return {
      upcomingBookings,
      todayBookings: todayCount ?? 0,
      weekBookings: weekCount ?? 0,
      pendingQuotes: pendingQuotesCount ?? 0,
      monthlyRevenue,
    };
  } catch (error) {
    // Tables may not exist yet, return empty/zero values
    console.error("Error fetching venue dashboard data:", error);
    return {
      upcomingBookings: [],
      todayBookings: 0,
      weekBookings: 0,
      pendingQuotes: 0,
      monthlyRevenue: 0,
    };
  }
}

const STATUS_CLASSES: Record<string, string> = {
  draft: "badge-draft", proposed: "badge-proposed",
  confirmed: "badge-confirmed", completed: "badge-completed", canceled: "badge-canceled",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  const { data: profile } = await supabase.from("profiles").select("full_name, company_name, has_seen_welcome, onboarding_completed, business_type, primary_goal").eq("id", user.id).single();

  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding");
  }
  const stats = await getDashboardData(user.id, org?.orgId ?? null);
  const isDemo = await isDemoSession();
  const h = new Date().getHours();
  const greeting = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";

  // Role-aware terminology
  const businessType = profile?.business_type || "caterer";

  // Fetch venue-specific data if this is a venue
  let venueData = null;
  if (businessType === "venue") {
    venueData = await getVenueDashboardData(user.id, org?.orgId ?? null);
  }
  const ROLE_TERMS: Record<string, { event: string; proposal: string }> = {
    caterer: { event: "Event", proposal: "Proposal" },
    restaurant: { event: "Private Event", proposal: "Proposal" },
    private_chef: { event: "Dinner", proposal: "Proposal" },
    venue: { event: "Booking", proposal: "Quote" },
    event_planner: { event: "Event", proposal: "Proposal" },
    florist: { event: "Job", proposal: "Floral Quote" },
    band_entertainment: { event: "Gig", proposal: "Contract" },
    rental_company: { event: "Reservation", proposal: "Rental Quote" },
    hospitality_management: { event: "Event", proposal: "Proposal" },
    other: { event: "Event", proposal: "Proposal" },
  };
  const terms = ROLE_TERMS[businessType] || ROLE_TERMS.caterer;

  // Build smart alerts
  const alerts: AlertItem[] = [];

  // Urgent: Events within 3 days with no pricing
  for (const e of stats.eventsWithoutPricing) {
    alerts.push({
      id: `pricing-${e.id}`,
      type: "urgent",
      title: `Pricing missing for ${e.name}`,
      description: `Event on ${format(safeParseDate(e.event_date), "MMM d")} has no pricing set`,
      link: `/events/${e.id}`,
      eventName: e.name,
    });
  }

  // Warning: Events within 7 days with no staff
  for (const e of stats.eventsWithoutStaff) {
    alerts.push({
      id: `staff-${e.id}`,
      type: "warning",
      title: `Staff not assigned for ${e.name}`,
      description: `Event on ${format(safeParseDate(e.event_date), "MMM d")} has no staff assigned`,
      link: `/events/${e.id}`,
      eventName: e.name,
    });
  }

  // Warning: Overdue deposits
  for (const e of stats.overdueDeposits) {
    const payment = e.payment_data as PaymentData;
    alerts.push({
      id: `deposit-${e.id}`,
      type: "warning",
      title: `Deposit unpaid for ${e.name}`,
      description: `${formatCurrency(payment.totalPaid)} of ${formatCurrency(payment.depositRequired)} received`,
      link: `/events/${e.id}`,
      eventName: e.name,
    });
  }

  // Warning: Draft events needing attention
  for (const e of stats.draftEventsNeedingAttention) {
    alerts.push({
      id: `draft-${e.id}`,
      type: "warning",
      title: `${e.name} still in draft`,
      description: `Event on ${format(safeParseDate(e.event_date), "MMM d")} — confirm or update`,
      link: `/events/${e.id}`,
      eventName: e.name,
    });
  }

  // Warning: Proposals needing revision
  for (const p of stats.proposalsNeedingRevision) {
    alerts.push({
      id: `revision-${p.id}`,
      type: "warning",
      title: `Revision requested: ${(p as any).title}`,
      description: (p as any).events?.name ? `For ${(p as any).events.name}` : "Client requested changes",
      link: `/proposals/${p.id}`,
    });
  }

  // Warning: Stale proposals
  for (const p of stats.staleProposals) {
    alerts.push({
      id: `stale-${(p as any).id}`,
      type: "warning",
      title: `Follow up on ${(p as any).title}`,
      description: (p as any).events?.name ? `Sent to ${(p as any).events.name} — no response yet` : "No client response after 5+ days",
      link: `/proposals/${(p as any).id}`,
    });
  }

  // Info: Events this week summary
  if (stats.eventsThisWeekCount > 0) {
    alerts.push({
      id: "week-summary",
      type: "info",
      title: `${stats.eventsThisWeekCount} event${stats.eventsThisWeekCount === 1 ? "" : "s"} this week`,
      description: "Stay on top of your upcoming schedule",
      link: "/events",
    });
  }

  // Prepare timeline events data
  const timelineEvents = stats.upcomingEvents.map(e => ({
    id: e.id,
    name: e.name,
    client_name: e.client_name,
    event_date: e.event_date,
    start_time: e.start_time,
    status: e.status,
    guest_count: e.guest_count,
  }));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <WelcomeModal hasSeenWelcome={profile?.has_seen_welcome ?? false} />

      {isDemo && (
        <div className="card p-5 mb-6 border-brand-800/40 bg-gradient-to-r from-brand-950/50 via-[#111B2E] to-brand-950/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-900/50 border border-brand-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-brand-400 text-sm">C</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold mb-1">Welcome to Cateros</h2>
              <p className="text-xs text-[#D4A373] leading-relaxed">
                The operating system for catering and hospitality. Explore events, menu costing, staffing, proposals, and margin tracking — all in one place.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <ClientGreeting name={profile?.full_name ?? undefined} isDemo={isDemo} companyName={profile?.company_name ?? undefined} />
          <ClientDate />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <InlineSuggestion prompt="How's my business doing this month? Analyze my events, margins, and revenue." label="Business Insights" />
          <Link href="/proposals" className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-initial">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">New {terms.proposal.toLowerCase()}</span>
            <span className="sm:hidden">{terms.proposal}</span>
          </Link>
          <Link href="/events/new" className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-initial">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New {terms.event.toLowerCase()}</span>
            <span className="sm:hidden">{terms.event}</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats Row — Venue or Caterer specific */}
      {businessType === "venue" && venueData ? (
        <VenueDashboardCards
          todayBookings={venueData.todayBookings}
          weekBookings={venueData.weekBookings}
          pendingQuotes={venueData.pendingQuotes}
          monthlyRevenue={venueData.monthlyRevenue}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { icon: DollarSign, label: "Revenue", fullLabel: "Revenue this month", value: stats.totalRevenueThisMonth, prev: stats.lastMonthRevenue, color: "text-brand-400" },
            { icon: CalendarDays, label: terms.event + "s", fullLabel: terms.event + "s this month", value: stats.totalEventsThisMonth, prev: stats.lastMonthEvents, color: "text-brand-400", raw: true },
            { icon: Percent, label: "Margin", fullLabel: "Avg. Margin", value: stats.avgMarginThisMonth, prev: stats.lastMonthMargin, color: "text-brand-400", pct: true },
            { icon: FileText, label: "Proposals", fullLabel: "Pending Proposals", value: stats.pendingProposalsCount, prev: null, color: "text-[#D4A373]", raw: true, noDelta: true },
          ].map(({ icon: Icon, label, fullLabel, value, prev, color, green, pct, raw, noDelta }: any) => {
            const current = value as number;
            const previous = (prev ?? 0) as number;
            const delta = previous > 0
              ? ((current - previous) / previous) * 100
              : current > 0 ? 100 : 0;
            const isUp = current > previous;
            const isDown = current < previous;
            const isEqual = current === previous || (previous === 0 && current === 0);

            return (
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
                {!noDelta ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    {isEqual ? (
                      <>
                        <Minus className="w-3 h-3 text-[#7A8BA8]" />
                        <span className="text-[10px] md:text-xs text-[#7A8BA8]">No change</span>
                      </>
                    ) : isUp ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] md:text-xs text-green-400">
                          {raw ? `+${current - previous}` : `+${Math.round(Math.abs(delta))}%`} vs last month
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] md:text-xs text-red-400">
                          {raw ? `${current - previous}` : `-${Math.round(Math.abs(delta))}%`} vs last month
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[10px] md:text-xs text-[#7A8BA8]">
                      {stats.proposedPipeline.count} proposed, {stats.confirmedPipeline.count} confirmed {terms.event.toLowerCase()}s
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Venue-specific: Upcoming Bookings */}
      {businessType === "venue" && venueData && (
        <div className="mb-6 md:mb-8">
          <VenueUpcomingBookings bookings={venueData.upcomingBookings} />
        </div>
      )}

      {/* Revenue Goal + Next Event (for non-venue) */}
      {businessType !== "venue" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <RevenueGoal currentRevenue={stats.totalRevenueThisMonth} />
          {stats.upcomingEvents.length > 0 && (() => {
            const next = stats.upcomingEvents[0];
            const daysUntil = Math.ceil((safeParseDate(next.event_date).getTime() - Date.now()) / 86400000);
            return (
              <div className="card p-4 md:p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-[#D4A373]" />
                  <span className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider">Next Event</span>
                </div>
                <div className="text-lg md:text-xl font-semibold font-display">
                  {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                </div>
                <Link href={`/events/${next.id}`} className="text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors">
                  {next.name} — {next.client_name}
                </Link>
              </div>
            );
          })()}
        </div>
      )}

      {/* Pipeline (for non-venue) */}
      {businessType !== "venue" && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[#D4A373]" />
              <span className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider">Proposed Pipeline</span>
            </div>
            <div className="text-lg md:text-2xl font-semibold font-display">{formatCurrency(stats.proposedPipeline.total)}</div>
            <div className="text-[10px] md:text-xs text-[#7A8BA8] mt-1">
              {stats.proposedPipeline.count} {stats.proposedPipeline.count === 1 ? terms.event.toLowerCase() : terms.event.toLowerCase() + "s"}
            </div>
          </div>
          <div className="card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider">Confirmed Pipeline</span>
            </div>
            <div className="text-lg md:text-2xl font-semibold font-display text-green-400">{formatCurrency(stats.confirmedPipeline.total)}</div>
            <div className="text-[10px] md:text-xs text-[#7A8BA8] mt-1">
              {stats.confirmedPipeline.count} {stats.confirmedPipeline.count === 1 ? terms.event.toLowerCase() : terms.event.toLowerCase() + "s"}
            </div>
          </div>
        </div>
      )}

      {/* Action Alerts */}
      <div className="mb-6 md:mb-8">
        <ActionAlerts alerts={alerts} />
      </div>

      {/* CAIN Suggestions Widget */}
      <div className="mb-6 md:mb-8">
        <SuggestionsWidget />
      </div>

      {/* Upcoming Events + Recent Activity — Side by Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Upcoming Events Timeline — takes 2/3 */}
        <div className="card p-4 md:p-5 lg:col-span-2">
          <UpcomingEventsTimeline events={timelineEvents} />
        </div>

        {/* Recent Activity Feed — takes 1/3 */}
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Activity
            </h2>
          </div>
          <RecentActivityFeed activities={stats.activityItems} />
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card p-4 md:p-5 mb-6 md:mb-8">
        <h2 className="font-medium text-xs md:text-sm mb-4 text-[#D4A373] uppercase tracking-wider">
          <span className="hidden sm:inline">Revenue vs Profit — Last 6 Months</span>
          <span className="sm:hidden">6 Month Overview</span>
        </h2>
        <DashboardChart data={stats.monthlyData} />
      </div>

      {/* Revenue Forecast */}
      <div className="mb-6 md:mb-8">
        <h2 className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider mb-4">Revenue Forecast</h2>
        <RevenueForecasting
          events={stats.allEvents.map((e: Event) => ({
            date: e.event_date,
            status: e.status,
            pricing_data: e.pricing_data,
          }))}
        />
      </div>

      {/* Outstanding Payments */}
      {stats.eventsWithBalances.length > 0 && (
        <div className="card p-4 md:p-5 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider">Outstanding Payments</h2>
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
                <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1A2538] transition-colors border border-[#2A3A5C]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-[10px] text-[#7A8BA8]">{e.client_name} · {format(safeParseDate(e.event_date), "MMM d")}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-yellow-400">{formatCurrency(balance)}</div>
                    <div className="text-[10px] text-[#7A8BA8]">{formatCurrency(paid)} of {formatCurrency(pricing.suggestedPrice)} paid</div>
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-[#2A3A5C] flex-shrink-0 overflow-hidden">
                    <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(pctPaid, 100)}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div className="card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-xs md:text-sm text-[#D4A373] uppercase tracking-wider">Recent {terms.event}s</h2>
          <Link href="/events" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            View all<ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {stats.recentEvents.length === 0 ? (
          <p className="text-sm text-[#7A8BA8] text-center py-8">
            No {terms.event.toLowerCase()}s yet.{" "}
            <Link href="/events/new" className="text-brand-400 hover:text-brand-300 underline">Create your first {terms.event.toLowerCase()}</Link>
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
              <table className="w-full text-xs md:text-sm">
                <thead className="text-[#7A8BA8] border-b border-[#2A3A5C]">
                  <tr>
                    <th className="text-left py-2 font-medium">{terms.event}</th>
                    <th className="text-left py-2 font-medium hidden sm:table-cell">Client</th>
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-right py-2 font-medium hidden md:table-cell">Value</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3A5C]">
                  {stats.recentEvents.map(e => (
                    <tr key={e.id} className="hover:bg-[#1A2538] transition-colors">
                      <td className="py-3">
                        <Link href={`/events/${e.id}`} className="font-medium hover:text-brand-300 block truncate max-w-[120px] sm:max-w-none">
                          {e.name}
                        </Link>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className="text-[#D4A373] truncate block max-w-[150px]">{e.client_name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-[#D4A373] whitespace-nowrap">{format(safeParseDate(e.event_date), "MMM d")}</span>
                      </td>
                      <td className="py-3 text-right hidden md:table-cell">
                        {e.pricing_data ? formatCurrency((e.pricing_data as PricingData).suggestedPrice) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`${STATUS_CLASSES[e.status]} capitalize`}>{e.status}</span>
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
