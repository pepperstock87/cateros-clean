import { UtensilsCrossed, Users, Wine } from "lucide-react";
import type { PricingData } from "@/types";

type Props = {
  pricingData: PricingData | null;
};

export function PortalMenu({ pricingData }: Props) {
  if (!pricingData) {
    return (
      <div className="card p-8 text-center">
        <UtensilsCrossed className="w-10 h-10 text-[#3d3428] mx-auto mb-3" />
        <p className="text-sm text-[#6b5a4a]">Menu details will appear here once finalized.</p>
      </div>
    );
  }

  const { menuItems, staffing, barPackage, guestCount } = pricingData;

  return (
    <div className="space-y-4">
      {/* Guest count */}
      <div className="card p-4 flex items-center gap-3">
        <Users className="w-4 h-4 text-[#9c8876]" />
        <span className="text-sm text-[#f5ede0]">
          Menu prepared for <span className="font-semibold">{guestCount}</span> guests
        </span>
      </div>

      {/* Menu items */}
      {menuItems.length > 0 && (
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-4 flex items-center gap-2">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Menu Items
          </h3>
          <div className="space-y-3">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1613] border border-[#2e271f]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#f5ede0]">{item.name}</div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <span className="text-xs text-[#9c8876] bg-[#251f19] px-2 py-1 rounded">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staffing - show roles only, no rates */}
      {staffing.length > 0 && (
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Service Team
          </h3>
          <div className="space-y-2">
            {staffing.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1a1613] border border-[#2e271f]"
              >
                <span className="text-sm font-medium text-[#f5ede0]">{staff.role}</span>
                <div className="flex items-center gap-3 text-xs text-[#9c8876]">
                  <span>{staff.headcount} {staff.headcount === 1 ? "person" : "people"}</span>
                  <span>{staff.hours} hrs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar package */}
      {barPackage && (
        <div className="card p-5">
          <h3 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wine className="w-3.5 h-3.5" />
            Bar Package
          </h3>
          <div className="p-3 rounded-lg bg-[#1a1613] border border-[#2e271f]">
            <div className="text-sm font-medium text-[#f5ede0]">{barPackage.label}</div>
            <div className="text-xs text-[#9c8876] mt-1">
              Included for {guestCount} guests
            </div>
          </div>
        </div>
      )}

      {/* Empty state for no menu items */}
      {menuItems.length === 0 && staffing.length === 0 && !barPackage && (
        <div className="card p-8 text-center">
          <UtensilsCrossed className="w-10 h-10 text-[#3d3428] mx-auto mb-3" />
          <p className="text-sm text-[#6b5a4a]">No menu items have been added yet.</p>
        </div>
      )}
    </div>
  );
}
