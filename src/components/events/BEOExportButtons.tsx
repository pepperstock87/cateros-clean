"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { generateBEOPDF } from "@/lib/generateBEOPDF";
import { generateKitchenPrepPDF } from "@/lib/generateKitchenPrepPDF";
import type { Event, PricingData, Recipe, StaffAssignment } from "@/types";

type Props = {
  event: Event;
  staffAssignments: StaffAssignment[];
  pricingData: PricingData | null;
  recipes: Recipe[];
  companyName: string;
};

export function BEOExportButtons({ event, staffAssignments, pricingData, recipes, companyName }: Props) {
  const [loadingBEO, setLoadingBEO] = useState(false);
  const [loadingPrep, setLoadingPrep] = useState(false);

  const slug = event.name.replace(/\s+/g, "-");

  const handleDownloadBEO = async () => {
    setLoadingBEO(true);
    try {
      const doc = generateBEOPDF(event, companyName, staffAssignments, pricingData, recipes);
      doc.save(`Production-Sheet-${slug}.pdf`);
    } finally {
      setLoadingBEO(false);
    }
  };

  const handleDownloadPrep = async () => {
    setLoadingPrep(true);
    try {
      const doc = generateKitchenPrepPDF(event, recipes, companyName);
      doc.save(`Kitchen-Prep-${slug}.pdf`);
    } finally {
      setLoadingPrep(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownloadBEO}
        disabled={loadingBEO}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1714] text-[#f5ede0] text-sm font-medium hover:bg-[#2e271f] transition-colors border border-[#2e271f] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileDown className="w-4 h-4" />
        {loadingBEO ? "Generating..." : "Download Production Sheet"}
      </button>
      <button
        onClick={handleDownloadPrep}
        disabled={loadingPrep}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1714] text-[#f5ede0] text-sm font-medium hover:bg-[#2e271f] transition-colors border border-[#2e271f] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileDown className="w-4 h-4" />
        {loadingPrep ? "Generating..." : "Download Kitchen Prep"}
      </button>
    </div>
  );
}
