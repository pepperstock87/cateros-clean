import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Event, PricingData } from "@/types";

const DARK: [number, number, number] = [15, 13, 11];
const CARD: [number, number, number] = [26, 23, 20];
const LIGHT: [number, number, number] = [245, 237, 224];
const MUTED: [number, number, number] = [156, 136, 118];
const HEADER_BG: [number, number, number] = [46, 39, 31];

function addReportHeader(doc: jsPDF, title: string, companyName: string) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 80, "F");

  doc.setFontSize(20);
  doc.setTextColor(...LIGHT);
  doc.text(companyName, 40, 35);

  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text(title, 40, 55);

  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy")}`, 40, 70);

  return 95;
}

export function generateEventsSummaryPDF(events: Event[], companyName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const startY = addReportHeader(doc, "Events Summary", companyName);

  const rows = events.map((event) => {
    const p = event.pricing_data as PricingData | null;
    return [
      event.name,
      event.client_name,
      format(new Date(event.event_date), "MMM d, yyyy"),
      String(event.guest_count),
      event.status.charAt(0).toUpperCase() + event.status.slice(1),
      p ? formatCurrency(p.suggestedPrice) : "—",
    ];
  });

  autoTable(doc, {
    startY,
    head: [["Event Name", "Client", "Date", "Guests", "Status", "Revenue"]],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 8,
      textColor: LIGHT,
      lineColor: HEADER_BG,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: LIGHT,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fillColor: CARD,
    },
    alternateRowStyles: {
      fillColor: DARK,
    },
    margin: { left: 40, right: 40 },
  });

  // Total row
  const totalRevenue = events.reduce((sum, e) => {
    const p = e.pricing_data as PricingData | null;
    return sum + (p?.suggestedPrice ?? 0);
  }, 0);

  const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 40;

  doc.setFontSize(10);
  doc.setTextColor(...LIGHT);
  doc.text(`Total Events: ${events.length}`, 40, finalY + 25);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 40, finalY + 42);

  doc.save("events-summary.pdf");
}

export type FinancialRow = {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
};

export function generateFinancialSummaryPDF(data: FinancialRow[], companyName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const startY = addReportHeader(doc, "Financial Summary", companyName);

  const rows = data.map((row) => [
    row.month,
    formatCurrency(row.revenue),
    formatCurrency(row.costs),
    formatCurrency(row.profit),
  ]);

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalCosts = data.reduce((s, r) => s + r.costs, 0);
  const totalProfit = data.reduce((s, r) => s + r.profit, 0);

  rows.push([
    "TOTAL",
    formatCurrency(totalRevenue),
    formatCurrency(totalCosts),
    formatCurrency(totalProfit),
  ]);

  autoTable(doc, {
    startY,
    head: [["Month", "Revenue", "Costs", "Profit"]],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 8,
      textColor: LIGHT,
      lineColor: HEADER_BG,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: LIGHT,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fillColor: CARD,
    },
    alternateRowStyles: {
      fillColor: DARK,
    },
    margin: { left: 40, right: 40 },
    didParseCell: (hookData) => {
      // Bold the total row
      if (hookData.row.index === rows.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = HEADER_BG;
      }
    },
  });

  doc.save("financial-summary.pdf");
}
