/**
 * Proactive Scheduler — Main engine for running time-based checks
 * Queries rules and proposes actions via the approval queue
 */

import { createClient } from "@/lib/supabase/server";
import { proposeAction } from "@/lib/cain/actions/queue";
import { ALL_RULES } from "./rules";
import type { ProactiveCheckResult } from "./types";
import type { CainActionType, CainActionPayload } from "@/lib/cain/actions/types";

/**
 * Run all proactive checks for a user
 * Returns count of actions proposed and results breakdown
 * Idempotent: won't create duplicates for same event
 */
export async function runProactiveChecks(userId: string, orgId: string | null): Promise<ProactiveCheckResult> {
  const results: ProactiveCheckResult["results"] = [];
  let totalActionsProposed = 0;

  // Execute each rule in parallel
  const ruleResults = await Promise.all(
    ALL_RULES.map(async (rule) => {
      if (!rule.enabled) {
        return { rule: rule.name, actions: 0 };
      }

      try {
        const actions = await rule.check(userId, orgId);

        // Propose each action to the queue
        let successCount = 0;
        for (const action of actions) {
          const result = await proposeAction(
            userId,
            {
              action_type: action.actionType as CainActionType,
              title: action.title,
              description: action.description,
              payload: action.payload as unknown as CainActionPayload,
              priority: action.priority,
              organization_id: orgId ?? undefined,
            },
            orgId
          );

          if (result.success) {
            successCount++;
          }
        }

        return { rule: rule.name, actions: successCount };
      } catch (error) {
        console.error(`Error running rule ${rule.id}:`, error);
        return { rule: rule.name, actions: 0 };
      }
    })
  );

  // Aggregate results
  for (const ruleResult of ruleResults) {
    results.push(ruleResult);
    totalActionsProposed += ruleResult.actions;
  }

  return {
    actionsProposed: totalActionsProposed,
    results,
  };
}
