"use client";

import { useState } from "react";
import { Copy, Mail, Link, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ShareProposalModalProps {
  shareToken: string;
  proposalTitle: string;
  clientName?: string;
  clientEmail?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareProposalModal({
  shareToken,
  proposalTitle,
  clientName,
  clientEmail,
  isOpen,
  onClose,
}: ShareProposalModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  if (!isOpen) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const shareUrl = `${baseUrl}/p/${shareToken}`;

  const emailTemplate = `Subject: Proposal for ${proposalTitle}

Hi ${clientName || "[Client Name]"},

Thank you for your interest. Please review your proposal at the link below:
${shareUrl}

Feel free to reach out with any questions.`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    toast.success("Share link copied to clipboard");
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function copyEmailTemplate() {
    await navigator.clipboard.writeText(emailTemplate);
    setEmailCopied(true);
    toast.success("Email template copied to clipboard");
    setTimeout(() => setEmailCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#1a1714] border border-[#2e271f] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e271f]">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-brand-400" />
            <h2 className="font-display text-lg font-semibold text-[#f5ede0]">
              Share Proposal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#9c8876] hover:text-[#f5ede0] transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Share URL */}
          <div>
            <label className="block text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">
              Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-[#0f0d0b] border border-[#2e271f] rounded-lg px-3 py-2 text-sm text-[#f5ede0] select-all focus:outline-none focus:border-brand-600"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyLink}
                className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3 flex-shrink-0"
              >
                {linkCopied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {linkCopied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Email Template */}
          <div>
            <label className="block text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-2">
              Email Template
            </label>
            <div className="bg-[#0f0d0b] border border-[#2e271f] rounded-lg p-3 text-sm text-[#9c8876] leading-relaxed whitespace-pre-wrap mb-3 max-h-48 overflow-y-auto">
              {emailTemplate}
            </div>
            <button
              onClick={copyEmailTemplate}
              className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3 w-full justify-center"
            >
              {emailCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              {emailCopied ? "Copied" : "Copy Email Template"}
            </button>
          </div>

          {/* Client info hint */}
          {clientEmail && (
            <p className="text-xs text-[#9c8876]">
              Client email: {clientEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
