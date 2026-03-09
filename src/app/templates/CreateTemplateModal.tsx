"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { createTemplate } from "@/lib/actions/templates";
import { toast } from "sonner";
import type { TemplateCategory } from "@/types";

const CATEGORIES: { key: TemplateCategory; label: string }[] = [
  { key: "menu", label: "Menu" },
  { key: "pricing", label: "Pricing" },
  { key: "pack_list", label: "Pack List" },
  { key: "timeline", label: "Timeline" },
  { key: "full_event", label: "Full Event" },
];

export function CreateTemplateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("menu");
  const [tagsInput, setTagsInput] = useState("");
  const [templateJson, setTemplateJson] = useState("{}");

  async function handleSave() {
    if (!name.trim()) return;
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(templateJson);
    } catch {
      toast.error("Invalid JSON in template data");
      return;
    }

    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await createTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      template_data: parsed,
      tags,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Template created");
      startTransition(() => router.refresh());
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0C1220] border border-[#2A3A5C] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold">Create Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1A2538] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g. Wedding Menu Standard"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="label">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    category === cat.key
                      ? "bg-brand-950 border-brand-700 text-brand-300"
                      : "border-[#2A3A5C] text-[#D4A373] hover:border-[#344570]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Tags (comma separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input w-full"
              placeholder="e.g. wedding, summer, outdoor"
            />
          </div>

          <div>
            <label className="label">Template Data (JSON)</label>
            <textarea
              value={templateJson}
              onChange={(e) => setTemplateJson(e.target.value)}
              className="input w-full font-mono text-xs"
              rows={6}
              placeholder='{"menuItems": [...]}'
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[#2A3A5C]">
          <button onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}
