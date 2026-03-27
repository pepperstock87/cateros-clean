"use client";

import { format } from "date-fns";

export function GeneratedDate({ prefix = "Generated" }: { prefix?: string }) {
  return (
    <span suppressHydrationWarning>
      {prefix} {format(new Date(), "MMMM d, yyyy")}
    </span>
  );
}
