"use client";

import { useState } from "react";
import { Shield, CheckCircle, Loader2, PenTool } from "lucide-react";

type Props = {
  shareToken: string;
  terms: string | null;
  companyName: string;
  eventName: string;
  totalAmount: number;
};

export function ContractAcceptance({ shareToken, terms, companyName, eventName, totalAmount }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);

  async function handleSign() {
    if (!agreed || !signerName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/proposals/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_token: shareToken,
          action: "signed",
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSigned(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (signed) {
    return (
      <div className="card p-8 text-center border-green-900/50">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h3 className="font-display text-xl font-semibold mb-1">Contract Signed</h3>
        <p className="text-sm text-[#f5ede0] mb-2">
          Thank you, {signerName}! Your contract for {eventName} has been signed.
        </p>
        <p className="text-sm text-[#9c8876]">
          The catering team has been notified and will follow up with next steps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contract terms */}
      <div className="card p-6 border-[#2e271f] bg-[#1a1714]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-brand-400" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-brand-300">
            Contract Agreement
          </h3>
        </div>

        <p className="text-sm text-[#9c8876] mb-3">
          Please review the terms and conditions below for your event with {companyName}.
        </p>

        {terms ? (
          <div className="max-h-60 overflow-y-auto bg-[#0f0d0b] rounded-lg p-4 border border-[#2e271f]">
            <p className="text-sm text-[#9c8876] whitespace-pre-wrap">{terms}</p>
          </div>
        ) : (
          <div className="bg-[#0f0d0b] rounded-lg p-4 border border-[#2e271f]">
            <p className="text-sm text-[#6b5a4a] italic">No additional terms provided.</p>
          </div>
        )}
      </div>

      {/* Acceptance form */}
      <div className="card p-6 border-[#2e271f] bg-[#1a1714]">
        <div className="space-y-4">
          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-[#2e271f] bg-[#0f0d0b] text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>
            <span className="text-sm text-[#f5ede0] group-hover:text-white transition-colors">
              I have read and agree to the terms and conditions above
            </span>
          </label>

          {/* Signer name */}
          <div>
            <label className="block text-xs text-[#9c8876] uppercase tracking-wider font-medium mb-1.5">
              Full Legal Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full bg-[#0f0d0b] border border-[#2e271f] rounded-lg px-3 py-2.5 text-sm text-[#f5ede0] placeholder-[#6b5a4a] focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Signer email */}
          <div>
            <label className="block text-xs text-[#9c8876] uppercase tracking-wider font-medium mb-1.5">
              Email Address <span className="text-[#6b5a4a]">(optional)</span>
            </label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#0f0d0b] border border-[#2e271f] rounded-lg px-3 py-2.5 text-sm text-[#f5ede0] placeholder-[#6b5a4a] focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSign}
            disabled={loading || !agreed || !signerName.trim()}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PenTool className="w-4 h-4" />
            )}
            Sign & Accept
          </button>

          <p className="text-[10px] text-[#6b5a4a] text-center">
            By signing, you agree to the terms above and confirm the total of ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
          </p>
        </div>
      </div>
    </div>
  );
}
