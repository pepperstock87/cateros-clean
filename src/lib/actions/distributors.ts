"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";
import { domainEvents, registerDomainEventHandlers } from "@/lib/events";
import type {
  Distributor,
  DistributorProduct,
  DistributorOrder,
  DistributorOrderLine,
  DistributorInvoice,
  DistributorInvoiceLine,
  DistributorCredit,
  ConnectorType,
  DistributorTransport,
  OrderStatus,
} from "@/lib/distributors/types";

registerDomainEventHandlers();

// ─── Distributors CRUD ───

export async function getDistributors(): Promise<Distributor[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();
  let q = supabase.from("distributors").select("*").eq("user_id", user.id).eq("is_active", true);
  if (org?.orgId) q = q.eq("organization_id", org.orgId);

  const { data, error } = await q.order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Distributor[];
}

export async function getDistributor(id: string): Promise<Distributor | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data as Distributor;
}

export async function createDistributor(formData: {
  name: string;
  connector_type: ConnectorType;
  transport: DistributorTransport;
  account_number?: string;
  rep_name?: string;
  rep_email?: string;
  rep_phone?: string;
  default_delivery_address?: string;
  config?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();

  const { data, error } = await supabase
    .from("distributors")
    .insert({
      organization_id: org?.orgId || null,
      user_id: user.id,
      name: formData.name,
      connector_type: formData.connector_type,
      transport: formData.transport,
      account_number: formData.account_number || null,
      rep_name: formData.rep_name || null,
      rep_email: formData.rep_email || null,
      rep_phone: formData.rep_phone || null,
      default_delivery_address: formData.default_delivery_address || null,
      config: formData.config || {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/distributors");
  return { id: data.id };
}

export async function updateDistributor(
  id: string,
  updates: Partial<{
    name: string;
    connector_type: ConnectorType;
    transport: DistributorTransport;
    account_number: string | null;
    rep_name: string | null;
    rep_email: string | null;
    rep_phone: string | null;
    default_delivery_address: string | null;
    config: Record<string, unknown>;
    is_active: boolean;
  }>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("distributors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/distributors");
}

export async function deleteDistributor(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Soft delete
  const { error } = await supabase
    .from("distributors")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/distributors");
}

// ─── Distributor Products ───

export async function getDistributorProducts(distributorId: string): Promise<DistributorProduct[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify distributor ownership
  const dist = await getDistributor(distributorId);
  if (!dist) throw new Error("Distributor not found");

  const { data, error } = await supabase
    .from("distributor_products")
    .select("*")
    .eq("distributor_id", distributorId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorProduct[];
}

export async function searchDistributorProducts(params: {
  distributorId?: string;
  query?: string;
  category?: string;
  limit?: number;
}): Promise<DistributorProduct[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let q = supabase
    .from("distributor_products")
    .select("*, distributors!inner(user_id)")
    .eq("distributors.user_id", user.id)
    .eq("is_active", true);

  if (params.distributorId) q = q.eq("distributor_id", params.distributorId);
  if (params.query) q = q.or(`name.ilike.%${params.query}%,sku.ilike.%${params.query}%,brand.ilike.%${params.query}%`);
  if (params.category) q = q.ilike("category", `%${params.category}%`);

  const { data, error } = await q.order("name").limit(params.limit ?? 50);
  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorProduct[];
}

// ─── Purchase Orders ───

export async function getDistributorOrders(params?: {
  distributorId?: string;
  status?: OrderStatus;
}): Promise<DistributorOrder[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();
  let q = supabase.from("distributor_orders").select("*").eq("user_id", user.id);
  if (org?.orgId) q = q.eq("organization_id", org.orgId);
  if (params?.distributorId) q = q.eq("distributor_id", params.distributorId);
  if (params?.status) q = q.eq("status", params.status);

  const { data, error } = await q.order("order_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorOrder[];
}

export async function createDistributorOrder(formData: {
  distributor_id: string;
  requested_delivery_date?: string;
  delivery_address?: string;
  notes?: string;
  event_ids?: string[];
  lines: Array<{
    distributor_product_id?: string;
    sku: string;
    product_name: string;
    quantity_ordered: number;
    unit?: string;
    unit_price: number;
  }>;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();

  // Calculate totals
  const subtotal = formData.lines.reduce(
    (sum, l) => sum + l.quantity_ordered * l.unit_price,
    0
  );

  const { data: order, error: orderError } = await supabase
    .from("distributor_orders")
    .insert({
      organization_id: org?.orgId || null,
      user_id: user.id,
      distributor_id: formData.distributor_id,
      status: "draft",
      order_date: new Date().toISOString().split("T")[0],
      requested_delivery_date: formData.requested_delivery_date || null,
      delivery_address: formData.delivery_address || null,
      notes: formData.notes || null,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: 0,
      total: Math.round(subtotal * 100) / 100,
      event_ids: formData.event_ids || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderError) throw new Error(orderError.message);

  // Insert order lines
  const lines = formData.lines.map((l) => ({
    order_id: order.id,
    distributor_product_id: l.distributor_product_id || null,
    sku: l.sku,
    product_name: l.product_name,
    quantity_ordered: l.quantity_ordered,
    unit: l.unit || null,
    unit_price: l.unit_price,
    extended_price: Math.round(l.quantity_ordered * l.unit_price * 100) / 100,
  }));

  const { error: lineError } = await supabase
    .from("distributor_order_lines")
    .insert(lines);

  if (lineError) throw new Error(lineError.message);

  revalidatePath("/distributors");
  return { id: order.id };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: order } = await supabase
    .from("distributor_orders")
    .select("status, distributor_id")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) throw new Error("Order not found");
  const fromStatus = order.status;

  const { error } = await supabase
    .from("distributor_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  await domainEvents.emit(
    "distributor.order.status_changed",
    {
      distributorId: order.distributor_id,
      orgId: null,
      userId: user.id,
      orderId,
      fromStatus,
      toStatus: status,
    },
    "actions/distributors"
  );

  revalidatePath("/distributors");
}

export async function getOrderLines(orderId: string): Promise<DistributorOrderLine[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("distributor_order_lines")
    .select("*, distributor_orders!inner(user_id)")
    .eq("order_id", orderId)
    .eq("distributor_orders.user_id", user.id);

  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorOrderLine[];
}

// ─── Invoices ───

export async function getDistributorInvoices(params?: {
  distributorId?: string;
  status?: string;
}): Promise<DistributorInvoice[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();
  let q = supabase.from("distributor_invoices").select("*").eq("user_id", user.id);
  if (org?.orgId) q = q.eq("organization_id", org.orgId);
  if (params?.distributorId) q = q.eq("distributor_id", params.distributorId);
  if (params?.status) q = q.eq("status", params.status);

  const { data, error } = await q.order("invoice_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorInvoice[];
}

export async function getInvoiceLines(invoiceId: string): Promise<DistributorInvoiceLine[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("distributor_invoice_lines")
    .select("*, distributor_invoices!inner(user_id)")
    .eq("invoice_id", invoiceId)
    .eq("distributor_invoices.user_id", user.id);

  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorInvoiceLine[];
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "pending" | "approved" | "paid" | "disputed"
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("distributor_invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/distributors");
}

// ─── Credits ───

export async function getDistributorCredits(distributorId?: string): Promise<DistributorCredit[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let q = supabase.from("distributor_credits").select("*").eq("user_id", user.id);
  if (distributorId) q = q.eq("distributor_id", distributorId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DistributorCredit[];
}

export async function createCredit(formData: {
  distributor_id: string;
  invoice_id?: string;
  credit_number?: string;
  amount: number;
  reason?: string;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const org = await getCurrentOrg();

  const { data, error } = await supabase
    .from("distributor_credits")
    .insert({
      organization_id: org?.orgId || null,
      user_id: user.id,
      distributor_id: formData.distributor_id,
      invoice_id: formData.invoice_id || null,
      credit_number: formData.credit_number || null,
      amount: formData.amount,
      reason: formData.reason || null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await domainEvents.emit(
    "vendor.credit.received",
    {
      distributorId: formData.distributor_id,
      orgId: org?.orgId || null,
      userId: user.id,
      creditId: data.id,
      amount: formData.amount,
      reason: formData.reason || null,
    },
    "actions/distributors"
  );

  revalidatePath("/distributors");
  return { id: data.id };
}
