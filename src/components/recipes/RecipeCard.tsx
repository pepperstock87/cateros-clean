"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { deleteRecipeAction } from "@/lib/actions/recipes";
import type { Recipe } from "@/types";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.name}"?`)) return;
    setDeleting(true);
    const result = await deleteRecipeAction(recipe.id);
    if (result?.error) toast.error(result.error);
    else toast.success("Recipe deleted");
    setDeleting(false);
  }

  return (
    <Link href={`/recipes/${recipe.id}`} className="card card-hover block cursor-pointer overflow-hidden">
      {recipe.cover_image_url && (
        <div className="aspect-[16/7] overflow-hidden">
          <img
            src={recipe.cover_image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{recipe.name}</span>
            {recipe.case_price && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800/40">Case pricing</span>
            )}
          </div>
          {recipe.description && <p className="text-xs text-[#D4A373] mt-0.5 truncate whitespace-pre-wrap">{recipe.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onClick={(e) => e.preventDefault()}>
          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/recipes/${recipe.id}/edit`); }} className="text-[#7A8BA8] hover:text-brand-400 transition-colors p-1">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(); }} disabled={deleting} className="text-[#7A8BA8] hover:text-red-400 transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#1F2A44] rounded-lg p-2.5 text-center">
          <div className="text-sm font-semibold text-brand-300">{formatCurrency(recipe.cost_per_serving)}</div>
          <div className="text-[10px] text-[#D4A373] mt-0.5">per person</div>
        </div>
        <div className="bg-[#1F2A44] rounded-lg p-2.5 text-center">
          <div className="text-sm font-semibold">{formatCurrency(recipe.total_cost)}</div>
          <div className="text-[10px] text-[#D4A373] mt-0.5">total cost</div>
        </div>
        <div className="bg-[#1F2A44] rounded-lg p-2.5 text-center">
          <div className="text-sm font-semibold">{recipe.servings}</div>
          <div className="text-[10px] text-[#D4A373] mt-0.5">servings</div>
        </div>
      </div>

      {recipe.ingredients.length > 0 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-[#D4A373] hover:text-[#F4F1ED] transition-colors">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {recipe.ingredients.length} ingredients
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {recipe.ingredients.map(ing => (
            <div key={ing.id} className="flex justify-between text-xs">
              <span className="text-[#D4A373]">{ing.name} ({ing.quantity} {ing.unit})</span>
              <span>{formatCurrency(ing.total_cost)}</span>
            </div>
          ))}
        </div>
      )}
      </div>
    </Link>
  );
}
