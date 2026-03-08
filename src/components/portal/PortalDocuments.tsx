import { FileText, ExternalLink } from "lucide-react";

type Props = {
  shareToken: string;
  proposalTitle: string;
};

export function PortalDocuments({ shareToken, proposalTitle }: Props) {
  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1F2A44] border border-[#2A3A5C] flex items-center justify-center">
              <FileText className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#F4F1ED]">{proposalTitle}</div>
              <div className="text-xs text-[#7A8BA8]">Proposal</div>
            </div>
          </div>
          <a
            href={`/p/${shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-brand-400 hover:text-brand-300 bg-[#1F2A44] hover:bg-[#2A3A5C] border border-[#2A3A5C] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        </div>
      </div>
    </div>
  );
}
