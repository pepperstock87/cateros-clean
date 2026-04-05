import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOrg } from "@/lib/organizations";
import { getVenueProfileAction } from "@/lib/actions/venues";
import { getSpacesAction } from "@/lib/actions/spaces";
import { SpacesManager } from "@/components/venues/SpacesManager";
import { MapPin } from "lucide-react";

export default async function SpacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  const { data: venueProfile } = await getVenueProfileAction();
  const { data: spaces } = await getSpacesAction();

  // If no venue profile, show prompt to create one first
  if (!venueProfile) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="font-display text-xl md:text-2xl font-semibold">
            Spaces
          </h1>
          <p className="text-sm text-[#D4A373] mt-1">
            Manage rooms and spaces within your venue.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-[#2A3A5C] bg-[#0C1220]/50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/20 mb-4">
            <MapPin size={24} className="text-brand-300" />
          </div>
          <h2 className="text-lg font-semibold text-[#F4F1ED] mb-2">
            Venue Profile Required
          </h2>
          <p className="text-[#B8C4D8] mb-6 max-w-md mx-auto">
            You need to set up your venue profile first before you can add spaces. This helps us understand your venue's basic information.
          </p>
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-medium"
          >
            <MapPin size={16} />
            Go to Venue Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">
          Spaces
        </h1>
        <p className="text-sm text-[#D4A373] mt-1">
          Manage the rooms and spaces within {venueProfile.venue_name}.
        </p>
      </div>

      <SpacesManager
        spaces={spaces}
        venueProfileId={venueProfile.id}
      />
    </div>
  );
}
