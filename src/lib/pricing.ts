import type { PricingData, MenuItem, StaffingLine, RentalLine, BarPackage } from "@/types";
import { DEFAULTS } from "@/lib/constants";

export function calculatePricing(params: {
  guestCount: number;
  menuItems: MenuItem[];
  staffing: StaffingLine[];
  rentals: RentalLine[];
  barPackage: BarPackage | null;
  adminPercent: number;
  taxPercent: number;
  targetMarginPercent: number;
}): PricingData {
  const { guestCount, menuItems, staffing, rentals, barPackage, adminPercent, taxPercent, targetMarginPercent } = params;
  
  // Input validation
  if (guestCount < 1) throw new Error("Guest count must be at least 1");
  if (adminPercent < 0 || adminPercent > 100) throw new Error("Admin fee must be between 0-100%");
  if (taxPercent < 0 || taxPercent > 100) throw new Error("Tax rate must be between 0-100%");
  if (targetMarginPercent < 0 || targetMarginPercent >= 100) throw new Error("Target margin must be between 0-99%");

  const foodCostTotal = menuItems.reduce((s, item) => {
    const type = item.pricingType || "per_guest";
    if (type === "flat") return s + item.costPerPerson;
    if (type === "per_unit") return s + item.costPerPerson * (item.quantity || 1);
    // per_guest (default): price × guest count
    return s + item.costPerPerson * (item.quantity || guestCount);
  }, 0);
  const staffingTotal = staffing.reduce((s, st) => s + st.hourlyRate * st.hours * st.headcount, 0);
  const rentalsTotal = rentals.reduce((s, r) => s + r.unitCost * r.quantity, 0);
  const barTotal = barPackage ? barPackage.costPerPerson * guestCount : 0;
  const subtotal = foodCostTotal + staffingTotal + rentalsTotal + barTotal;
  const adminFee = subtotal * (adminPercent / 100);
  const taxBase = subtotal + adminFee;
  const taxAmount = taxBase * (taxPercent / 100);
  const totalCost = subtotal + adminFee + taxAmount;
  const marginDivisor = 1 - targetMarginPercent / 100;
  const suggestedPrice = marginDivisor > 0 ? totalCost / marginDivisor : totalCost;
  const projectedMargin = suggestedPrice > 0 ? ((suggestedPrice - totalCost) / suggestedPrice) * 100 : 0;
  return { guestCount, menuItems, staffing, rentals, barPackage, adminPercent, taxPercent, foodCostTotal, staffingTotal, rentalsTotal, barTotal, subtotal, adminFee, taxAmount, totalCost, suggestedPrice, projectedMargin, targetMarginPercent };
}

export const DEFAULT_PRICING = { adminPercent: DEFAULTS.ADMIN_FEE_PERCENT, taxPercent: DEFAULTS.TAX_RATE_PERCENT, targetMarginPercent: DEFAULTS.PROFIT_MARGIN_PERCENT, menuItems: [], staffing: [], rentals: [], barPackage: null };
