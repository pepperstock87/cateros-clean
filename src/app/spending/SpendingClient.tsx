"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Check, Loader2, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Receipt as ReceiptType, DistributorInvoice, InvoiceLineItem } from "./page";

type Tab = "receipts" | "invoices";

type ExtractedReceipt = {
  vendor: string;
  date: string;
  amount: number;
  category: string;
};

type ExtractedInvoice = {
  distributor: string;
  invoice_date: string;
  invoice_number: string;
  total: number;
  line_items: InvoiceLineItem[];
};

export function SpendingClient({
  receipts,
  invoices,
}: {
  receipts: ReceiptType[];
  invoices: DistributorInvoice[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("receipts");
  const [uploading, setUploading] = useState(false);
  const [reviewData, setReviewData] = useState<ExtractedReceipt | ExtractedInvoice | null>(null);
  const [reviewType, setReviewType] = useState<Tab>("receipts");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", activeTab === "receipts" ? "receipt" : "invoice");

      const res = await fetch("/api/spending/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }

      const data = await res.json();
      setReviewData(data.extracted);
      setReviewType(activeTab);
    } catch (err: any) {
      setError(err.message || "Failed to process file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!reviewData) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/spending/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reviewType === "receipts" ? "receipt" : "invoice",
          data: reviewData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      setReviewData(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updateReviewField(field: string, value: any) {
    if (!reviewData) return;
    setReviewData({ ...reviewData, [field]: value });
  }

  const STATUS_CLASSES: Record<string, string> = {
    pending: "badge-proposed",
    paid: "badge-confirmed",
    overdue: "badge-canceled",
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2e271f]">
        <button
          onClick={() => setActiveTab("receipts")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "receipts"
              ? "border-brand-400 text-brand-300"
              : "border-transparent text-[#9c8876] hover:text-[#f5ede0]"
          )}
        >
          <Receipt className="w-4 h-4" />
          Receipts
          <span className="ml-1 text-xs text-[#6b5a4a]">({receipts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "invoices"
              ? "border-brand-400 text-brand-300"
              : "border-transparent text-[#9c8876] hover:text-[#f5ede0]"
          )}
        >
          <FileText className="w-4 h-4" />
          Distributor Invoices
          <span className="ml-1 text-xs text-[#6b5a4a]">({invoices.length})</span>
        </button>
      </div>

      {/* Upload Button */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={activeTab === "receipts" ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png"}
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload {activeTab === "receipts" ? "Receipt" : "Invoice"}
            </>
          )}
        </button>
        <p className="text-xs text-[#6b5a4a] mt-2">
          {activeTab === "receipts"
            ? "Upload a photo of a receipt (JPG, PNG). AI will extract the details."
            : "Upload an invoice (PDF, JPG, PNG). AI will extract distributor info and line items."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Review Modal */}
      {reviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                Review Extracted Data
              </h3>
              <button
                onClick={() => setReviewData(null)}
                className="p-1 hover:bg-[#1c1814] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#9c8876]" />
              </button>
            </div>

            {reviewType === "receipts" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Vendor</label>
                  <input
                    className="input w-full"
                    value={(reviewData as ExtractedReceipt).vendor}
                    onChange={(e) => updateReviewField("vendor", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={(reviewData as ExtractedReceipt).date}
                    onChange={(e) => updateReviewField("date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input w-full"
                    value={(reviewData as ExtractedReceipt).amount}
                    onChange={(e) => updateReviewField("amount", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Category</label>
                  <input
                    className="input w-full"
                    value={(reviewData as ExtractedReceipt).category}
                    onChange={(e) => updateReviewField("category", e.target.value)}
                    placeholder="e.g. Produce, Meat, Supplies"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Distributor</label>
                  <input
                    className="input w-full"
                    value={(reviewData as ExtractedInvoice).distributor}
                    onChange={(e) => updateReviewField("distributor", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Invoice Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={(reviewData as ExtractedInvoice).invoice_date}
                    onChange={(e) => updateReviewField("invoice_date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Invoice #</label>
                  <input
                    className="input w-full"
                    value={(reviewData as ExtractedInvoice).invoice_number}
                    onChange={(e) => updateReviewField("invoice_number", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9c8876] mb-1">Total</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input w-full"
                    value={(reviewData as ExtractedInvoice).total}
                    onChange={(e) => updateReviewField("total", parseFloat(e.target.value) || 0)}
                  />
                </div>
                {(reviewData as ExtractedInvoice).line_items?.length > 0 && (
                  <div>
                    <label className="block text-xs text-[#9c8876] mb-2">Line Items</label>
                    <div className="space-y-2">
                      {(reviewData as ExtractedInvoice).line_items.map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-[#1c1814] border border-[#2e271f] text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#f5ede0]">{item.description}</span>
                            <span className="text-[#9c8876]">${item.total.toFixed(2)}</span>
                          </div>
                          <div className="text-[#6b5a4a] mt-0.5">
                            Qty: {item.quantity} x ${item.unit_price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm & Save
                  </>
                )}
              </button>
              <button
                onClick={() => setReviewData(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "receipts" ? (
        <div className="card p-4 md:p-5">
          <h2 className="font-medium text-xs md:text-sm mb-4 text-[#9c8876] uppercase tracking-wider">
            Receipts
          </h2>
          {receipts.length === 0 ? (
            <p className="text-sm text-[#6b5a4a] text-center py-8">
              No receipts yet. Upload your first receipt to start tracking spending.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle px-4 md:px-0">
                <table className="w-full text-xs md:text-sm">
                  <thead className="text-[#6b5a4a] border-b border-[#2e271f]">
                    <tr>
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Vendor</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                      <th className="text-left py-2 font-medium hidden sm:table-cell">Category</th>
                      <th className="text-left py-2 font-medium hidden md:table-cell">Week</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e271f]">
                    {receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-[#1c1814] transition-colors">
                        <td className="py-3 text-[#9c8876] whitespace-nowrap">
                          {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 font-medium truncate max-w-[150px]">{r.vendor}</td>
                        <td className="py-3 text-right font-medium">
                          ${r.amount.toFixed(2)}
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          {r.category ? (
                            <span className="badge">{r.category}</span>
                          ) : (
                            <span className="text-[#6b5a4a]">--</span>
                          )}
                        </td>
                        <td className="py-3 text-[#6b5a4a] hidden md:table-cell">
                          {r.week_label ?? "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4 md:p-5">
          <h2 className="font-medium text-xs md:text-sm mb-4 text-[#9c8876] uppercase tracking-wider">
            Distributor Invoices
          </h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-[#6b5a4a] text-center py-8">
              No invoices yet. Upload your first distributor invoice to start tracking.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle px-4 md:px-0">
                <table className="w-full text-xs md:text-sm">
                  <thead className="text-[#6b5a4a] border-b border-[#2e271f]">
                    <tr>
                      <th className="text-left py-2 font-medium">Distributor</th>
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium hidden sm:table-cell">Invoice #</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e271f]">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#1c1814] transition-colors">
                        <td className="py-3 font-medium truncate max-w-[150px]">{inv.distributor}</td>
                        <td className="py-3 text-[#9c8876] whitespace-nowrap">
                          {new Date(inv.invoice_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 text-[#6b5a4a] hidden sm:table-cell">
                          {inv.invoice_number ?? "--"}
                        </td>
                        <td className="py-3 text-right font-medium">
                          ${inv.total.toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <span className={STATUS_CLASSES[inv.status] ?? "badge"}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
