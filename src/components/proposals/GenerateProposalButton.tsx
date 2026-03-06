"use client";

import { useState } from "react";
import { generateProposalPDF } from "@/lib/generateProposalPDF";
import type { Event, BusinessSettings, UserEntitlements } from "@/types";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function GenerateProposalButton({ event }: { event: Event }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [terms, setTerms] = useState(
    "A deposit of 50% is required to secure your event date. The remaining balance is due 7 days prior to the event. Cancellations made within 30 days of the event are non-refundable. Prices subject to change based on final guest count confirmed 10 days before event."
  );

  async function handleGenerate() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch profile, entitlements, and business settings
      const [profileRes, entitlementsRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("company_name").eq("id", user!.id).single(),
        fetch("/api/entitlements").then(r => r.json()),
        supabase.from("business_settings").select("*").eq("user_id", user!.id).single()
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
      doc.save(filename);

      // Save proposal record to database
      const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      const { error: insertError } = await supabase.from("proposals").insert({
        event_id: event.id,
        user_id: user!.id,
        title: `${event.name} Proposal`,
        status: "draft",
        custom_message: customMessage || null,
        terms: terms || null,
        share_token: shareToken,
      });

      if (insertError) {
        console.error("Failed to save proposal record:", insertError);
      } else {
        toast.success("Proposal saved");
      }

      toast.success("Proposal PDF downloaded!");
      setShowModal(false);
    } catch (e) {
      toast.error("Failed to generate proposal");
      console.error(e);
    } finally {
      setLoading(false);
    }
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
              <button onClick={handleGenerate} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {loading ? "Generating..." : "Download PDF"}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
