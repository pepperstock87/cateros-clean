import type { PricingData, MenuItem, StaffingLine, RentalLine, BarPackage } from "@/types";

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
  const foodCostTotal = menuItems.reduce((s, item) => s + item.costPerPerson * (item.quantity || guestCount), 0);
  const staffingTotal = staffing.reduce((s, st) => s + st.hourlyRate * st.hours * st.headcount, 0);
  const rentalsTotal = rentals.reduce((s, r) => s + r.unitCost * r.quantity, 0);
  const barTotal = barPackage ? barPackage.costPerPerson * guestCount : 0;
  const subtotal = foodCostTotal + staffingTotal + rentalsTotal + barTotal;
  const adminFee = subtotal * (adminPercent / 100);
  const taxBase = subtotal + adminFee;
  const taxAmount = taxBase * (taxPercent / 100);
  const totalCost = subtotal + adminFee + taxAmount;
  const suggestedPrice = totalCost / (1 - targetMarginPercent / 100);
  const projectedMargin = ((suggestedPrice - totalCost) / suggestedPrice) * 100;
  return { guestCount, menuItems, staffing, rentals, barPackage, adminPercent, taxPercent, foodCostTotal, staffingTotal, rentalsTotal, barTotal, subtotal, adminFee, taxAmount, totalCost, suggestedPrice, projectedMargin, targetMarginPercent };
}

export const DEFAULT_PRICING = { adminPercent: 22, taxPercent: 8.5, targetMarginPercent: 28, menuItems: [], staffing: [], rentals: [], barPackage: null };
