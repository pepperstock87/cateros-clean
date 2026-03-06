import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";

interface Props {
  revenue: number;
  estimatedCost: number;
  actualSpending: number;
  receiptCount: number;
}

export function EventProfitLoss({ revenue, estimatedCost, actualSpending, receiptCount }: Props) {
  const hasActualData = actualSpending > 0;
  const cost = hasActualData ? actualSpending : estimatedCost;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const isProjected = !hasActualData;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#9c8876]" />
          Profit & Loss
        </h2>
        {isProjected && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#251f19] text-[#9c8876] border border-[#2e271f]">
            Estimated costs
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#251f19] rounded-lg p-3 text-center">
          <div className="text-xs text-[#9c8876] mb-1">Revenue</div>
          <div className="text-sm font-semibold text-brand-300">{formatCurrency(revenue)}</div>
        </div>
        <div className="bg-[#251f19] rounded-lg p-3 text-center">
          <div className="text-xs text-[#9c8876] mb-1">
            {isProjected ? "Est. Cost" : "Actual Cost"}
          </div>
          <div className="text-sm font-semibold">{formatCurrency(cost)}</div>
          {hasActualData && (
            <div className="text-[10px] text-[#6b5a4a] mt-0.5 flex items-center justify-center gap-1">
              <Receipt className="w-2.5 h-2.5" />{receiptCount} receipt{receiptCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div className="bg-[#251f19] rounded-lg p-3 text-center">
          <div className="text-xs text-[#9c8876] mb-1">Profit</div>
          <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {profit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {formatCurrency(Math.abs(profit))}
          </div>
        </div>
      </div>

      {/* Margin bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[#2e271f] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              margin >= 25 ? "bg-green-500" : margin >= 15 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.max(0, Math.min(margin, 100))}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          margin >= 25 ? "text-green-400" : margin >= 15 ? "text-yellow-400" : "text-red-400"
        }`}>
          {margin.toFixed(1)}%
        </span>
      </div>

      {hasActualData && estimatedCost > 0 && (
        <div className="mt-3 pt-3 border-t border-[#2e271f]">
          <div className="flex justify-between text-xs text-[#6b5a4a]">
            <span>Estimated cost was {formatCurrency(estimatedCost)}</span>
            <span className={actualSpending <= estimatedCost ? "text-green-400" : "text-red-400"}>
              {actualSpending <= estimatedCost ? "Under" : "Over"} by {formatCurrency(Math.abs(actualSpending - estimatedCost))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
