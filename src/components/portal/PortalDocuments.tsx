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
            <div className="w-9 h-9 rounded-lg bg-[#251f19] border border-[#2e271f] flex items-center justify-center">
              <FileText className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#f5ede0]">{proposalTitle}</div>
              <div className="text-xs text-[#6b5a4a]">Proposal</div>
            </div>
          </div>
          <a
            href={`/p/${shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-brand-400 hover:text-brand-300 bg-[#251f19] hover:bg-[#2e271f] border border-[#2e271f] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        </div>
      </div>
    </div>
  );
}
