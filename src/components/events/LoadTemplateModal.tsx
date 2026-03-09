"use client";

import { useState, useEffect } from "react";
import { X, Loader2, LayoutTemplate, Check } from "lucide-react";
import { getTemplatesByCategory, applyTemplateToEvent } from "@/lib/actions/templates";
import { toast } from "sonner";
import type { TemplateCategory, EventTemplate } from "@/types";

type Props = {
  category: TemplateCategory;
  eventId: string;
  onClose: () => void;
  onApplied?: () => void;
};

export function LoadTemplateModal({ category, eventId, onClose, onApplied }: Props) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const categoryLabels: Record<TemplateCategory, string> = {
    menu: "Menu",
    pricing: "Pricing",
    pack_list: "Pack List",
    timeline: "Timeline",
    full_event: "Full Event",
  };

  useEffect(() => {
    async function load() {
      const result = await getTemplatesByCategory(category);
      if (!result.error) {
        setTemplates((result.templates ?? []).map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          name: t.name,
          description: t.description ?? null,
          category: t.category ?? "pricing",
          template_data: t.template_data ?? t.pricing_data ?? {},
          tags: t.tags ?? [],
          organization_id: t.organization_id ?? null,
          created_at: t.created_at,
          updated_at: t.updated_at ?? t.created_at,
        })));
      }
      setLoading(false);
    }
    load();
  }, [category]);

  async function handleApply(templateId: string) {
    setApplyingId(templateId);
    const result = await applyTemplateToEvent(templateId, eventId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${categoryLabels[category]} template applied`);
      onApplied?.();
      onClose();
    }
    setApplyingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0C1220] border border-[#2A3A5C] rounded-xl max-w-lg w-full max-h-[70vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-[#D4A373]" />
            <h2 className="font-display text-lg font-semibold">Load {categoryLabels[category]} Template</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1A2538] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#D4A373] mx-auto mb-3" />
            <p className="text-sm text-[#7A8BA8]">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center">
            <LayoutTemplate className="w-8 h-8 text-[#7A8BA8] mx-auto mb-3" />
            <h3 className="font-medium text-sm mb-1">No {categoryLabels[category].toLowerCase()} templates</h3>
            <p className="text-xs text-[#7A8BA8]">
              Save a {categoryLabels[category].toLowerCase()} as a template first.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1A2538] border border-[#2A3A5C] hover:border-[#344570] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-[#F4F1ED] truncate">{template.name}</h4>
                  {template.description && (
                    <p className="text-xs text-[#7A8BA8] truncate mt-0.5">{template.description}</p>
                  )}
                  <span className="text-[10px] text-[#7A8BA8] mt-1 block">
                    {new Date(template.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <button
                  onClick={() => handleApply(template.id)}
                  disabled={applyingId === template.id}
                  className="btn-primary text-xs px-3 py-1.5 ml-3 flex items-center gap-1.5 flex-shrink-0"
                >
                  {applyingId === template.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Apply
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-[#2A3A5C]">
          <button onClick={onClose} className="btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
