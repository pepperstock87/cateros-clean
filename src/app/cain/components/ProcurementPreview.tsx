"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { CainProcurementDraft } from "@/lib/cain/types";
import { formatCurrency } from "@/lib/utils";

interface ProcurementPreviewProps {
  draft: CainProcurementDraft;
}

export function ProcurementPreview({ draft }: ProcurementPreviewProps) {
  const distributors = Object.values(draft.byDistributor);

  if (distributors.length === 0 && draft.unmappedItems.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] pt-3">No procurement data available.</p>
    );
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">{draft.totalMappedItems}</strong> items mapped
        </span>
        <span className="text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">{draft.totalDistributors}</strong> distributor{draft.totalDistributors !== 1 ? "s" : ""}
        </span>
        <span className="text-[var(--text-muted)]">
          Est. <strong className="text-[var(--text-primary)]">{formatCurrency(draft.totalEstimatedCost)}</strong>
        </span>
      </div>

      {/* Distributor groups */}
      {distributors.map((dist) => (
        <DistributorGroup key={dist.distributorId} distributor={dist} />
      ))}

      {/* Unmapped items */}
      {draft.unmappedItems.length > 0 && (
        <div className="border border-yellow-500/20 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-yellow-500/10">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300">
              {draft.unmappedItems.length} Unmapped Item{draft.unmappedItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="px-3 py-2 space-y-1">
            {draft.unmappedItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{item.ingredientName}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-[var(--text-muted)] pt-1">
              Map these to distributor products in Settings to include in purchase orders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DistributorGroup({ distributor }: {
  distributor: CainProcurementDraft["byDistributor"][string];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-primary)]/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {distributor.distributorName}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {distributor.lines.length} item{distributor.lines.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
            {formatCurrency(distributor.subtotal)}
          </span>
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="text-left py-1.5 px-3 font-medium">Item</th>
                <th className="text-left py-1.5 px-2 font-medium">SKU</th>
                <th className="text-right py-1.5 px-2 font-medium">Qty</th>
                <th className="text-right py-1.5 px-2 font-medium">Unit $</th>
                <th className="text-right py-1.5 px-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {distributor.lines.map((line, i) => (
                <tr key={i} className="border-b border-[var(--border)]/50">
                  <td className="py-1.5 px-3">
                    <div className="text-[var(--text-primary)]">{line.ingredientName}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {line.productName}{line.packSize ? ` (${line.packSize})` : ""}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-muted)] font-mono">{line.sku}</td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-primary)] tabular-nums">
                    {line.quantity}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[var(--text-muted)] tabular-nums">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[var(--text-primary)] tabular-nums font-medium">
                    {formatCurrency(line.extendedPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
