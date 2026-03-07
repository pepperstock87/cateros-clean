"use client";

import { useState } from "react";
import { BEOExportButtons } from "./BEOExportButtons";
import { ClientBEOToggle } from "./ClientBEOToggle";
import type { Event, PricingData, Recipe, StaffAssignment } from "@/types";

type Props = {
  event: Event;
  staffAssignments: StaffAssignment[];
  recipes: Recipe[];
  companyName: string;
  children: React.ReactNode;
};

export function BEOPageClient({ event, staffAssignments, recipes, companyName, children }: Props) {
  const [isClientView, setIsClientView] = useState(false);

  const p = event.pricing_data as PricingData | null;

  return (
    <div className={isClientView ? "beo-client-view" : ""}>
      <style>{`
        .beo-client-view [data-beo-internal] { display: none !important; }
      `}</style>
      <div className="print:hidden flex items-center gap-3 mb-2">
        <ClientBEOToggle onToggle={setIsClientView} isClientView={isClientView} />
        <div className="ml-auto">
          <BEOExportButtons
            event={event}
            staffAssignments={staffAssignments}
            pricingData={p}
            recipes={recipes}
            companyName={companyName}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
