"use client";

import { useEffect } from "react";

export function ViewTracker({ shareToken }: { shareToken: string }) {
  useEffect(() => {
    fetch("/api/proposals/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ share_token: shareToken, action: "viewed" }),
    }).catch(() => {});
  }, [shareToken]);

  return null;
}
