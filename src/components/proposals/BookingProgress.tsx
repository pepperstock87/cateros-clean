"use client";

import { CheckCircle2, Send, Eye, ThumbsUp, PenTool, CreditCard, PartyPopper } from "lucide-react";

type Props = {
  status: string;
  requireContract: boolean;
  requireDeposit: boolean;
};

type Step = {
  key: string;
  label: string;
  icon: typeof Send;
};

const STATUS_TO_STEP: Record<string, string> = {
  sent: "sent",
  viewed: "reviewed",
  approved: "approved",
  signed: "signed",
  deposit_paid: "deposit_paid",
  booked: "booked",
  // backward compat
  accepted: "approved",
};

export function BookingProgress({ status, requireContract, requireDeposit }: Props) {
  const allSteps: Step[] = [
    { key: "sent", label: "Proposal Sent", icon: Send },
    { key: "reviewed", label: "Reviewed", icon: Eye },
    { key: "approved", label: "Approved", icon: ThumbsUp },
    ...(requireContract ? [{ key: "signed", label: "Contract Signed", icon: PenTool }] : []),
    ...(requireDeposit ? [{ key: "deposit_paid", label: "Deposit Paid", icon: CreditCard }] : []),
    { key: "booked", label: "Booked", icon: PartyPopper },
  ];

  const currentStepKey = STATUS_TO_STEP[status] || "sent";
  const currentIdx = allSteps.findIndex((s) => s.key === currentStepKey);

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto">
      {allSteps.map((step, i) => {
        const isComplete = i < currentIdx;
        const isCurrent = i === currentIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial min-w-0">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors shrink-0 ${
                  isComplete
                    ? "bg-green-600 border-green-600"
                    : isCurrent
                    ? "border-brand-400 bg-brand-950"
                    : "border-[#2e271f] bg-[#1a1714]"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-brand-400" : "text-[#6b5a4a]"}`} />
                )}
              </div>
              <span
                className={`text-[9px] font-medium whitespace-nowrap text-center ${
                  isComplete
                    ? "text-green-400"
                    : isCurrent
                    ? "text-brand-300"
                    : "text-[#6b5a4a]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < allSteps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 mt-[-18px] rounded-full transition-colors min-w-[12px] ${
                  i < currentIdx ? "bg-green-600" : "bg-[#2e271f]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
