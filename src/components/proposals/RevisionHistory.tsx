"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";

type Revision = {
  id: string;
  revision_number: number;
  revision_notes: string | null;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: "Draft", bg: "bg-[#2e271f]", text: "text-[#9c8876]", border: "border-[#2e271f]" },
  sent: { label: "Sent", bg: "bg-blue-900/30", text: "text-blue-400", border: "border-blue-800/40" },
  accepted: { label: "Accepted", bg: "bg-green-900/30", text: "text-green-400", border: "border-green-800/40" },
  declined: { label: "Declined", bg: "bg-red-900/30", text: "text-red-400", border: "border-red-800/40" },
};

export function RevisionHistory({
  proposalId,
  revisions,
}: {
  proposalId: string;
  revisions: Revision[];
}) {
  const params = useParams();
  const currentId = (params?.id as string) ?? proposalId;

  if (revisions.length <= 1) return null;

  return (
    <div className="card p-5">
      <h3 className="font-medium text-sm mb-4">Revision History</h3>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[#2e271f]" />

        <div className="space-y-4">
          {revisions.map((rev) => {
            const isCurrent = rev.id === currentId;
            const style = statusStyles[rev.status] ?? statusStyles.draft;

            return (
              <div key={rev.id} className="relative pl-6">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 ${
                    isCurrent
                      ? "bg-brand-500 border-brand-400"
                      : "bg-[#1a1714] border-[#2e271f]"
                  }`}
                />

                <Link
                  href={`/proposals/${rev.id}`}
                  className={`block rounded-lg p-3 transition-colors ${
                    isCurrent
                      ? "bg-brand-950/40 border border-brand-800/30"
                      : "hover:bg-[#1a1714]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${isCurrent ? "text-brand-300" : "text-[#f5ede0]"}`}>
                      v{rev.revision_number}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-900/40 text-brand-300 border border-brand-800/40">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#9c8876]">
                    {format(new Date(rev.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                  {rev.revision_notes && (
                    <p className="text-xs text-[#9c8876] mt-1 line-clamp-2">
                      {rev.revision_notes}
                    </p>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
