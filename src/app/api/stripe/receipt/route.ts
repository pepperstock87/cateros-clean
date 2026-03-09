import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json(
      { error: "Missing paymentId parameter" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getCurrentOrg();

  // Fetch payment record — scope to user's events
  let paymentQuery = supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId);
  if (org?.orgId) paymentQuery = paymentQuery.eq("organization_id", org.orgId);
  const { data: payment, error: paymentError } = await paymentQuery.single();

  if (paymentError || !payment) {
    return NextResponse.json(
      { error: "Payment not found" },
      { status: 404 }
    );
  }

  // Verify user owns the event
  const { data: event } = await supabase
    .from("events")
    .select("name, user_id")
    .eq("id", payment.event_id)
    .single();

  if (!event || event.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch user profile for company branding
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", user.id)
    .single();

  const companyName = profile?.company_name || "Cateros";
  const receiptNumber = payment.id.substring(0, 8).toUpperCase();
  const paidAt = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";
  const eventName = event?.name || "Unknown Event";
  const amount =
    typeof payment.amount === "number"
      ? `$${Number(payment.amount).toFixed(2)}`
      : "N/A";
  const paymentMethod = payment.payment_method_type || "N/A";
  const status = payment.status || "N/A";

  // Generate PDF
  const doc = new jsPDF();
  let y = 30;

  // Title
  doc.setFontSize(22);
  doc.text("Payment Receipt", 105, y, { align: "center" });
  y += 12;

  // Company name
  doc.setFontSize(12);
  doc.text(companyName, 105, y, { align: "center" });
  y += 20;

  // Divider line
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 15;

  // Receipt details
  doc.setFontSize(11);

  const fields = [
    ["Receipt #", receiptNumber],
    ["Date", paidAt],
    ["Event", eventName],
    ["Amount Paid", amount],
    ["Payment Method", paymentMethod],
    ["Status", status],
  ];

  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 30, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 80, y);
    y += 10;
  }

  // Footer divider
  y += 10;
  doc.line(20, y, 190, y);
  y += 10;

  doc.setFontSize(9);
  doc.text("Thank you for your payment.", 105, y, { align: "center" });

  // Return PDF as response
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${receiptNumber}.pdf"`,
    },
  });
}
