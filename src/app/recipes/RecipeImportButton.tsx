"use client";

import { CSVImport } from "@/components/ui/CSVImport";
import { importRecipes } from "@/lib/actions/import";

export function RecipeImportButton() {
  return (
    <CSVImport
      entityType="recipes"
      expectedColumns={["name", "description", "servings", "category"]}
      sampleRow={{
        name: "Grilled Salmon",
        description: "Pan-seared with lemon butter",
        servings: "4",
        category: "Mains",
      }}
      onImport={importRecipes}
    />
  );
}
