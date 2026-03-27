# CAIN Approval Queue System

This directory implements Phase 1 of the CAIN autonomous agent upgrade. It provides a complete approval queue system that allows users to review and approve/reject actions before CAIN executes them.

## Architecture

The system consists of five main components:

### 1. **types.ts** — Type Definitions
Defines all TypeScript types for the approval system:
- `CainActionType` — Union of all possible action types (assign_staff, send_proposal, etc.)
- `CainActionPayload` — Discriminated union where each action type has its own payload shape
- `CainPendingAction` — Matches the database table structure
- `CainActionResult` — Success/error response format
- `CainActionStats` — Dashboard statistics

### 2. **queue.ts** — CRUD Operations
Server-side functions for managing the approval queue:
- `proposeAction()` — Insert a new pending action (called by CAIN engine)
- `getPendingActions()` — Get all pending actions for a user
- `getAction()` — Get a single action
- `approveAction()` — User approves, mark as "approved"
- `rejectAction()` — User rejects with optional reason
- `markExecuted()` — Mark action as executed/failed after it runs
- `expireStaleActions()` — Clean up old pending actions (24h default)
- `getActionStats()` — Get counts for dashboard badges

### 3. **executor.ts** — Action Execution
Routes approved actions to the appropriate handlers:
- `executeAction()` — Main entry point (checks status, routes to specific handler)
- `executeAssignStaff()` — Call assignStaffAction from src/lib/actions/
- `executeSendProposal()` — Update proposal status + trigger email
- `executeConfirmEvent()` — Mark event as confirmed via proposal booking
- `executeCancelEvent()` — Mark event as canceled

Designed to be defensive — catches errors and returns `CainActionResult`.

### 4. **API Routes** — HTTP Endpoints
- `GET /api/cain/actions` — List pending actions (with optional status/org filters)
- `POST /api/cain/actions` — Propose a new action
- `GET /api/cain/actions/[id]` — Get action details
- `PATCH /api/cain/actions/[id]` — Approve/reject action

### 5. **Database** — Supabase Table
The `cain_pending_actions` table:
- Tracks all pending/approved/executed/rejected/expired actions
- RLS policies ensure users only see their own actions
- Indexed for fast lookups by user + status
- Expires entries after 24 hours automatically

## How It Works

### Flow: CAIN Proposes → User Reviews → Executor Runs

1. **CAIN Tool Calls approveAction Parameter**
   During the tool-use loop, if CAIN wants to take an action and the permission level is "draft-confirm" or "suggest", it calls:
   ```typescript
   const result = await proposeAction(userId, {
     action_type: "assign_staff",
     title: "Assign Chef to Gala Event",
     description: "Assign Marco (Head Chef) to the Smith Wedding on May 15",
     payload: {
       type: "assign_staff",
       eventId: "evt_123",
       staffMemberId: "staff_456",
       role: "Head Chef"
     },
     preview_data: {
       staffName: "Marco Rossi",
       eventName: "Smith Wedding",
       eventDate: "2026-05-15"
     }
   });
   ```

2. **Action Goes to Queue**
   - Stored in `cain_pending_actions` with status = "pending"
   - Expires after 24 hours
   - User sees badge/notification

3. **User Reviews**
   - Sees action in approval queue UI
   - Can preview data (staff name, event details, etc.)
   - Decides to approve or reject

4. **User Approves**
   - PATCH `/api/cain/actions/{id}` with `status: "approved"`
   - Can provide additional input if action requires_input = true
   - Action marked as "approved" in database

5. **Executor Runs Approved Actions**
   - Background job or webhook polls for approved actions
   - `executeAction()` routes to appropriate handler
   - Handler imports and calls existing server action
   - Result stored in database (success/error)
   - Action marked as "executed" or "failed"

## Integration with CAIN Engine

The CAIN tool-use loop needs to check permission levels and call `proposeAction()`:

```typescript
// In src/lib/cain/engine.ts or similar
import { getToolPermission, canAutoExecute, needsConfirmation } from "@/lib/cain/permissions";
import { proposeAction } from "@/lib/cain/actions/queue";

// When a tool result says to execute an action:
const permission = getToolPermission("assign_staff", userConfig);

if (permission === "auto-execute") {
  // Execute immediately
  const result = await assignStaffAction(...);
} else if (permission === "draft-confirm" || permission === "suggest") {
  // Propose for approval
  const { success, actionId } = await proposeAction(userId, {
    action_type: "assign_staff",
    title: "...",
    payload: { ... }
  });
  // Tell user: "I've queued this action for your approval: {actionId}"
}
```

## Adding New Action Types

To add a new action (e.g., "send_email"):

1. **Update types.ts**
   ```typescript
   export type CainActionType = ... | "send_email";

   export type CainActionPayload = ... | {
     type: "send_email";
     recipientEmail: string;
     subject: string;
     body: string;
   };
   ```

2. **Add executor in executor.ts**
   ```typescript
   case "send_email":
     result = await executeSendEmail(action);
     break;

   async function executeSendEmail(action: CainPendingAction): Promise<CainActionResult> {
     if (action.payload.type !== "send_email") {
       return { success: false, error: "Invalid payload type" };
     }
     // Call appropriate server action or service
     // Return CainActionResult
   }
   ```

3. **Update permissions.ts** (if needed)
   Add to DEFAULT_TOOL_PERMISSIONS array:
   ```typescript
   { tool: "send_email", level: "draft-confirm", description: "Send email", category: "execute" },
   ```

## Error Handling

All functions are defensive:
- `queue.ts` returns `{ success: boolean; error?: string }`
- `executor.ts` returns `CainActionResult` (catches try/catch)
- API routes return JSON with error field
- All Supabase errors are logged to error field

## Security

- All queries check `auth.uid() = user_id` (via RLS)
- API routes verify user auth before returning data
- Org filtering optional (multi-tenant support)
- User cannot approve/reject other users' actions
- Actions are immutable once executed

## Testing

Example test flow:

```typescript
// 1. Propose action
const { actionId } = await proposeAction(userId, {
  action_type: "assign_staff",
  title: "Test",
  payload: { type: "assign_staff", eventId: "e1", staffMemberId: "s1", role: "Chef" }
});

// 2. Verify it's pending
const { actions } = await getPendingActions(userId);
assert(actions.some(a => a.id === actionId && a.status === "pending"));

// 3. Approve it
const { success } = await approveAction(actionId, userId);
assert(success);

// 4. Execute it
const { action } = await getAction(actionId, userId);
const result = await executeAction(action);

// 5. Verify it's executed
const { action: updated } = await getAction(actionId, userId);
assert(updated.status === "executed" || updated.status === "failed");
```

## Next Steps

- [ ] Add background job to execute approved actions periodically
- [ ] Add webhook endpoint for real-time execution trigger
- [ ] Build UI for approval queue (modal, list, badge)
- [ ] Add more executor handlers (purchase orders, invoices, etc.)
- [ ] Add audit trail logging to capture who approved what
- [ ] Add undo functionality for recently executed actions
