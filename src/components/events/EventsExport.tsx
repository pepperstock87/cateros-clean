"use client";

import { ExportButton } from "@/components/ui/ExportButton";
import { downloadCSV } from "@/lib/exportCSV";
import { generateEventsSummaryPDF } from "@/lib/generateReportPDF";
import { format } from "date-fns";
import type { Event, PricingData } from "@/types";

export function EventsExport({ events, companyName }: { events: Event[]; companyName: string }) {
  const handleCSV = () => {
    const rows = events.map((event) => {
      const p = event.pricing_data as PricingData | null;
      return {
        Name: event.name,
        Client: event.client_name,
        Date: format(new Date(event.event_date), "MMM d, yyyy"),
        Guests: event.guest_count,
        Status: event.status.charAt(0).toUpperCase() + event.status.slice(1),
        Revenue: p ? p.suggestedPrice : "",
      };
    });
    downloadCSV(rows, "events.csv");
  };

  const handlePDF = () => {
    generateEventsSummaryPDF(events, companyName);
  };

  return <ExportButton onExportCSV={handleCSV} onExportPDF={handlePDF} />;
}
