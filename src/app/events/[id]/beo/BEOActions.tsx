"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Event, PricingData } from "@/types";

export function BEOActions({ event }: { event: Event }) {
  const handlePrint = () => window.print();

  const handlePDF = () => {
    const e = event;
    const p = e.pricing_data as PricingData | null;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    const contentW = pageW - margin * 2;

    // Header
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageW, 70, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BANQUET EVENT ORDER", margin, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated ${format(new Date(), "MMMM d, yyyy")}`, pageW - margin, 44, { align: "right" });

    let y = 90;

    // Event details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(e.name, margin, y);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const details = [
      `Client: ${e.client_name}`,
      `Date: ${format(new Date(e.event_date), "EEEE, MMMM d, yyyy")}`,
      ...(e.start_time && e.end_time ? [`Time: ${e.start_time} - ${e.end_time}`] : []),
      `Guests: ${e.guest_count}`,
      ...(e.venue ? [`Venue: ${e.venue}`] : []),
      ...(e.client_email ? [`Contact: ${e.client_email}`] : []),
    ];
    details.forEach((line) => {
      doc.text(line, margin, y);
      y += 14;
    });
    y += 10;

    if (p) {
      // Menu
      if (p.menuItems?.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("MENU", margin, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Item", "Qty", "Cost/Person", "Subtotal"]],
          body: p.menuItems.map((item) => [
            item.name,
            String(item.quantity),
            formatCurrency(item.costPerPerson),
            formatCurrency(item.costPerPerson * item.quantity),
          ]),
          styles: { fontSize: 9, cellPadding: 6, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.5 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: { 1: { cellWidth: 50, halign: "right" }, 2: { cellWidth: 80, halign: "right" }, 3: { cellWidth: 80, halign: "right" } },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // Staffing
      if (p.staffing?.length > 0) {
        if (y > 620) { doc.addPage(); y = 48; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("STAFFING PLAN", margin, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Role", "Headcount", "Hours", "Rate", "Total"]],
          body: p.staffing.map((s) => [
            s.role,
            String(s.headcount),
            String(s.hours),
            `${formatCurrency(s.hourlyRate)}/hr`,
            formatCurrency(s.hourlyRate * s.hours * s.headcount),
          ]),
          styles: { fontSize: 9, cellPadding: 6, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.5 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // Rentals
      if (p.rentals?.length > 0) {
        if (y > 620) { doc.addPage(); y = 48; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("EQUIPMENT / RENTALS", margin, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Item", "Qty", "Unit Cost", "Total"]],
          body: p.rentals.map((r) => [
            r.item,
            String(r.quantity),
            formatCurrency(r.unitCost),
            formatCurrency(r.unitCost * r.quantity),
          ]),
          styles: { fontSize: 9, cellPadding: 6, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.5 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: { 1: { cellWidth: 50, halign: "right" }, 2: { cellWidth: 80, halign: "right" }, 3: { cellWidth: 80, halign: "right" } },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // Bar package
      if (p.barPackage) {
        if (y > 660) { doc.addPage(); y = 48; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("BAR PACKAGE", margin, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Package", "Cost/Person", "Guests", "Total"]],
          body: [[p.barPackage.label, formatCurrency(p.barPackage.costPerPerson), String(p.guestCount), formatCurrency(p.barTotal)]],
          styles: { fontSize: 9, cellPadding: 6, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.5 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // Cost summary
      if (y > 540) { doc.addPage(); y = 48; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("COST SUMMARY (INTERNAL)", margin, y);
      y += 6;

      const summaryRows = [
        ["Food & Menu", formatCurrency(p.foodCostTotal)],
        ["Staffing", formatCurrency(p.staffingTotal)],
        ["Rentals & Equipment", formatCurrency(p.rentalsTotal)],
        ...(p.barPackage ? [[`Bar (${p.barPackage.label})`, formatCurrency(p.barTotal)]] : []),
        ["Subtotal", formatCurrency(p.subtotal)],
        [`Admin Fee (${p.adminPercent}%)`, formatCurrency(p.adminFee)],
        [`Tax (${p.taxPercent}%)`, formatCurrency(p.taxAmount)],
      ];

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        body: summaryRows,
        foot: [["TOTAL COST", formatCurrency(p.totalCost)]],
        styles: { fontSize: 10, cellPadding: 7, textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.5 },
        footStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 11 },
        columnStyles: { 1: { cellWidth: 120, halign: "right" } },
      });
      y = (doc as any).lastAutoTable.finalY + 20;
    }

    // Notes
    if (e.notes) {
      if (y > 620) { doc.addPage(); y = 48; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("NOTES", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const noteLines = doc.splitTextToSize(e.notes, contentW);
      doc.text(noteLines, margin, y);
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text("Banquet Event Order - Internal Use Only", margin, doc.internal.pageSize.getHeight() - 24);
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 24, { align: "right" });
    }

    doc.save(`BEO-${e.name.replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <div className="print:hidden flex items-center gap-3 mb-6">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#9c8876] hover:text-[#f5ede0] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to event
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1c1814] text-[#f5ede0] text-sm font-medium hover:bg-[#2e271f] transition-colors border border-[#2e271f]"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button
          onClick={handlePDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4801f] text-white text-sm font-medium hover:bg-[#b86d1a] transition-colors"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>
    </div>
  );
}
