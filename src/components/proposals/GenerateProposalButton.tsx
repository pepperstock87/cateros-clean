"use client";

import { useState, useRef } from "react";
import { generateProposalPDF } from "@/lib/generateProposalPDF";
import type { Event, BusinessSettings, UserEntitlements } from "@/types";
import { FileText, Loader2, Eye, X, Download } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function GenerateProposalButton({ event }: { event: Event }) {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [terms, setTerms] = useState(
    "A deposit of 50% is required to secure your event date. The remaining balance is due 7 days prior to the event. Cancellations made within 30 days of the event are non-refundable. Prices subject to change based on final guest count confirmed 10 days before event."
  );
  const docRef = useRef<Awaited<ReturnType<typeof generateProposalPDF>> | null>(null);
  const filenameRef = useRef<string>("");

  async function buildPDF() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch org context for filtering
    const { data: orgProfile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user!.id)
      .single();
    const orgId = orgProfile?.current_organization_id;

    let settingsQuery = supabase.from("business_settings").select("*").eq("user_id", user!.id);
    if (orgId) settingsQuery = settingsQuery.eq("organization_id", orgId);

    const [profileRes, entitlementsRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("company_name").eq("id", user!.id).single(),
      fetch("/api/entitlements").then(r => r.json()),
      settingsQuery.maybeSingle()
    ]);

    const profile = profileRes.data;
    const entitlements: UserEntitlements = entitlementsRes;
    const businessSettings: BusinessSettings | null = settingsRes.data;

    const doc = await generateProposalPDF(
      event,
      profile?.company_name ?? "Our Catering Company",
      customMessage,
      terms,
      businessSettings,
      entitlements.isPro
    );

    const filename = `proposal-${event.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;

    // Save proposal record to database
    const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const { error: insertError } = await supabase.from("proposals").insert({
      event_id: event.id,
      user_id: user!.id,
      organization_id: orgId || null,
      title: `${event.name} Proposal`,
      status: "draft",
      custom_message: customMessage || null,
      terms: terms || null,
      share_token: shareToken,
    });

    if (insertError) {
      toast.error("Failed to save proposal record");
    } else {
      toast.success("Proposal saved");
    }

    return { doc, filename };
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const { doc, filename } = await buildPDF();
      doc.save(filename);
      toast.success("Proposal PDF downloaded!");
      setShowModal(false);
    } catch {
      toast.error("Failed to generate proposal");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const { doc, filename } = await buildPDF();
      docRef.current = doc;
      filenameRef.current = filename;
      const blobUrl = doc.output("bloburl") as unknown as string;
      setPreviewUrl(blobUrl);
      setShowModal(false);
      setShowPreview(true);
    } catch {
      toast.error("Failed to generate proposal preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function handlePreviewDownload() {
    if (docRef.current) {
      docRef.current.save(filenameRef.current);
      toast.success("Proposal PDF downloaded!");
    }
  }

  function handleClosePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setShowPreview(false);
    docRef.current = null;
    filenameRef.current = "";
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn-secondary flex items-center gap-2">
        <FileText className="w-4 h-4" />Generate Proposal
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="card p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold mb-1">Generate Proposal PDF</h2>
            <p className="text-sm text-[#9c8876] mb-5">Customize before generating the PDF for your client.</p>
            <div className="space-y-4">
              <div>
                <label className="label">Custom message to client (optional)</label>
                <textarea className="input resize-none" rows={3} value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Thank you for considering us for your special event..." />
              </div>
              <div>
                <label className="label">Terms & Conditions</label>
                <textarea className="input resize-none" rows={4} value={terms} onChange={e => setTerms(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={handleGenerate} disabled={loading || previewLoading} className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {loading ? "Generating..." : "Download PDF"}
              </button>
              <button onClick={handlePreview} disabled={loading || previewLoading} className="btn-secondary flex items-center gap-2">
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {previewLoading ? "Loading..." : "Preview"}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 bg-[#0f0d0b] flex flex-col">
          <div className="bg-[#1a1714] border-b border-[#2e271f] px-6 py-3 flex justify-between items-center">
            <h2 className="font-display text-lg font-semibold text-white">Proposal Preview</h2>
            <div className="flex items-center gap-3">
              <button onClick={handlePreviewDownload} className="btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button onClick={handleClosePreview} className="btn-secondary flex items-center gap-2">
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
          <iframe src={previewUrl} className="w-full flex-1 bg-white" title="Proposal Preview" />
        </div>
      )}
    </>
  );
}
