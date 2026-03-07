"use client";

import { ExportButton } from "@/components/ui/ExportButton";
import { downloadCSV } from "@/lib/exportCSV";
import { format } from "date-fns";

type ProposalExportData = {
  title: string;
  status: string;
  created_at: string;
  event: {
    name: string;
    client_name: string;
  } | null;
};

export function ProposalsExport({ proposals }: { proposals: ProposalExportData[] }) {
  const handleCSV = () => {
    const rows = proposals.map((p) => ({
      Title: p.title,
      Event: p.event?.name ?? "",
      Client: p.event?.client_name ?? "",
      Status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
      "Created Date": format(new Date(p.created_at), "MMM d, yyyy"),
    }));
    downloadCSV(rows, "proposals.csv");
  };

  return <ExportButton onExportCSV={handleCSV} />;
}
