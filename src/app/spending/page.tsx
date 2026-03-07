import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { startOfWeek, endOfWeek } from "date-fns";
import { SpendingClient } from "./SpendingClient";
import { RecurringCosts } from "@/components/spending/RecurringCosts";
import { InlineSuggestion } from "@/components/assistant/InlineSuggestion";

export type Receipt = {
  id: string;
  user_id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string | null;
  week_label: string | null;
  file_url: string | null;
  created_at: string;
};

export type DistributorInvoice = {
  id: string;
  user_id: string;
  distributor: string;
  invoice_date: string;
  invoice_number: string | null;
  total: number;
  status: "pending" | "paid" | "overdue";
  line_items: InvoiceLineItem[] | null;
  file_url: string | null;
  created_at: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export default async function SpendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  const { data: invoices } = await supabase
    .from("distributor_invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("invoice_date", { ascending: false });

  const [eventsRes, recurringRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, name")
      .eq("user_id", user.id)
      .in("status", ["draft", "proposed", "confirmed"])
      .order("event_date", { ascending: false }),
    supabase
      .from("recurring_costs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const events = eventsRes.data;

  const allReceipts: Receipt[] = receipts ?? [];
  const allInvoices: DistributorInvoice[] = invoices ?? [];
  const activeEvents = events ?? [];
  const recurringCosts = recurringRes.data ?? [];

  // Weekly spend summary
  const weeklyReceiptSpend = allReceipts
    .filter(r => r.date >= weekStart && r.date <= weekEnd)
    .reduce((sum, r) => sum + r.amount, 0);

  const weeklyInvoiceSpend = allInvoices
    .filter(inv => inv.invoice_date >= weekStart && inv.invoice_date <= weekEnd)
    .reduce((sum, inv) => sum + inv.total, 0);

  const weeklyTotal = weeklyReceiptSpend + weeklyInvoiceSpend;

  const totalReceiptsAllTime = allReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalInvoicesAllTime = allInvoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Spending</h1>
          <p className="text-xs md:text-sm text-[#9c8876] mt-1">Track receipts and distributor invoices</p>
        </div>
        <InlineSuggestion prompt="Analyze my recent spending. Break down my costs by category and tell me where I might be overspending." label="Explain my costs" />
      </div>

      {/* Weekly Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="stat-card">
          <span className="stat-label">This Week</span>
          <div className="stat-value text-lg md:text-2xl">{formatCurrency(weeklyTotal)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Weekly Receipts</span>
          <div className="stat-value text-lg md:text-2xl">{formatCurrency(weeklyReceiptSpend)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Weekly Invoices</span>
          <div className="stat-value text-lg md:text-2xl">{formatCurrency(weeklyInvoiceSpend)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">All-Time Total</span>
          <div className="stat-value text-lg md:text-2xl">{formatCurrency(totalReceiptsAllTime + totalInvoicesAllTime)}</div>
        </div>
      </div>

      {/* Recurring Costs */}
      <div className="mb-6 md:mb-8">
        <RecurringCosts costs={recurringCosts} />
      </div>

      {/* Client Component for Tabs + Upload + Tables */}
      <SpendingClient receipts={allReceipts} invoices={allInvoices} events={activeEvents} />
    </div>
  );
}
