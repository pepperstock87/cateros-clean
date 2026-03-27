import { validatePortalToken } from "@/lib/cain/portal/tokens";
import { getPortalMessages } from "@/lib/cain/portal/messages";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validate token
    const validation = await validatePortalToken(token);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || "Invalid token" },
        { status: 401 }
      );
    }
    
    const supabase = await createClient();
    
    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", validation.data.eventId)
      .single();
    
    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    
    // Fetch proposal if exists
    const { data: proposal } = await supabase
      .from("proposals")
      .select("*")
      .eq("event_id", validation.data.eventId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    // Fetch messages
    const messages = await getPortalMessages(validation.data.eventId, 50);
    
    // Prepare summary response
    const eventSummary = {
      id: event.id,
      name: event.name,
      clientName: event.client_name,
      clientEmail: event.client_email,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      guestCount: event.guest_count,
      venue: event.venue,
      status: event.status,
      notes: event.notes,
    };
    
    const proposalSummary = proposal ? {
      id: proposal.id,
      status: proposal.status,
      pdfUrl: proposal.pdf_url,
      customMessage: proposal.custom_message,
      expiresAt: proposal.expires_at,
      viewedAt: proposal.viewed_at,
      contractAcceptedAt: proposal.contract_accepted_at,
    } : null;
    
    return NextResponse.json({
      tokenValid: true,
      tokenData: {
        clientEmail: validation.data.clientEmail,
        permissions: validation.data.permissions,
      },
      event: eventSummary,
      proposal: proposalSummary,
      messages: messages.reverse(),
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Portal validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
