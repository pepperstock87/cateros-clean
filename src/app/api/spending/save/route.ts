import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, format } from "date-fns";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === "receipt") {
      const { vendor, date, amount, category, event_id } = data;

      if (!vendor || !date || amount == null) {
        return NextResponse.json({ error: "Missing required receipt fields" }, { status: 400 });
      }

      // Generate week label like "Mar 3 - Mar 9"
      const receiptDate = new Date(date);
      const wStart = startOfWeek(receiptDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(receiptDate, { weekStartsOn: 1 });
      const weekLabel = `${format(wStart, "MMM d")} - ${format(wEnd, "MMM d")}`;

      const { error: insertError } = await supabase.from("receipts").insert({
        user_id: user.id,
        vendor,
        date,
        amount,
        category: category || null,
        week_label: weekLabel,
        event_id: event_id || null,
      });

      if (insertError) {
        return NextResponse.json({ error: "Failed to save receipt" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (type === "invoice") {
      const { distributor, invoice_date, invoice_number, total, line_items } = data;

      if (!distributor || !invoice_date || total == null) {
        return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
      }

      const { error: insertError } = await supabase.from("distributor_invoices").insert({
        user_id: user.id,
        distributor,
        invoice_date,
        invoice_number: invoice_number || null,
        total,
        status: "pending",
        line_items: line_items || null,
      });

      if (insertError) {
        return NextResponse.json({ error: "Failed to save invoice" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type. Use 'receipt' or 'invoice'." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
