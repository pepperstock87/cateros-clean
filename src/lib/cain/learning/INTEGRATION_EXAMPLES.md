# CAIN Memory System Integration Examples

This document shows practical examples of how to integrate the memory system into existing CAIN code.

## 1. Injecting Memory into Event Builder

In your event builder engine or system prompt builder, retrieve memories and inject into context:

```typescript
// src/lib/cain/engine.ts or similar

import { retrieveRelevantMemories } from "./learning/retriever";

async function buildEventBuilderContext(params: {
  userId: string;
  orgId: string | null;
  brief: string;
  clientId?: string;
}) {
  // Build company context, client context, etc.
  const company = await buildCompanyContext(params.userId, params.orgId);
  
  // NEW: Retrieve and inject memories
  const memories = await retrieveRelevantMemories({
    userId: params.userId,
    orgId: params.orgId,
    brief: params.brief,
    clientId: params.clientId,
    limit: 15,
  });
  
  // Combine into system prompt
  const systemPrompt = `
You are CAIN, a catering operations director.

${companyContext}

${clientContext}

${memories}  // <-- Memories injected here

Your goal is to create a comprehensive event plan...
`;
  
  return systemPrompt;
}
```

## 2. Extracting Memories After Event Builder Completes

In your event builder completion handler, extract and save memories:

```typescript
// src/app/api/cain/event-builder/route.ts or similar

import { handleSessionCompletion } from "@/lib/cain/learning/session-handler";

async function finalizeEventBuilder(request: NextRequest) {
  const body = await request.json();
  const { userId, orgId, sessionMessages, finalPlan, rejectedActions } = body;

  // Commit the plan to database
  const committedEvent = await commitCainPlan({ plan: finalPlan, userId, orgId });

  // NEW: Extract and save learnings
  const memoriesSaved = await handleSessionCompletion({
    userId,
    orgId,
    sessionId: finalPlan.id, // or session ID
    sessionMessages,
    plan: finalPlan,
    rejectedActions,
  });

  console.log(`Plan committed and ${memoriesSaved} memories saved`);

  return NextResponse.json({
    success: true,
    eventId: committedEvent.eventId,
    memoriesSaved,
  });
}
```

## 3. Tracking Rejected Actions

When CAIN proposes an action and the user rejects it, track the rejection:

```typescript
// In your chat or event builder UI

const rejectedActions: Array<{ action_type: string; reason?: string }> = [];

// When user rejects "send_proposal_email"
rejectedActions.push({
  action_type: "send_proposal_email",
  reason: "User prefers to send proposals personally",
});

// When user rejects "auto_assign_lead_server"
rejectedActions.push({
  action_type: "auto_assign_lead_server",
  reason: "User wants to review staff assignments first",
});

// Pass to handleSessionCompletion
await handleSessionCompletion({
  userId,
  orgId,
  sessionId,
  sessionMessages,
  plan,
  rejectedActions, // <-- Collected rejections
});
```

## 4. Displaying Memories in UI

Create a memory panel component that shows what CAIN has learned:

```typescript
// components/cain/MemoryPanel.tsx

"use client";

import { useState, useEffect } from "react";

export function MemoryPanel({ userId }: { userId: string }) {
  const [memories, setMemories] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchMemories = async () => {
      const query = new URLSearchParams();
      if (filter !== "all") query.append("type", filter);
      
      const res = await fetch(`/api/cain/memory?${query}`);
      const data = await res.json();
      setMemories(data.memories);
    };

    fetchMemories();
  }, [filter]);

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <h3 className="font-semibold mb-3">CAIN Memory</h3>
      
      <div className="flex gap-2 mb-3">
        {["all", "preference", "pattern", "insight", "correction"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded text-sm ${
              filter === t ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {memories.map((m) => (
          <div key={m.id} className="bg-white p-2 rounded text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{m.memory_type}</span>
              <span className="text-xs text-gray-500">
                {(m.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-gray-700">{m.content}</p>
            {m.subject && (
              <p className="text-xs text-gray-500 mt-1">Subject: {m.subject}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 5. Admin Memory Management

Create an admin dashboard to view and manage memories:

```typescript
// app/admin/cain-memory/page.tsx

"use client";

import { useState, useEffect } from "react";

export default function CainMemoryAdmin() {
  const [memories, setMemories] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const handleSearch = async () => {
    const res = await fetch(`/api/cain/memory?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setMemories(data.memories);
  };

  const handleDelete = async (memoryId: string) => {
    const res = await fetch("/api/cain/memory", {
      method: "DELETE",
      body: JSON.stringify({ memoryId }),
    });

    if (res.ok) {
      setMemories((m) => m.filter((mem) => mem.id !== memoryId));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">CAIN Memory Management</h1>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Search
        </button>
      </div>

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Type</th>
            <th className="border p-2 text-left">Category</th>
            <th className="border p-2 text-left">Content</th>
            <th className="border p-2 text-left">Confidence</th>
            <th className="border p-2 text-left">Reinforced</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {memories.map((m) => (
            <tr key={m.id}>
              <td className="border p-2">{m.memory_type}</td>
              <td className="border p-2">{m.category}</td>
              <td className="border p-2 text-sm">{m.content}</td>
              <td className="border p-2">{(m.confidence * 100).toFixed(0)}%</td>
              <td className="border p-2 text-center">{m.times_reinforced}</td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => handleDelete(m.id)}
                  className="px-2 py-1 bg-red-600 text-white text-sm rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 6. Scheduled Memory Decay

Set up a nightly job to decay old memories (using a cron job or scheduler):

```typescript
// scripts/decay-old-memories.ts or API route for scheduled tasks

import { decayOldMemories } from "@/lib/cain/learning/session-handler";

export async function decayAllUserMemories() {
  const supabase = await createClient();

  // Get all users
  const { data: users } = await supabase.auth.admin.listUsers();

  let totalDecayed = 0;

  for (const user of users.users) {
    const decayed = await decayOldMemories(user.id);
    totalDecayed += decayed;
  }

  console.log(`Decayed ${totalDecayed} total memories`);
}

// Call this from:
// - Vercel cron job: /api/cron/decay-memories
// - Supabase edge function
// - External scheduler (e.g., GitHub Actions)
```

Example API route for cron trigger:

```typescript
// src/app/api/cron/decay-memories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decayAllUserMemories } from "@/scripts/decay-old-memories";

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await decayAllUserMemories();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Decay job failed:", error);
    return NextResponse.json({ error: "Decay job failed" }, { status: 500 });
  }
}
```

## 7. Testing Memory Extraction

Unit test example:

```typescript
// __tests__/cain-memory.test.ts

import { extractMemories } from "@/lib/cain/learning/extractor";

describe("Memory Extraction", () => {
  it("should extract rejection as correction memory", () => {
    const memories = extractMemories({
      userId: "test-user",
      sessionMessages: [],
      rejectedActions: [
        {
          action_type: "send_proposal_email",
          reason: "User prefers personal contact",
        },
      ],
    });

    expect(memories).toHaveLength(1);
    expect(memories[0].memoryType).toBe("correction");
    expect(memories[0].content).toContain("send proposal email");
  });

  it("should extract staff preferences from plan", () => {
    const mockPlan = {
      pricing: {
        staffing: [
          { role: "Lead Server — Maria Rodriguez", hourlyRate: 25, hours: 4, headcount: 1 },
          { role: "Lead Server — Maria Rodriguez", hourlyRate: 25, hours: 4, headcount: 1 },
        ],
      },
    };

    const memories = extractMemories({
      userId: "test-user",
      sessionMessages: [],
      plan: mockPlan as any,
    });

    const preference = memories.find((m) => m.memoryType === "preference");
    expect(preference).toBeDefined();
    expect(preference?.content).toContain("Maria");
  });
});
```

## Integration Checklist

- [ ] Add memory injection to event builder system prompt
- [ ] Call handleSessionCompletion after event builder finish
- [ ] Track rejected actions in event builder UI
- [ ] Create MemoryPanel component for UI display
- [ ] Create admin memory management page
- [ ] Set up nightly decay job
- [ ] Add unit tests for extraction rules
- [ ] Monitor memory stats in analytics
- [ ] Document memory best practices for team
