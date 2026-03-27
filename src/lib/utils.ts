import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DepositStatus, PaymentScheduleItem } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(safe);
}

export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
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

export function unwrapSingle<T>(val: T | T[]): T {
  return Array.isArray(val) ? val[0] : val;
}

export function canCreateEvents(profile: any): boolean {
  // Pro and Basic users with active subscriptions can create unlimited events
  if (hasActiveSubscription(profile) && (profile?.plan_tier === "basic" || profile?.plan_tier === "pro")) {
    return true;
  }

  // Free users are limited (this is checked elsewhere)
  return false;
}

/**
 * Determine the deposit status for an event based on its payment schedule items.
 *
 * Looks for any installment whose name contains "deposit" (case-insensitive).
 * If none exists, the status is "none" (no deposit due).
 * Otherwise the status is derived from the schedule item's status and due_date.
 */
export function getDepositStatus(scheduleItems: Pick<PaymentScheduleItem, "installment_name" | "status" | "due_date">[]): DepositStatus {
  // Find deposit installment(s) — use the first match sorted by sort_order (caller should pre-sort)
  const depositItem = scheduleItems.find(
    (item) => item.installment_name.toLowerCase().includes("deposit")
  );

  if (!depositItem) return "none";

  if (depositItem.status === "paid" || depositItem.status === "waived") return "paid";
  if (depositItem.status === "failed") return "failed";

  // Status is 'pending' or 'due' — check if overdue
  if (depositItem.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(depositItem.due_date);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) return "overdue";
  }

  return "pending";
}

/** Safely parse a date string that might be ISO timestamp or YYYY-MM-DD.
 *  Always treats date-only values as local dates to avoid timezone shift. */
export function safeParseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(NaN);
  // Extract just the YYYY-MM-DD portion to avoid timezone offset issues
  // This ensures "2026-08-29T00:00:00+00:00" → Aug 29 in any timezone
  const dateOnly = dateStr.substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return new Date(dateOnly + "T12:00:00");
  }
  // Fallback for non-standard formats
  return new Date(dateStr);
}