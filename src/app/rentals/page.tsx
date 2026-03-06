import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { RentalItem } from "@/types";
import { Package } from "lucide-react";
import { RentalList } from "./RentalList";

export default async function RentalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("rental_items")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  const items: RentalItem[] = data ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Rentals & Equipment</h1>
          <p className="text-sm text-[#9c8876] mt-1">{items.length} item{items.length !== 1 ? "s" : ""} in your library</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <Package className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No rental items yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Save your common rentals and equipment to quickly add them to events.</p>
        </div>
      ) : null}

      <RentalList initialItems={items} />
    </div>
  );
}
