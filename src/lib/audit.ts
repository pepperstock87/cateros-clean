import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'clone' | 'generate_production'
  | 'send_proposal' | 'approve' | 'sign' | 'decline'
  | 'payment_received' | 'status_change'
  | 'import' | 'export';

export type AuditEntity =
  | 'event' | 'client' | 'recipe' | 'staff'
  | 'proposal' | 'payment' | 'template' | 'production'
  | 'hours_export' | 'payroll' | 'distributor';

export async function logAudit(data: {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
  organizationId?: string | null;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("audit_log").insert({
      user_id: data.userId,
      action: data.action,
      entity_type: data.entity,
      entity_id: data.entityId,
      entity_name: data.entityName || null,
      details: data.details || null,
      organization_id: data.organizationId || null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Don't let audit logging break the app
  }
}
