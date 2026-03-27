/**
 * Proactive Operations — Types
 */

export interface ProactiveRule {
  id: string;
  name: string;
  description: string;
  schedule: "daily" | "weekly" | "on_event_approach";
  enabled: boolean;
  check: (userId: string, orgId: string | null) => Promise<ProactiveAction[]>;
}

export interface ProactiveAction {
  ruleId: string;
  ruleName: string;
  actionType: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  payload: Record<string, unknown>;
}

export interface ProactiveCheckResult {
  actionsProposed: number;
  results: Array<{
    rule: string;
    actions: number;
  }>;
}
