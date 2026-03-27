"use client";

import { format } from "date-fns";

export function ClientDate() {
  return (
    <p className="text-xs md:text-sm text-[#D4A373] mt-1" suppressHydrationWarning>
      {format(new Date(), "EEEE, MMMM d, yyyy")}
    </p>
  );
}

export function ClientGreeting({ name, isDemo, companyName }: { name?: string; isDemo?: boolean; companyName?: string }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const displayName = isDemo
    ? `Welcome back, ${companyName || name || "there"}`
    : `Good ${greeting}, ${name?.split(" ")[0] ?? "there"}`;

  return (
    <h1 className="font-display text-xl md:text-2xl font-semibold" suppressHydrationWarning>
      {displayName}
    </h1>
  );
}
