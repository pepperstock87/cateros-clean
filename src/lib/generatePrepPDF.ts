import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ConsolidatedIngredient, ConsolidatedEventSummary } from "@/lib/actions/production";

type PrepPDFInput = {
  ingredients: ConsolidatedIngredient[];
  dateRange: { start: string; end: string };
  events: ConsolidatedEventSummary[];
  title: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roundQty(n: number): string {
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(2);
}

export function generatePrepShoppingPDF({ ingredients, dateRange, events, title }: PrepPDFInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

  const DARK: [number, number, number] = [15, 13, 11];
  const LIGHT: [number, number, number] = [245, 237, 224];
  const MID: [number, number, number] = [156, 136, 118];
  const BRAND: [number, number, number] = [168, 132, 88];

  // Header bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 4, 80, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...LIGHT);
  doc.text(title, margin, 36);

  // Date range subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MID);
  doc.text(
    `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}  |  ${events.length} event${events.length !== 1 ? "s" : ""}`,
    margin,
    56
  );

  // Generated date
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, margin, 70);

  let y = 100;

  // Events summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text("Events Covered", margin, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Event", "Date", "Client", "Guests"]],
    body: events.map((ev) => [
      ev.eventName,
      formatDate(ev.eventDate),
      ev.clientName,
      String(ev.guestCount),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: DARK,
      textColor: LIGHT,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 244, 238],
    },
  });

  y = (doc as any).lastAutoTable.finalY + 24;

  // Group ingredients by category
  const groups: Record<string, ConsolidatedIngredient[]> = {};
  for (const ing of ingredients) {
    if (!groups[ing.category]) groups[ing.category] = [];
    groups[ing.category].push(ing);
  }
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

  for (const [category, items] of sortedGroups) {
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND);
    doc.text(category.toUpperCase(), margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Ingredient", "Needed", "Unit", "In Stock", "Shortfall", "Status"]],
      body: items.map((ing) => [
        ing.ingredientName,
        roundQty(ing.totalQuantity),
        ing.unit,
        roundQty(ing.inventoryAvailable),
        ing.shortfall > 0 ? roundQty(ing.shortfall) : "-",
        ing.status === "sufficient" ? "OK" : ing.status === "partial" ? "PARTIAL" : "ORDER",
      ]),
      theme: "grid",
      headStyles: {
        fillColor: DARK,
        textColor: LIGHT,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [248, 244, 238],
      },
      didParseCell(data: any) {
        // Color the status column
        if (data.section === "body" && data.column.index === 5) {
          const val = data.cell.raw;
          if (val === "ORDER") {
            data.cell.styles.textColor = [200, 60, 60];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "PARTIAL") {
            data.cell.styles.textColor = [180, 130, 30];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [40, 140, 80];
          }
        }
        // Color shortfall
        if (data.section === "body" && data.column.index === 4 && data.cell.raw !== "-") {
          data.cell.styles.textColor = [200, 60, 60];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Footer on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text(
      `Cateros Prep Breakdown  |  Page ${i} of ${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  // Save
  const filename = `prep-shopping-list-${dateRange.start}-to-${dateRange.end}.pdf`;
  doc.save(filename);
}
