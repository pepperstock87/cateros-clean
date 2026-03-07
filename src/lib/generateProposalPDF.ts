import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import type { Event, PricingData, BusinessSettings } from "@/types";
import { format } from "date-fns";

export async function generateProposalPDF(
  event: Event,
  companyName: string,
  customMessage?: string,
  terms?: string,
  businessSettings?: BusinessSettings | null,
  isPro: boolean = false
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const p = event.pricing_data as PricingData;
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 56;
  const contentW = pageW - margin * 2;

  const DARK: [number,number,number] = [15, 13, 11];
  const LIGHT: [number,number,number] = [245, 237, 224];
  const MID: [number,number,number] = [156, 136, 118];
  const CARD: [number,number,number] = [28, 24, 20];

  // Determine template (Pro feature)
  const template = isPro && businessSettings?.proposal_template === "modern" ? "modern" : "simple";
  const useCustomBranding = isPro && businessSettings ? businessSettings : null;

  // Parse brand color (hex to RGB), default to gold
  const GOLD: [number,number,number] = parseBrandColor(useCustomBranding?.brand_color);

  // Header
  const headerHeight = useCustomBranding?.logo_url ? 130 : 110;
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, headerHeight, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 5, headerHeight, "F");

  let headerY = 44;

  // Logo (Pro only)
  if (useCustomBranding?.logo_url) {
    try {
      const img = await loadImage(useCustomBranding.logo_url);
      const logoHeight = 40;
      const logoWidth = (img.width / img.height) * logoHeight;
      doc.addImage(img, 'PNG', margin, 20, logoWidth, logoHeight);
      headerY = 70;
    } catch (e) {
      // Logo failed to load, continue without it
    }
  }

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(template === "modern" ? 24 : 22);
  doc.setTextColor(...LIGHT);
  const displayName = useCustomBranding?.business_name || companyName;
  doc.text(displayName, margin, headerY);

  // Contact info (Pro only)
  if (useCustomBranding && (useCustomBranding.phone || useCustomBranding.email)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MID);
    let contactY = headerY + 14;
    if (useCustomBranding.phone) {
      doc.text(useCustomBranding.phone, margin, contactY);
      contactY += 12;
    }
    if (useCustomBranding.email) {
      doc.text(useCustomBranding.email, margin, contactY);
      contactY += 12;
    }
    if (useCustomBranding.address) {
      const addressLines = doc.splitTextToSize(useCustomBranding.address, 200);
      doc.text(addressLines, margin, contactY);
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MID);
  doc.text("CATERING PROPOSAL", margin, useCustomBranding ? headerHeight - 34 : 62);

  const metaRight = pageW - margin;
  doc.setFontSize(9);
  const metaY = useCustomBranding ? headerHeight - 62 : 38;
  doc.text(`Date: ${format(new Date(), "MMMM d, yyyy")}`, metaRight, metaY, { align: "right" });
  doc.text(`Proposal #: CAT-${Date.now().toString().slice(-6)}`, metaRight, metaY + 14, { align: "right" });
  doc.text("Valid for: 30 days", metaRight, metaY + 28, { align: "right" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, headerHeight - 20, pageW - margin, headerHeight - 20);

  let y = headerHeight + 20;

  // Event box
  const cardPadding = template === "modern" ? 20 : 16;
  const cardHeight = template === "modern" ? 90 : 80;
  
  doc.setFillColor(...CARD);
  doc.roundedRect(margin, y, contentW, cardHeight, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(template === "modern" ? 16 : 14);
  doc.setTextColor(...LIGHT);
  doc.text(event.name, margin + cardPadding, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(template === "modern" ? 10 : 9);
  doc.setTextColor(...MID);
  const col2x = margin + contentW / 2;
  doc.text(`Client: ${event.client_name}`, margin + cardPadding, y + 42);
  doc.text(`Date: ${format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}`, margin + cardPadding, y + 56);
  doc.text(`Guests: ${event.guest_count}`, col2x, y + 42);
  if (event.venue) doc.text(`Venue: ${event.venue}`, col2x, y + 56);
  if (event.client_email && template === "modern") doc.text(`Email: ${event.client_email}`, margin + cardPadding, y + 70);
  y += cardHeight + (template === "modern" ? 30 : 20);

  if (customMessage) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(template === "modern" ? 11 : 10);
    doc.setTextColor(...MID);
    const lines = doc.splitTextToSize(customMessage, contentW);
    doc.text(lines, margin, y);
    y += lines.length * (template === "modern" ? 16 : 14) + 20;
  }

  // Menu table
  if (p?.menuItems?.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(template === "modern" ? 12 : 11);
    doc.setTextColor(...GOLD);
    doc.text("MENU", margin, y);
    y += template === "modern" ? 8 : 6;
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [["Item", "Qty", "Cost/Person", "Subtotal"]],
      body: p.menuItems.map(item => [item.name, item.quantity, formatCurrency(item.costPerPerson), formatCurrency(item.costPerPerson * item.quantity)]),
      styles: { fontSize: template === "modern" ? 10 : 9, cellPadding: template === "modern" ? 8 : 6, textColor: [245,237,224] as [number,number,number], fillColor: [28,24,20] as [number,number,number], lineColor: [46,39,31] as [number,number,number], lineWidth: 0.3 },
      headStyles: { fillColor: [30,25,18] as [number,number,number], textColor: [156,136,118] as [number,number,number], fontStyle: "bold", fontSize: template === "modern" ? 9 : 8 },
      alternateRowStyles: { fillColor: [22,18,14] as [number,number,number] },
      columnStyles: { 1: { cellWidth: 50, halign: "right" }, 2: { cellWidth: 80, halign: "right" }, 3: { cellWidth: 80, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + (template === "modern" ? 25 : 20);
  }

  // Staffing
  if (p?.staffing?.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(template === "modern" ? 12 : 11);
    doc.setTextColor(...GOLD);
    doc.text("STAFFING", margin, y);
    y += template === "modern" ? 8 : 6;
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [["Role", "Staff", "Hours", "Rate", "Total"]],
      body: p.staffing.map(s => [s.role, s.headcount, s.hours, `${formatCurrency(s.hourlyRate)}/hr`, formatCurrency(s.hourlyRate * s.hours * s.headcount)]),
      styles: { fontSize: template === "modern" ? 10 : 9, cellPadding: template === "modern" ? 8 : 6, textColor: [245,237,224] as [number,number,number], fillColor: [28,24,20] as [number,number,number], lineColor: [46,39,31] as [number,number,number], lineWidth: 0.3 },
      headStyles: { fillColor: [30,25,18] as [number,number,number], textColor: [156,136,118] as [number,number,number], fontStyle: "bold", fontSize: template === "modern" ? 9 : 8 },
      alternateRowStyles: { fillColor: [22,18,14] as [number,number,number] },
    });
    y = (doc as any).lastAutoTable.finalY + (template === "modern" ? 25 : 20);
  }

  // Rentals
  if (p?.rentals?.length > 0) {
    if (y > 620) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(template === "modern" ? 12 : 11);
    doc.setTextColor(...GOLD);
    doc.text("RENTALS & EQUIPMENT", margin, y);
    y += template === "modern" ? 8 : 6;
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [["Item", "Qty", "Unit Cost", "Total"]],
      body: p.rentals.map(r => [r.item, r.quantity, formatCurrency(r.unitCost), formatCurrency(r.unitCost * r.quantity)]),
      styles: { fontSize: template === "modern" ? 10 : 9, cellPadding: template === "modern" ? 8 : 6, textColor: [245,237,224] as [number,number,number], fillColor: [28,24,20] as [number,number,number], lineColor: [46,39,31] as [number,number,number], lineWidth: 0.3 },
      headStyles: { fillColor: [30,25,18] as [number,number,number], textColor: [156,136,118] as [number,number,number], fontStyle: "bold", fontSize: template === "modern" ? 9 : 8 },
      alternateRowStyles: { fillColor: [22,18,14] as [number,number,number] },
      columnStyles: { 1: { cellWidth: 50, halign: "right" }, 2: { cellWidth: 80, halign: "right" }, 3: { cellWidth: 80, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + (template === "modern" ? 25 : 20);
  }

  if (y > 620) { doc.addPage(); y = 56; }

  // Pricing summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(template === "modern" ? 12 : 11);
  doc.setTextColor(...GOLD);
  doc.text("PRICING SUMMARY", margin, y);
  y += template === "modern" ? 14 : 12;

  const summaryRows: string[][] = [
    ["Food & Menu", formatCurrency(p.foodCostTotal)],
    ["Staffing", formatCurrency(p.staffingTotal)],
    ["Rentals & Equipment", formatCurrency(p.rentalsTotal)],
  ];
  if (p.barPackage) summaryRows.push([`Bar (${p.barPackage.label})`, formatCurrency(p.barTotal)]);
  summaryRows.push(
    ["Subtotal", formatCurrency(p.subtotal)],
    [`Admin / Service Fee (${p.adminPercent}%)`, formatCurrency(p.adminFee)],
    [`Tax (${p.taxPercent}%)`, formatCurrency(p.taxAmount)],
  );

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    body: summaryRows,
    foot: [["TOTAL INVESTMENT", formatCurrency(p.suggestedPrice)]],
    styles: { fontSize: template === "modern" ? 11 : 10, cellPadding: template === "modern" ? 9 : 7, textColor: [245,237,224] as [number,number,number], fillColor: [28,24,20] as [number,number,number], lineColor: [46,39,31] as [number,number,number], lineWidth: 0.3 },
    footStyles: { fillColor: [212,128,31] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: "bold", fontSize: template === "modern" ? 12 : 11 },
    columnStyles: { 1: { cellWidth: 100, halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 28;

  // Per-person
  doc.setFillColor(...CARD);
  doc.roundedRect(margin, y, contentW, 40, 4, 4, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(template === "modern" ? 10 : 9);
  doc.setTextColor(...MID);
  doc.text(`Price per guest: ${formatCurrency(p.suggestedPrice / p.guestCount)} · ${event.guest_count} guests total`, margin + 16, y + 24);
  y += 60;

  // Terms (use custom terms if Pro user has them)
  const finalTerms = useCustomBranding?.proposal_terms || terms;
  if (finalTerms) {
    if (y > 580) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(template === "modern" ? 11 : 10);
    doc.setTextColor(...GOLD);
    doc.text("TERMS & CONDITIONS", margin, y);
    y += template === "modern" ? 16 : 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(template === "modern" ? 9 : 8.5);
    doc.setTextColor(...MID);
    const termLines = doc.splitTextToSize(finalTerms, contentW);
    doc.text(termLines, margin, y);
    y += termLines.length * (template === "modern" ? 13 : 12) + 20;
  }

  // Signature
  if (y > 660) { doc.addPage(); y = 56; }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 30, margin + 200, y + 30);
  doc.line(pageW - margin - 200, y + 30, pageW - margin, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(template === "modern" ? 9 : 8);
  doc.setTextColor(...MID);
  doc.text("Client Signature & Date", margin, y + 42);
  doc.text("Authorized Signature & Date", pageW - margin - 200, y + 42);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(template === "modern" ? 8 : 7.5);
    doc.setTextColor(...MID);
    doc.text(`${displayName} · Generated by Cateros`, margin, doc.internal.pageSize.getHeight() - 24);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 24, { align: "right" });
  }

  return doc;
}

// Parse hex color to RGB tuple, default to gold accent
function parseBrandColor(hex?: string | null): [number, number, number] {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [212, 128, 31];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Helper to load image from URL
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
