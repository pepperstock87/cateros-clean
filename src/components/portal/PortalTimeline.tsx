"use client";

import { format } from "date-fns";
import { CheckCircle, Circle, Clock } from "lucide-react";
import type { Event, Payment } from "@/types";

type Props = {
  event: Event;
  proposal: {
    status: string;
    created_at: string;
    contract_accepted_at: string | null;
    viewed_at: string | null;
  };
  payments: Payment[];
};

type Milestone = {
  label: string;
  date: string | null;
  completed: boolean;
  current: boolean;
};

export function PortalTimeline({ event, proposal, payments }: Props) {
  const firstPayment = payments.length > 0 ? payments[payments.length - 1] : null;

  const proposalSent = true; // If the client can see the portal, proposal was sent
  const proposalViewed = !!proposal.viewed_at;
  const proposalApproved = ["approved", "signed", "deposit_paid", "booked", "accepted"].includes(proposal.status);
  const contractSigned = !!proposal.contract_accepted_at;
  const depositPaid = !!firstPayment || ["deposit_paid", "booked"].includes(proposal.status);
  const eventDate = new Date(event.event_date);
  const eventPassed = eventDate <= new Date();

  const milestones: Milestone[] = [
    {
      label: "Proposal Sent",
      date: proposal.created_at,
      completed: proposalSent,
      current: !proposalApproved && proposalSent,
    },
    {
      label: "Proposal Approved",
      date: proposalApproved ? (proposal.viewed_at || proposal.created_at) : null,
      completed: proposalApproved,
      current: proposalApproved && !contractSigned && !depositPaid,
    },
    {
      label: "Contract Signed",
      date: proposal.contract_accepted_at,
      completed: contractSigned,
      current: contractSigned && !depositPaid,
    },
    {
      label: "Deposit Paid",
      date: firstPayment?.paid_at || null,
      completed: depositPaid,
      current: depositPaid && !eventPassed,
    },
    {
      label: "Event Day",
      date: event.event_date,
      completed: eventPassed,
      current: false,
    },
  ];

  return (
    <div className="card p-5">
      <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-5">Timeline</h3>
      <div className="relative">
        {milestones.map((milestone, index) => {
          const isLast = index === milestones.length - 1;

          return (
            <div key={milestone.label} className="flex gap-3 relative">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[9px] top-[22px] w-px h-[calc(100%-4px)] ${
                    milestone.completed ? "bg-green-800/60" : "bg-[#2e271f]"
                  }`}
                />
              )}

              {/* Icon */}
              <div className="flex-shrink-0 relative z-10 mt-0.5">
                {milestone.completed ? (
                  <CheckCircle className="w-[18px] h-[18px] text-green-400" />
                ) : milestone.current ? (
                  <Clock className="w-[18px] h-[18px] text-brand-400" />
                ) : (
                  <Circle className="w-[18px] h-[18px] text-[#3d3428]" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                <div
                  className={`text-sm font-medium ${
                    milestone.completed
                      ? "text-[#f5ede0]"
                      : milestone.current
                      ? "text-brand-400"
                      : "text-[#6b5a4a]"
                  }`}
                >
                  {milestone.label}
                </div>
                {milestone.date && (
                  <div className="text-xs text-[#6b5a4a] mt-0.5">
                    {format(new Date(milestone.date), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
