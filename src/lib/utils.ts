import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
export function hasActiveSubscription(profile: any): boolean {
  // Check if they have an active or trialing subscription
  if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
    return true;
  }

  // If they have a trial_end date, check if it's still valid
  if (profile?.trial_end) {
    const trialEnd = new Date(profile.trial_end);
    const now = new Date();
    if (now < trialEnd) {
      return true;
    }
  }

  return false;
}

export function canAccessProFeatures(profile: any): boolean {
  return hasActiveSubscription(profile) && profile?.plan_tier === "pro";
}

export function canCreateEvents(profile: any): boolean {
  // Pro and Basic users with active subscriptions can create unlimited events
  if (hasActiveSubscription(profile) && (profile?.plan_tier === "basic" || profile?.plan_tier === "pro")) {
    return true;
  }
  
  // Free users are limited (this is checked elsewhere)
  return false;
}