"use client";

import { useState } from "react";
import { X, Loader2, Bookmark } from "lucide-react";
import { createTemplate } from "@/lib/actions/templates";
import { toast } from "sonner";
import type { TemplateCategory } from "@/types";

type Props = {
  category: TemplateCategory;
  templateData: Record<string, any>;
  defaultName?: string;
  onClose: () => void;
};

export function SaveTemplateModal({ category, templateData, defaultName, onClose }: Props) {
  const [name, setName] = useState(defaultName ?? "");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  const categoryLabels: Record<TemplateCategory, string> = {
    menu: "Menu",
    pricing: "Pricing",
    pack_list: "Pack List",
    timeline: "Timeline",
    full_event: "Full Event",
  };

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await createTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      template_data: templateData,
      tags,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${categoryLabels[category]} template saved`);
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0C1220] border border-[#2A3A5C] rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#D4A373]" />
            <h2 className="font-display text-lg font-semibold">Save as {categoryLabels[category]} Template</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1A2538] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Template Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g. Standard Wedding Menu"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              rows={2}
              placeholder="Brief description of this template..."
            />
          </div>

          <div>
            <label className="label">Tags (optional, comma separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input w-full"
              placeholder="e.g. wedding, summer, outdoor"
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
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
