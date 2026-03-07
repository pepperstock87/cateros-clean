import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Event, PricingData, Recipe } from "@/types";

export function generateKitchenPrepPDF(
  event: Event,
  recipes: Recipe[],
  companyName: string
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  const p = event.pricing_data as PricingData | null;

  const DARK: [number, number, number] = [15, 13, 11];
  const CARD: [number, number, number] = [26, 23, 20];
  const BORDER: [number, number, number] = [46, 39, 31];
  const TEXT: [number, number, number] = [245, 237, 224];
  const MUTED: [number, number, number] = [156, 136, 118];
  const GOLD: [number, number, number] = [212, 128, 31];
  const HEAD_BG: [number, number, number] = [36, 30, 24];
  const ALT_ROW: [number, number, number] = [22, 18, 14];
  const GREEN: [number, number, number] = [76, 140, 74];

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

  function checkPageBreak(yPos: number, needed: number = 80): number {
    if (yPos + needed > pageH - 50) {
      doc.addPage();
      return margin;
    }
    return yPos;
  }

  // ── Header ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 4, 80, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(companyName.toUpperCase(), margin, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT);
  doc.text("KITCHEN PREP LIST", margin, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(event.name, margin, 68);
  doc.text(`Generated ${format(new Date(), "MMMM d, yyyy")}`, pageW - margin, 52, { align: "right" });

  let y = 100;

  // ── Event Summary ──
  doc.setFillColor(...CARD);
  doc.roundedRect(margin, y, contentW, 56, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEXT);
  doc.text(event.name, margin + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const eventDate = format(new Date(event.event_date), "EEEE, MMMM d, yyyy");
  const timeStr = event.start_time ? formatTime(event.start_time) : "TBD";
  doc.text(`${eventDate}  |  Service: ${timeStr}  |  ${event.guest_count} guests`, margin + 14, y + 42);
  y += 76;

  // ── Prep Timeline ──
  if (event.start_time) {
    y = checkPageBreak(y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text("PREP TIMELINE", margin, y);
    y += 14;

    const [h, m] = event.start_time.split(":").map(Number);
    const serviceMinutes = h * 60 + m;

    const milestones: [number, string][] = [
      [4 * 60, "Begin prep - stocks, marinades, slow-cook items"],
      [3 * 60, "Butchery, vegetable prep, mise en place"],
      [2 * 60, "Sauces, dressings, cold items plated"],
      [1 * 60, "Final cooking, hot items fired"],
      [30, "Plating check, garnishes, final quality review"],
      [0, "Service begins"],
    ];

    for (const [offsetMins, label] of milestones) {
      const totalMins = serviceMinutes - offsetMins;
      if (totalMins < 0) continue;
      const tH = Math.floor(totalMins / 60);
      const tM = totalMins % 60;
      const ampm = tH >= 12 ? "PM" : "AM";
      const displayH = tH > 12 ? tH - 12 : tH === 0 ? 12 : tH;
      const timeLabel = `${displayH}:${String(tM).padStart(2, "0")} ${ampm}`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT);
      doc.text(timeLabel, margin + 4, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(label, margin + 70, y);
      y += 14;
    }
    y += 10;
  }

  // ── Recipe Sections ──
  const matchedRecipes: { recipe: Recipe; servingsNeeded: number }[] = [];
  if (p?.menuItems) {
    for (const menuItem of p.menuItems) {
      const recipe = recipes.find((r) => r.name === menuItem.name);
      if (recipe) {
        matchedRecipes.push({ recipe, servingsNeeded: menuItem.quantity });
      }
    }
  }

  if (matchedRecipes.length > 0) {
    for (const { recipe, servingsNeeded } of matchedRecipes) {
      y = checkPageBreak(y, 100);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...GOLD);
      doc.text(recipe.name.toUpperCase(), margin, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const multiplier = servingsNeeded / (recipe.servings || 1);
      doc.text(
        `Recipe yields ${recipe.servings} servings  |  Need ${servingsNeeded} servings  |  Scale: ${multiplier.toFixed(1)}x`,
        margin,
        y + 10
      );
      y += 18;

      if (recipe.ingredients?.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Ingredient", "Recipe Qty", "Scaled Qty", "Unit"]],
          body: recipe.ingredients.map((ing) => {
            const scaled = ing.quantity * multiplier;
            return [
              ing.name,
              String(Math.ceil(ing.quantity * 10) / 10),
              String(Math.ceil(scaled * 10) / 10),
              ing.unit,
            ];
          }),
          styles: { ...tableStyles },
          headStyles,
          alternateRowStyles: altRowStyles,
          columnStyles: {
            1: { cellWidth: 80, halign: "right" },
            2: { cellWidth: 80, halign: "right" },
            3: { cellWidth: 60, halign: "center" },
          },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }
    }
  } else {
    y = checkPageBreak(y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("No recipes matched to menu items. Add recipes with matching names.", margin, y);
    y += 20;
  }

  // ── Allergen Notes ──
  y = checkPageBreak(y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text("ALLERGEN NOTES", margin, y);
  y += 14;

  doc.setFillColor(...CARD);
  doc.roundedRect(margin, y, contentW, 50, 4, 4, "F");
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentW, 50, 4, 4, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Check all dishes for common allergens: nuts, dairy, gluten, shellfish, soy, eggs.", margin + 14, y + 18);
  doc.text("Confirm dietary requirements with client before service.", margin + 14, y + 34);
  y += 70;

  // ── Notes ──
  if (event.notes) {
    y = checkPageBreak(y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text("EVENT NOTES", margin, y);
    y += 14;
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
    doc.text(`${companyName} · Kitchen Prep List · Generated by Cateros`, margin, pageH - 24);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 24, { align: "right" });
  }

  return doc;
}
