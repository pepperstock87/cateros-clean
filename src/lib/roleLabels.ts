import type { BusinessType } from "@/types";

/**
 * Role-specific label overrides for navigation items and page titles.
 * Maps business type to route path -> display label.
 */
export const ROLE_LABELS: Record<BusinessType, Record<string, string>> = {
  caterer: {},
  restaurant: { "/events": "Private Events" },
  private_chef: { "/events": "Dinners" },
  venue: { "/events": "Bookings", "/proposals": "Quotes", "/clients": "Guests", "/spaces": "Spaces" },
  event_planner: { "/staff": "Vendors" },
  florist: { "/events": "Jobs", "/inventory": "Stems & Supplies", "/proposals": "Floral Quotes" },
  band_entertainment: { "/events": "Gigs", "/proposals": "Contracts", "/staff": "Band Members" },
  rental_company: { "/events": "Reservations", "/inventory": "Equipment", "/proposals": "Rental Quotes" },
  hospitality_management: {},
  other: {},
};

/**
 * Get the role-appropriate label for a page path.
 * Returns the custom label if one exists for this business type and path,
 * otherwise returns the fallback label.
 */
export function getPageLabel(businessType: BusinessType, path: string, fallback: string): string {
  const labels = ROLE_LABELS[businessType] || {};
  return labels[path] || fallback;
}
