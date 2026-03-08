"use client";

import { formatCurrency } from "@/lib/utils";

type Props = {
  totalPrice: number;
  defaultDepositPercent?: number;
};

export function SuggestedDeposit({ totalPrice, defaultDepositPercent = 50 }: Props) {
  const depositAmount = totalPrice * (defaultDepositPercent / 100);

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-[#D4A373] bg-[#182030] border border-[#2A3A5C] rounded-lg px-3 py-2 mt-3">
      <span>
        Suggested deposit: <span className="text-[#F4F1ED] font-medium">{formatCurrency(depositAmount)}</span>{" "}
        ({defaultDepositPercent}% of {formatCurrency(totalPrice)})
      </span>
    </div>
  );
}
