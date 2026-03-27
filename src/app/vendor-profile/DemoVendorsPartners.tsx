"use client";

import {
  Flower2,
  Music,
  Camera,
  Truck,
  Leaf,
  Croissant,
  Star,
  Mail,
  Phone,
  ExternalLink,
  TrendingUp,
  Package,
} from "lucide-react";
import { toast } from "sonner";

const eventVendors = [
  {
    name: "Bloom Floral Co.",
    role: "Florist",
    icon: Flower2,
    rating: 4.9,
    contact: "hello@bloomfloral.co",
    phone: "(555) 234-8901",
    specialty: "Centerpieces, installations, bouquets",
    eventsThisYear: 14,
    status: "Preferred",
  },
  {
    name: "Silver Sound DJs",
    role: "Band / DJ",
    icon: Music,
    rating: 4.8,
    contact: "bookings@silversound.live",
    phone: "(555) 567-3210",
    specialty: "Live DJ sets, MC services, lighting",
    eventsThisYear: 22,
    status: "Preferred",
  },
  {
    name: "Lens & Light Studio",
    role: "Photographer",
    icon: Camera,
    rating: 5.0,
    contact: "info@lensandlight.co",
    phone: "(555) 890-1234",
    specialty: "Event photography, drone footage, same-day edits",
    eventsThisYear: 18,
    status: "Preferred",
  },
];

const foodPartners = [
  {
    name: "Performance Food Group (PFG)",
    role: "Primary Distributor",
    icon: Truck,
    rating: 4.9,
    contact: "orders@pfgc.com",
    phone: "(555) 100-2000",
    specialty: "Full-service food distribution, custom ordering",
    isPrimary: true,
  },
  {
    name: "Local Produce Co.",
    role: "Produce Supplier",
    icon: Leaf,
    rating: 4.7,
    contact: "farm@localproduce.co",
    phone: "(555) 321-6543",
    specialty: "Seasonal & organic produce, farm-to-table",
  },
  {
    name: "Artisan Bread Co.",
    role: "Bakery",
    icon: Croissant,
    rating: 4.8,
    contact: "orders@artisanbread.co",
    phone: "(555) 456-7890",
    specialty: "Sourdough, brioche, specialty rolls, dessert breads",
  },
];

function handleDemoAction() {
  toast.info("This is a read-only demo. Editing is disabled in sandbox mode.");
}

export function DemoVendorsPartners() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="font-display text-xl md:text-2xl font-semibold">
          Vendors & Partners
        </h1>
        <p className="text-sm text-[#D4A373] mt-1">
          Your event vendor network and food supply partnerships.
        </p>
      </div>

      {/* Event Vendors Section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[#F4F1ED] mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#D4A373]" />
          Event Vendors
        </h2>
        <div className="space-y-3">
          {eventVendors.map((vendor) => (
            <VendorCard key={vendor.name} vendor={vendor} />
          ))}
        </div>
      </section>

      {/* Food & Supply Partners Section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[#F4F1ED] mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#D4A373]" />
          Food & Supply Partners
        </h2>
        <div className="space-y-3">
          {foodPartners.map((partner) => (
            <VendorCard
              key={partner.name}
              vendor={partner}
              isPrimary={(partner as any).isPrimary}
            />
          ))}
        </div>

        {/* Purchasing Overview */}
        <div className="mt-4 rounded-xl border border-[#2A3A5C] bg-[#182030] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#D4A373]" />
            <h3 className="text-sm font-semibold text-[#F4F1ED]">
              Purchasing Overview
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#7A8BA8] block mb-1">
                Primary Distributor
              </span>
              <span className="text-sm text-[#F4F1ED] font-medium">
                Performance Food Group
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#7A8BA8] block mb-1">
                Est. Weekly Volume
              </span>
              <span className="text-sm text-[#F4F1ED] font-medium">
                $3,500 – $7,000
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#7A8BA8] block mb-1">
                Top Categories
              </span>
              <span className="text-sm text-[#F4F1ED]">
                Proteins, Dairy, Produce
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function VendorCard({
  vendor,
  isPrimary,
}: {
  vendor: (typeof eventVendors)[0] | (typeof foodPartners)[0];
  isPrimary?: boolean;
}) {
  const Icon = vendor.icon;

  return (
    <div
      className={`rounded-xl border bg-[#182030] p-4 ${
        isPrimary
          ? "border-[#D4A373]/40 ring-1 ring-[#D4A373]/20"
          : "border-[#2A3A5C]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              isPrimary
                ? "bg-[#D4A373]/15 text-[#D4A373]"
                : "bg-[#1E2D45] text-[#7A8BA8]"
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[#F4F1ED]">
                {vendor.name}
              </span>
              {isPrimary && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A373]/15 text-[#D4A373] font-medium uppercase tracking-wider">
                  Primary
                </span>
              )}
              {"status" in vendor && vendor.status && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                  {vendor.status}
                </span>
              )}
            </div>
            <p className="text-xs text-[#7A8BA8] mt-0.5">{vendor.role}</p>
            <p className="text-xs text-[#7A8BA8]/70 mt-1">
              {vendor.specialty}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1 text-xs text-[#D4A373]">
          <Star className="w-3 h-3 fill-[#D4A373]" />
          {vendor.rating}
        </div>
      </div>

      {/* Contact row */}
      <div className="mt-3 pt-3 border-t border-[#2A3A5C] flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs text-[#7A8BA8]">
          <Mail className="w-3 h-3" />
          {vendor.contact}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#7A8BA8]">
          <Phone className="w-3 h-3" />
          {vendor.phone}
        </span>
        {"eventsThisYear" in vendor && (
          <span className="text-xs text-[#7A8BA8]">
            {vendor.eventsThisYear} events this year
          </span>
        )}
        <button
          onClick={handleDemoAction}
          className="ml-auto inline-flex items-center gap-1 text-xs text-[#D4A373] hover:text-[#E8B98A] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View
        </button>
      </div>
    </div>
  );
}
