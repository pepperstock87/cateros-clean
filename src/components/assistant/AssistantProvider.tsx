"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FloatingChatButton } from "./FloatingChatButton";

export function AssistantProvider() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthenticated(!!user);
    });
  }, []);

  if (!authenticated) return null;

  return <FloatingChatButton />;
}
