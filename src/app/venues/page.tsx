import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { getVenueProfileAction } from "@/lib/actions/venues";
import { VenueProfileEditor } from "@/components/venues/VenueProfileEditor";

export default async function VenuesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/dashboard");

  const { data: venueProfile } = await getVenueProfileAction();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">
          Venue Profile
        </h1>
        <p className="text-sm text-[#9c8876] mt-1">
          Manage your venue details, capacity, and amenities.
        </p>
      </div>

      <VenueProfileEditor
        venueProfile={venueProfile}
        organizationId={org.orgId}
      />
    </div>
  );
}
