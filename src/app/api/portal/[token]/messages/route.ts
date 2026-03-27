import { validatePortalToken } from "@/lib/cain/portal/tokens";
import { getPortalMessages, sendPortalMessage } from "@/lib/cain/portal/messages";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const validation = await validatePortalToken(token);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    
    const messages = await getPortalMessages(validation.data.eventId, 50);
    
    return NextResponse.json({
      messages: messages.reverse(),
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Failed to fetch portal messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const validation = await validatePortalToken(token);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    
    // Verify client has permission to send messages
    if (!validation.data.permissions.send_messages) {
      return NextResponse.json(
        { error: "Permission denied: cannot send messages" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { content } = body;
    
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }
    
    const result = await sendPortalMessage({
      eventId: validation.data.eventId,
      clientId: validation.data.clientId ?? undefined,
      portalTokenId: undefined,
      sender: "client",
      content: content.trim(),
    });
    
    return NextResponse.json(
      { id: result.id, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to send portal message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
