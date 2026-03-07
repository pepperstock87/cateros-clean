import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import { getVendorProfileAction } from "@/lib/actions/vendorProfiles";
import { VendorProfileEditor } from "@/components/vendors/VendorProfileEditor";

export default async function VendorProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/dashboard");

  const { data: vendorProfile } = await getVendorProfileAction();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">
          Vendor Profile
        </h1>
        <p className="text-sm text-[#9c8876] mt-1">
          Manage your business profile, contact details, and specialties.
        </p>
      </div>

      <VendorProfileEditor
        vendorProfile={vendorProfile}
        organizationId={org.orgId}
      />
    </div>
  );
}
