import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { FilteredEventsView } from "@/components/events/FilteredEventsView";
import { EventsExport } from "@/components/events/EventsExport";
import { getUserEntitlements } from "@/lib/entitlements";
import { getCurrentOrg } from "@/lib/organizations";
import { getDepositStatus } from "@/lib/utils";
import { getPageLabel } from "@/lib/roleLabels";
import type { Event, DepositStatus, PaymentScheduleItem, BusinessType } from "@/types";

export default async function EventsListPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  // Pagination
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let eventsQuery = supabase.from("events").select("*").eq("user_id", user.id);
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);

  let countQuery = supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (org?.orgId) countQuery = countQuery.eq("organization_id", org.orgId);

  const [eventsRes, profileRes, countRes] = await Promise.all([
    eventsQuery.order("event_date", { ascending: false }).range(from, to),
    supabase.from("profiles").select("company_name, business_type").eq("id", user.id).single(),
    countQuery,
  ]);
  const events: Event[] = eventsRes.data ?? [];
  const companyName = profileRes.data?.company_name ?? "My Company";
  const businessType = (profileRes.data?.business_type as BusinessType) || "caterer";
  const pageTitle = getPageLabel(businessType, "/events", "Events");
  const totalCount = countRes.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const { isPro } = await getUserEntitlements();

  // Fetch payment schedules for deposit status (filtered by event IDs)
  const eventIds = events.map((e) => e.id);
  let allSchedules: Pick<PaymentScheduleItem, "event_id" | "installment_name" | "status" | "due_date" | "sort_order">[] = [];
  if (eventIds.length > 0) {
    let schedulesQuery = supabase
      .from("payment_schedules")
      .select("event_id, installment_name, status, due_date, sort_order")
      .in("event_id", eventIds)
      .order("sort_order", { ascending: true });
    if (org?.orgId) schedulesQuery = schedulesQuery.eq("organization_id", org.orgId);
    const { data: schedulesData } = await schedulesQuery;
    allSchedules = (schedulesData ?? []) as typeof allSchedules;
  }

  // Build deposit status map per event
  const depositStatusMap: Record<string, DepositStatus> = {};
  for (const event of events) {
    const eventSchedules = allSchedules.filter((s) => s.event_id === event.id);
    depositStatusMap[event.id] = getDepositStatus(eventSchedules);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">{pageTitle}</h1>
          <p className="text-sm text-[#D4A373] mt-1">{events.length} total {pageTitle.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-3">
          {events.length > 0 && <EventsExport events={events} companyName={companyName} isPro={isPro} />}
          <Link href="/events/new" className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New event</Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card p-16 text-center">
          <CalendarDays className="w-10 h-10 text-[#7A8BA8] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No events yet</h2>
          <p className="text-sm text-[#D4A373] mb-6">Create your first event to start pricing.</p>
          <Link href="/events/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create first event</Link>
        </div>
      ) : (
        <>
          <FilteredEventsView events={events} companyName={companyName} depositStatusMap={depositStatusMap} />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {page > 1 && (
                <Link href={`/events?page=${page - 1}`} className="btn-secondary text-sm px-3 py-1.5">
                  Previous
                </Link>
              )}
              <span className="text-sm text-[#7A8BA8]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/events?page=${page + 1}`} className="btn-secondary text-sm px-3 py-1.5">
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
