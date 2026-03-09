import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Event, PricingData, PaymentData, PaymentScheduleItem, Payment, ContractAcceptance } from "@/types";
import PortalClient from "./PortalClient";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function ClientPortalPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { payment: paymentStatus } = await searchParams;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, event:events(*)")
    .eq("share_token", token)
    .single();

  if (!proposal) notFound();

  const { data: settings } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", proposal.user_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", proposal.user_id)
    .maybeSingle();

  const event = proposal.event as Event | null;
  const pricing = event?.pricing_data as PricingData | null;
  const payment = event?.payment_data as PaymentData | null;
  const companyName = settings?.business_name || profile?.company_name || "Catering Company";

  // Fetch payment schedules, payments, and contract acceptance in parallel
  const [schedulesRes, paymentsRes, contractRes] = await Promise.all([
    supabase
      .from("payment_schedules")
      .select("*")
      .eq("event_id", proposal.event_id)
      .order("sort_order"),
    supabase
      .from("payments")
      .select("*")
      .eq("event_id", proposal.event_id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
    supabase
      .from("contract_acceptances")
      .select("accepted_by_name, accepted_by_email, accepted_at, ip_address")
      .eq("proposal_id", proposal.id)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const schedules = (schedulesRes.data ?? []) as PaymentScheduleItem[];
  const paidPayments = (paymentsRes.data ?? []) as Payment[];
  const contractAcceptance = (contractRes.data as ContractAcceptance | null) ?? null;
  const hasNewPaymentSystem = schedules.length > 0;

  // Calculate totals
  const scheduledTotal = hasNewPaymentSystem
    ? schedules.reduce((sum, s) => sum + Number(s.amount), 0)
    : 0;
  const newSystemTotalPaid = hasNewPaymentSystem
    ? paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    : 0;

  const totalPaid = hasNewPaymentSystem ? newSystemTotalPaid : (payment?.totalPaid ?? 0);
  const totalDue = hasNewPaymentSystem ? scheduledTotal : (pricing?.suggestedPrice ?? 0);
  const balanceDue = totalDue - totalPaid;

  // Serialize event for client component (strip non-serializable fields)
  const serializedEvent = event
    ? {
        id: event.id,
        name: event.name,
        client_name: event.client_name,
        client_email: event.client_email,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        guest_count: event.guest_count,
        venue: event.venue,
        status: event.status,
      }
    : null;

  // Serialize schedules for client
  const serializedSchedules = schedules.map((s) => ({
    id: s.id,
    installment_name: s.installment_name,
    amount: s.amount,
    percentage: s.percentage,
    due_date: s.due_date,
    status: s.status,
    sort_order: s.sort_order,
  }));

  // Serialize payments for client
  const serializedPayments = paidPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    payment_method_type: p.payment_method_type,
    status: p.status,
    paid_at: p.paid_at,
  }));

  // Serialize contract acceptance
  const serializedContract = contractAcceptance
    ? {
        accepted_by_name: contractAcceptance.accepted_by_name,
        accepted_by_email: contractAcceptance.accepted_by_email,
        accepted_at: contractAcceptance.accepted_at,
        ip_address: contractAcceptance.ip_address,
      }
    : null;

  return (
    <>
      {/* Payment status banners rendered in the light theme */}
      {paymentStatus && (
        <div className="bg-[#FAFAF8]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
            {paymentStatus === "success" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-700">Payment received! Thank you.</span>
              </div>
            )}
            {paymentStatus === "canceled" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-amber-700">Payment was canceled. You can try again below.</span>
              </div>
            )}
          </div>
        </div>
      )}

      <PortalClient
        shareToken={token}
        companyName={companyName}
        companyEmail={settings?.email ?? null}
        companyPhone={settings?.phone ?? null}
        logoUrl={settings?.logo_url ?? null}
        proposalStatus={proposal.status}
        proposalCreatedAt={proposal.created_at}
        proposalViewedAt={proposal.viewed_at}
        proposalContractAcceptedAt={proposal.contract_accepted_at}
        proposalTitle={proposal.title || "Event Proposal"}
        proposalTerms={proposal.terms}
        clientMessages={proposal.client_messages ?? []}
        event={serializedEvent}
        pricing={pricing}
        schedules={serializedSchedules}
        paidPayments={serializedPayments}
        contractAcceptance={serializedContract}
        totalDue={totalDue}
        totalPaid={totalPaid}
        balanceDue={balanceDue}
        hasNewPaymentSystem={hasNewPaymentSystem}
      />
    </>
  );
}
