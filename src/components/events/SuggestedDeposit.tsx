"use client";

import { formatCurrency } from "@/lib/utils";

type Props = {
  totalPrice: number;
  defaultDepositPercent?: number;
};

export function SuggestedDeposit({ totalPrice, defaultDepositPercent = 50 }: Props) {
  const depositAmount = totalPrice * (defaultDepositPercent / 100);

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-[#9c8876] bg-[#1a1714] border border-[#2e271f] rounded-lg px-3 py-2 mt-3">
      <span>
        Suggested deposit: <span className="text-[#f5ede0] font-medium">{formatCurrency(depositAmount)}</span>{" "}
        ({defaultDepositPercent}% of {formatCurrency(totalPrice)})
      </span>
    </div>
  );
}
