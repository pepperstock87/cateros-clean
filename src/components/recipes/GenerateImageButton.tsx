"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateRecipeCoverImage } from "@/lib/actions/recipes";

interface GenerateImageButtonProps {
  recipeId: string;
  recipeName: string;
  recipeDescription?: string | null;
  currentImageUrl?: string | null;
  isPro: boolean;
}

export function GenerateImageButton({
  recipeId,
  recipeName,
  recipeDescription,
  currentImageUrl,
  isPro,
}: GenerateImageButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl || null);

  if (!isPro) {
    return (
      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
        <Sparkles className="w-3.5 h-3.5" />
        AI dish images available on Pro
      </div>
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const details = [recipeName, recipeDescription].filter(Boolean).join(", ");
      const res = await fetch("/api/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "recipe", details }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate image");
        return;
      }

      // Save to recipe
      const result = await updateRecipeCoverImage(recipeId, data.imageUrl);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setImageUrl(data.imageUrl);
      toast.success("Dish image generated");
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRemove() {
    const result = await updateRecipeCoverImage(recipeId, null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setImageUrl(null);
    toast.success("Image removed");
  }

  if (imageUrl) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] aspect-[16/9]">
          <img
            src={imageUrl}
            alt={`${recipeName} dish photo`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
          <button
            onClick={handleRemove}
            className="text-xs text-[var(--text-muted)] hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-brand-500/40 text-[var(--text-muted)] hover:text-brand-400 transition-all group"
    >
      {generating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Generating dish image (3-5s)...</span>
        </>
      ) : (
        <>
          <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Generate AI Dish Image</span>
        </>
      )}
    </button>
  );
}
