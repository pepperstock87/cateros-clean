import { validatePortalToken } from "@/lib/cain/portal/tokens";
import { getPortalMessages } from "@/lib/cain/portal/messages";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PortalClient from "./PortalClient";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  
  // Validate token server-side
  const validation = await validatePortalToken(token);
  
  if (!validation.valid || !validation.data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
          padding: "20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "400px",
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ margin: "0 0 16px", fontSize: "20px", color: "#111827" }}>
            Access Denied
          </h1>
          <p style={{ margin: "0", color: "#6b7280", fontSize: "14px" }}>
            {validation.error || "This portal link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }
  
  const supabase = await createClient();
  
  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", validation.data.eventId)
    .single();
  
  if (!event) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
          padding: "20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "400px",
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ margin: "0 0 16px", fontSize: "20px", color: "#111827" }}>
            Event Not Found
          </h1>
          <p style={{ margin: "0", color: "#6b7280", fontSize: "14px" }}>
            The event associated with this link could not be found.
          </p>
        </div>
      </div>
    );
  }
  
  // Fetch proposal
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("event_id", validation.data.eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  // Fetch messages
  const messages = await getPortalMessages(validation.data.eventId, 100);
  
  // Fetch branding for the caterer
  const { data: branding } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", event.user_id)
    .single();
  
  return (
    <PortalClient
      token={token}
      event={event}
      proposal={proposal}
      messages={messages}
      branding={branding}
      tokenData={validation.data}
    />
  );
}
