import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Event, PricingData, Recipe, StaffAssignment } from "@/types";

type ShoppingItem = { name: string; totalNeeded: number; unit: string };

export function generateBEOPDF(
  event: Event,
  companyName: string,
  staffAssignments: StaffAssignment[],
  pricingData: PricingData | null,
  recipes: Recipe[]
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  const DARK: [number, number, number] = [15, 13, 11];
  const CARD: [number, number, number] = [26, 23, 20];
  const BORDER: [number, number, number] = [46, 39, 31];
  const TEXT: [number, number, number] = [245, 237, 224];
  const MUTED: [number, number, number] = [156, 136, 118];
  const GOLD: [number, number, number] = [212, 128, 31];
  const HEAD_BG: [number, number, number] = [36, 30, 24];
  const ALT_ROW: [number, number, number] = [22, 18, 14];

  const tableStyles = {
    fontSize: 9,
    cellPadding: 6,
    textColor: TEXT,
    fillColor: CARD,
    lineColor: BORDER,
    lineWidth: 0.3,
  };
  const headStyles = {
    fillColor: HEAD_BG,
    textColor: MUTED,
    fontStyle: "bold" as const,
    fontSize: 8,
  };
  const altRowStyles = { fillColor: ALT_ROW };

  function formatTime(time: string | null): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  function sectionTitle(title: string, yPos: number): number {
    if (yPos > 660) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text(title, margin, yPos);
    return yPos + 8;
  }

  // ── Header ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 4, 80, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(companyName.toUpperCase(), margin, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT);
  doc.text("PRODUCTION SHEET", margin, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(event.name, margin, 68);
  doc.text(`Generated ${format(new Date(), "MMMM d, yyyy")}`, pageW - margin, 52, { align: "right" });

  let y = 100;

  // ── Event Details ──
  y = sectionTitle("EVENT DETAILS", y);
  const timeStr =
    event.start_time && event.end_time
      ? `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
      : event.start_time
        ? formatTime(event.start_time)
        : "TBD";

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Field", "Details"]],
    body: [
      ["Event Name", event.name],
      ["Client", event.client_name],
      ["Date", format(new Date(event.event_date), "EEEE, MMMM d, yyyy")],
      ["Time", timeStr],
      ["Guests", String(event.guest_count)],
      ["Venue", event.venue ?? "TBD"],
      ["Status", event.status.charAt(0).toUpperCase() + event.status.slice(1)],
    ],
    styles: { ...tableStyles },
    headStyles,
    alternateRowStyles: altRowStyles,
    columnStyles: { 0: { cellWidth: 100, fontStyle: "bold" } },
    showHead: false,
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // ── Staff Roster ──
  if (staffAssignments.length > 0) {
    y = sectionTitle("STAFF ROSTER", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Name", "Role", "Start", "End", "Confirmed"]],
      body: staffAssignments.map((a) => [
        a.staff_member?.name ?? "—",
        a.role ?? a.staff_member?.role ?? "—",
        a.start_time ? formatTime(a.start_time) : "—",
        a.end_time ? formatTime(a.end_time) : "—",
        a.confirmed ? "Yes" : "No",
      ]),
      styles: { ...tableStyles },
      headStyles,
      alternateRowStyles: altRowStyles,
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ── Menu Items ──
  if (pricingData?.menuItems?.length) {
    y = sectionTitle("MENU ITEMS", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Item", "Quantity", "Cost/Unit"]],
      body: pricingData.menuItems.map((item) => [
        item.name,
        String(item.quantity),
        formatCurrency(item.costPerPerson),
      ]),
      styles: { ...tableStyles },
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        1: { cellWidth: 70, halign: "right" },
        2: { cellWidth: 80, halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ── Shopping List (aggregated from recipes) ──
  const shoppingMap = new Map<string, ShoppingItem>();
  if (pricingData?.menuItems) {
    for (const menuItem of pricingData.menuItems) {
      const recipe = recipes.find((r) => r.name === menuItem.name);
      if (recipe?.ingredients) {
        const multiplier = menuItem.quantity / (recipe.servings || 1);
        for (const ing of recipe.ingredients) {
          const key = `${ing.name}-${ing.unit}`;
          const existing = shoppingMap.get(key);
          const needed = ing.quantity * multiplier;
          if (existing) {
            existing.totalNeeded += needed;
          } else {
            shoppingMap.set(key, { name: ing.name, unit: ing.unit, totalNeeded: needed });
          }
        }
      }
    }
  }
  const shoppingList = Array.from(shoppingMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  if (shoppingList.length > 0) {
    y = sectionTitle("SHOPPING LIST", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Ingredient", "Quantity", "Unit"]],
      body: shoppingList.map((item) => [
        item.name,
        String(Math.ceil(item.totalNeeded * 10) / 10),
        item.unit,
      ]),
      styles: { ...tableStyles },
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: {
        1: { cellWidth: 80, halign: "right" },
        2: { cellWidth: 70, halign: "center" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ── Equipment / Rentals ──
  if (pricingData?.rentals?.length) {
    y = sectionTitle("EQUIPMENT / RENTALS", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Item", "Quantity"]],
      body: pricingData.rentals.map((r) => [r.item, String(r.quantity)]),
      styles: { ...tableStyles },
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: { 1: { cellWidth: 80, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ── Cost Summary ──
  if (pricingData) {
    y = sectionTitle("COST SUMMARY", y);
    const summaryRows: string[][] = [
      ["Food & Menu", formatCurrency(pricingData.foodCostTotal)],
      ["Staffing", formatCurrency(pricingData.staffingTotal)],
      ["Rentals & Equipment", formatCurrency(pricingData.rentalsTotal)],
    ];
    if (pricingData.barPackage) {
      summaryRows.push([`Bar (${pricingData.barPackage.label})`, formatCurrency(pricingData.barTotal)]);
    }
    summaryRows.push(
      [`Admin Fee (${pricingData.adminPercent}%)`, formatCurrency(pricingData.adminFee)],
      [`Tax (${pricingData.taxPercent}%)`, formatCurrency(pricingData.taxAmount)]
    );

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: summaryRows,
      foot: [["TOTAL", formatCurrency(pricingData.totalCost)]],
      styles: { ...tableStyles, fontSize: 10, cellPadding: 7 },
      footStyles: {
        fillColor: GOLD,
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: "bold",
        fontSize: 11,
      },
      columnStyles: { 1: { cellWidth: 120, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // ── Notes ──
  if (event.notes) {
    y = sectionTitle("NOTES", y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const noteLines = doc.splitTextToSize(event.notes, contentW);
    doc.text(noteLines, margin, y);
  }

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${companyName} · Production Sheet · Generated by Cateros`, margin, pageH - 24);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 24, { align: "right" });
  }

  return doc;
}
