"use client";

import { deleteRecipeAction } from "@/lib/actions/recipes";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteRecipeButton({ recipeId, recipeName }: { recipeId: string; recipeName: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${recipeName}"? This cannot be undone.`)) return;
    const result = await deleteRecipeAction(recipeId);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Recipe deleted");
      router.push("/recipes");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-[#6b5a4a] hover:text-red-400 transition-colors p-2"
      title="Delete recipe"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
