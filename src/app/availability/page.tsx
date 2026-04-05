import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { VenueCalendar } from "@/components/venues/VenueCalendar";
import { getBookingsForMonthAction } from "@/lib/actions/bookings";
import type { VenueSpace, VenueBooking } from "@/types";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/venues");

  // Fetch venue spaces for this organization
  const { data: spaces, error: spacesError } = await supabase
    .from("venue_spaces")
    .select("*")
    .eq("organization_id", org.orgId)
    .eq("is_active", true)
    .order("sort_order");

  if (spacesError || !spaces || spaces.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-[#182030] border border-[#2A3A5C] rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-[#F4F1ED] mb-2">
            No Spaces Found
          </h1>
          <p className="text-[#7A8BA8] mb-4">
            You need to create venue spaces before managing bookings.
          </p>
          <a
            href="/venues"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded font-medium"
          >
            Go to Venues
          </a>
        </div>
      </div>
    );
  }

  // Get current month bookings
  const now = new Date();
  const { data: bookings } = await getBookingsForMonthAction(
    now.getFullYear(),
    now.getMonth() + 1
  );

  return (
    <div className="min-h-screen bg-[#0C1220]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F4F1ED] mb-2">
            Availability Calendar
          </h1>
          <p className="text-[#7A8BA8]">
            Manage venue space bookings and availability
          </p>
        </div>

        <VenueCalendarClient
          spaces={spaces as VenueSpace[]}
          initialBookings={bookings || []}
        />
      </div>
    </div>
  );
}

function VenueCalendarClient({
  spaces,
  initialBookings,
}: {
  spaces: VenueSpace[];
  initialBookings: VenueBooking[];
}) {
  return (
    <VenueCalendar
      spaces={spaces}
      bookings={initialBookings}
      onBookingsChange={() => {
        // Callback for when bookings change
      }}
    />
  );
}
