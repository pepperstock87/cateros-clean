import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`portal-message:${ip}`, { limit: 10, windowMs: 60_000 }))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await req.json();
  const { share_token, message } = body;

  if (!share_token || !message?.trim()) {
    return NextResponse.json({ error: "Token and message are required" }, { status: 400 });
  }

  const trimmed = message.trim();
  if (trimmed.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find proposal by share token
  const { data: proposal, error: findError } = await supabase
    .from("proposals")
    .select("id, title, status, event_id, user_id, client_messages")
    .eq("share_token", share_token)
    .single();

  if (findError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Allow messaging on any non-terminal state
  if (["expired"].includes(proposal.status)) {
    return NextResponse.json({ error: "This proposal is no longer active" }, { status: 400 });
  }

  // Append the new message
  const clientMessages = Array.isArray(proposal.client_messages) ? [...proposal.client_messages] : [];
  const newMessage = {
    id: crypto.randomUUID(),
    from: "client" as const,
    message: trimmed,
    created_at: new Date().toISOString(),
  };
  clientMessages.push(newMessage);

  const { error: updateError } = await supabase
    .from("proposals")
    .update({
      client_messages: clientMessages,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  // Notify the caterer
  if (proposal.user_id) {
    let clientName = "A client";
    if (proposal.event_id) {
      const { data: ev } = await supabase
        .from("events")
        .select("client_name")
        .eq("id", proposal.event_id)
        .single();
      if (ev?.client_name) clientName = ev.client_name;
    }

    const linkUrl = proposal.event_id ? `/events/${proposal.event_id}` : "/proposals";

    await createNotification({
      userId: proposal.user_id,
      type: "revision_requested",
      title: "New Client Message",
      message: `${clientName} sent a message: "${trimmed.length > 100 ? trimmed.slice(0, 100) + "..." : trimmed}"`,
      linkUrl,
      emailData: {
        proposalTitle: proposal.title,
        clientName,
        eventUrl: linkUrl,
      },
    });
  }

  return NextResponse.json({ success: true, message: newMessage });
}
