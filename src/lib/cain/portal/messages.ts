import { createClient } from "@/lib/supabase/server";

export async function getPortalMessages(
  eventId: string,
  limit?: number
): Promise<
  Array<{
    id: string;
    sender: string;
    content: string;
    createdAt: string;
    readAt: string | null;
    cainAnalysis?: Record<string, unknown> | null;
    approvalStatus?: string;
  }>
> {
  const supabase = await createClient();
  const messageLimit = limit ?? 50;
  
  const { data, error } = await supabase
    .from("client_portal_messages")
    .select("id, sender, content, created_at, read_at, cain_analysis, approval_status")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(messageLimit);
  
  if (error) {
    throw new Error(`Failed to fetch portal messages: ${error.message}`);
  }
  
  return (data || []).map((msg) => ({
    id: msg.id,
    sender: msg.sender,
    content: msg.content,
    createdAt: msg.created_at,
    readAt: msg.read_at,
    cainAnalysis: msg.cain_analysis,
    approvalStatus: msg.approval_status,
  }));
}

export async function sendPortalMessage(params: {
  eventId: string;
  clientId?: string;
  portalTokenId?: string;
  sender: "client" | "caterer" | "cain";
  content: string;
  cainAnalysis?: Record<string, unknown>;
  proposedChanges?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("client_portal_messages")
    .insert({
      event_id: params.eventId,
      client_id: params.clientId || null,
      portal_token_id: params.portalTokenId || null,
      sender: params.sender,
      content: params.content,
      cain_analysis: params.cainAnalysis || null,
      proposed_changes: params.proposedChanges || null,
    })
    .select("id")
    .single();
  
  if (error) {
    throw new Error(`Failed to send portal message: ${error.message}`);
  }
  
  return { id: data.id };
}

export async function markMessagesRead(
  eventId: string,
  sender: string
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("client_portal_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("sender", sender)
    .is("read_at", null);
  
  if (error) {
    throw new Error(`Failed to mark messages as read: ${error.message}`);
  }
}

export async function updateMessageApprovalStatus(
  messageId: string,
  status: "pending" | "approved" | "rejected"
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("client_portal_messages")
    .update({ approval_status: status })
    .eq("id", messageId);
  
  if (error) {
    throw new Error(`Failed to update message approval status: ${error.message}`);
  }
}
