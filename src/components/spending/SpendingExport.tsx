"use client";

import { ExportButton } from "@/components/ui/ExportButton";
import { downloadCSV } from "@/lib/exportCSV";
import { format } from "date-fns";
import type { Receipt } from "@/app/spending/page";

export function SpendingExport({ receipts }: { receipts: Receipt[] }) {
  const handleCSV = () => {
    const rows = receipts.map((r) => ({
      Vendor: r.vendor,
      Date: format(new Date(r.date), "MMM d, yyyy"),
      Amount: r.amount,
      Category: r.category ?? "",
    }));
    downloadCSV(rows, "receipts.csv");
  };

  return <ExportButton onExportCSV={handleCSV} />;
}
