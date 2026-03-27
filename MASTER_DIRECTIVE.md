# CATEROS — MASTER DIRECTIVE
**Version 2.0 — March 27, 2026 | Confidential & Proprietary**

This is the authoritative product and engineering reference for Cateros. Claude Code should treat this document as the primary source of truth for architectural decisions, feature logic, build priorities, and coding standards. Read this before starting any non-trivial feature.

---

## 1. PRODUCT VISION

Cateros is the operating system for professional catering and hospitality event businesses. It exists to eliminate the chaos between a client call and a fully executed event — connecting everything a caterer needs to sell, plan, staff, cook, and get paid inside one platform.

### The Problem We Solve
Catering operators juggle spreadsheets, texts, PDF proposals, paper prep sheets, verbal staff assignments, and separate billing — with no single source of truth. The result is missed details, under-priced jobs, blown food costs, and exhausted teams. Cateros replaces that fragmentation with an integrated workflow engine purpose-built for event food and beverage operations.

### Target Users
- **Primary:** Independent caterers and catering companies (1–30 staff, 50–500 events/year)
- **Secondary:** Private chefs, event venues with in-house food programs, corporate dining operators
- **Future:** Hospitality networks — shared kitchens, staffing agencies, specialty vendors

### North Star Metric
Revenue per confirmed event, tracked across the full lifecycle from proposal through QuickBooks sync. Secondary: CAIN adoption rate, recipe library depth, staff scheduling accuracy, time-to-proposal.

### Subscription Tiers
| Tier | Price | Access |
|------|-------|--------|
| Basic | $65/mo (14-day free trial) | Event management, limited recipes, proposals, basic scheduling |
| Pro | $149/mo (14-day free trial) | Full CAIN, production sheets, shopping lists, distributor sync, QuickBooks, payroll, advanced reporting, multi-org, vendor collaboration |

The Pro tier is the clear operational default. Basic is for acquisition and smaller operators. Pro is for retention and revenue. Both tiers include a 14-day free trial via Stripe.

> **Subscription Gating Rule:** `trialing` status grants full tier access, identical to `active`. Any entitlement check must treat `trialing` and `active` identically. This applies to both `getUserEntitlements()` (user-level) and `getOrgEntitlements()` (org-level). When no organization exists, org-level checks must fall back to user-level subscription status.

---

## 2. PLATFORM ARCHITECTURE

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript — strict mode |
| Database / Auth | Supabase (Postgres + Auth + SSR + Row Level Security) |
| Payments | Stripe — subscriptions + Stripe Connect for client-facing payments |
| AI / CAIN | Anthropic Claude (latest Sonnet model) — agentic event builder |
| Styling | Tailwind CSS + Radix UI |
| PDF Generation | jsPDF + jsPDF-autotable |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Validation | Zod schemas in `src/lib/validations.ts` for all form inputs |
| Fonts | DM Sans (body) + Georgia (display) + DM Mono (code) via Google Fonts |
| Deployment | Vercel |
| Monitoring | (TODO) Sentry for runtime errors, Vercel Analytics for performance |

> **Model Version Note:** The CAIN model string is configured via environment variable / constant, not hardcoded in the directive. Update the model in `src/lib/cain/` constants when new versions are available.

### Architecture Principles

> **Event data is the center of gravity.** Every feature — recipes, staff, shopping lists, proposals, production sheets — should trace back to an event. Build every new feature to be event-contextual first.

- **Data mutations:** Server Actions in `src/lib/actions/` — never mutate from client components directly
- **API routes:** Only for external integrations (Stripe webhooks, QuickBooks OAuth, CAIN streaming, distributor webhooks)
- **Auth:** Supabase SSR via `@supabase/ssr` — middleware in `src/middleware.ts` protects all routes
- **RLS:** Every table must have Row Level Security policies. New tables require RLS in their migration file.
- **Migrations:** One SQL file per feature domain, named `supabase-migration-{feature}.sql`
- **Validation:** All form inputs validated with Zod schemas before database writes. Schemas live in `src/lib/validations.ts`.
- **Error Boundaries:** Every route group should have an `error.tsx`. Root error boundary exists at `src/app/error.tsx`.

### Key File Locations
```
src/
├── app/api/           # API routes — external integrations only
├── lib/actions/       # Server Actions — all data mutations
├── lib/cain/          # CAIN engine, tools, system prompt, types
├── lib/quickbooks/    # QuickBooks sync, auth, mapping, webhooks
├── lib/payroll/       # Payroll auth, hours export, labor report
├── lib/distributors/  # Distributor connectors, CSV parsers, sync
├── lib/validations.ts # Zod schemas for all form inputs
├── lib/entitlements.ts # User-level subscription feature gating
├── lib/orgEntitlements.ts # Org-level feature gating (falls back to user-level)
├── lib/staffAvailability.ts # Double-booking detection for staff
├── lib/pricing.ts     # Pricing calculations (with input validation)
├── types/index.ts     # All shared TypeScript types
```

### Event Status Flow
```
draft → proposed → confirmed → completed
         ↓             ↓            ↓
     (send proposal) (unlock    (record revenue,
                    production)  sync QuickBooks)
canceled (valid from any state)
```

### Proposal Status Flow
```
draft → sent → viewed → approved → signed → deposit_paid → booked
  ↑                                                          ↓
  └──────────── declined ←──────────────────────────────────┘
                  ↓
               (reopen → draft)

expired → draft | sent (allow resending)
```
Status transitions are enforced server-side via `VALID_TRANSITIONS` map in `src/lib/actions/proposals.ts`.

---

## 3. CAIN — CATERING AI NERVE-CENTER

CAIN is the platform's agentic AI layer. It is **not a chatbot**. It is an operations director that takes an event brief and produces a complete, commit-ready event plan by autonomously calling tools against live business data.

### CAIN Architecture
| Property | Value |
|----------|-------|
| Model | Latest Claude Sonnet (configured in env/constants) |
| Loop | Agentic tool-use, up to 15 iterations |
| Streaming | SSE (Server-Sent Events) to UI |
| State | `cain_drafts` table — never writes to production until user commits |
| Context | Reads: recipes, staff, inventory, clients, past events, business settings |
| Date Awareness | Chat system prompt injects current date. Event builder system prompt must also include it. |

### CAIN Tool Catalog
| Tool | Purpose | Status |
|------|---------|--------|
| `search_recipes` | Find recipes by dietary/category criteria | Live |
| `get_recipe` | Full recipe with ingredients and costing | Live |
| `search_staff` | Available staff by role and date | Live |
| `get_inventory` | On-hand inventory for key ingredients | Live |
| `search_past_events` | Similar past events for pricing reference | Live |
| `get_client_history` | Client notes and event history | Live |
| `get_business_settings` | Default admin fee, tax rate, margin | Live |
| `finalize_plan` | Write structured plan to `cain_drafts` | Live |
| `produce_prep_sheet` | Generate production-ready prep sheet from menu | Live |

### CAIN Commit Flow
1. User submits brief in `/cain`
2. CAIN runs agentic loop, streams progress via SSE
3. Extraction panel shows parsed entities
4. Plan review screen presents full plan
5. User clicks "Commit to Event" — writes to production tables
6. User routed to event detail page

**Status: Fully operational.** The commit chain from `cain_drafts` → `events` table works end-to-end with proper error handling and post-commit redirect.

### CAIN Rules for Claude Code
- CAIN **never** writes directly to production tables — always to `cain_drafts` first
- All CAIN routes require Pro tier entitlement check
- Max 15 tool-use iterations per session (cost control)
- Rate limiting at the API route level
- `cain_permissions` table controls which actions require explicit user approval
- Both chat and event builder system prompts must inject current date

> **CAIN Development Principle:** CAIN should feel like handing a brief to a senior operations director. It should anticipate needs, apply industry knowledge, and return a plan that a busy caterer can review in 60 seconds and commit with one click. It should never feel like a search engine or a form wizard.

### CAIN Expansions
| Feature | Status | Priority |
|---------|--------|----------|
| Auto-generate production sheets from confirmed event menus | Implemented | — |
| Proactively flag scheduling conflicts | Implemented | — |
| Suggest recipe substitutions based on distributor pricing | Not started | Next |
| Post-event: compare projected vs. actual food cost and labor | Not started | Next |
| Cross-event pattern recognition: which menus drive best margins | Not started | Future |

---

## 4. FEATURE SPECS

### 4.1 Event Auto-Population
When a new event is created (manually or via CAIN), auto-populate across tabs:
- **Pricing:** Pre-fill guest count, suggest menu cost baseline from similar past events
- **Staff:** Auto-suggest staffing ratios based on guest count and service style
- **Production:** Skeleton prep sheet ready once menu is confirmed
- **Shopping:** Aggregate ingredient list from attached recipes
- **Proposals:** Draft populated from event name, date, client, and pricing

### 4.2 Staffing and Scheduling Rules
- Track availability per-event and per-date
- Conflict detection: flag staff already assigned to overlapping events (implemented in `src/lib/staffAvailability.ts`)
- Role types: Server, Chef, Bartender, Captain, Setup, Kitchen
- Labor cost auto-calculated into pricing engine
- Hours exported to payroll on event completion
- Future: staff self-service availability portal

### 4.3 Production Sheets (Pro only)
Must include:
- Full recipe list scaled to guest count
- Prep timeline with suggested start times
- Ingredient pull list by station
- Allergen callouts per dish
- Print-ready PDF with event branding

Gate behind: event `status === 'confirmed'` AND Pro entitlement.

### 4.4 Shopping List Aggregation
Required behavior:
- Merge duplicate ingredients across recipes (unit normalization required)
- Group by distributor or store category
- One-click export to distributor order
- Cross-reference inventory to subtract on-hand quantities

### 4.5 Recipe Intelligence
- Status workflow: `draft` → `approved` → `archived`
- Yield percentage for accurate scaling
- Case pricing support for bulk purchasing
- AI generation via CAIN with ingredient-level costing
- Source field: `manual | ai_draft | imported`

### 4.6 Input Validation (Implemented)
All form inputs are validated with Zod schemas before database writes:
- **Events:** name required, guest count 1–10,000, valid email format, date required
- **Recipes:** name required, servings 1–10,000, category required
- **Pricing:** admin fee 0–100%, tax 0–100%, margin 0–99%, guest count >= 1
- **Settings:** all percentage fields bounded 0–100%

Schemas defined in `src/lib/validations.ts`. Applied in `createEventAction` and `updateEventDetailsAction`.

### 4.7 Pagination (Implemented)
Events list displays 50 events per page with Previous/Next navigation. Applied in `src/app/events/page.tsx`.

---

## 5. INTEGRATION SPECS

### Current Status
| Integration | Status | Notes |
|-------------|--------|-------|
| Stripe Billing | Live | Subscriptions, customer portal, webhooks |
| Stripe Connect | Live | Client payment links, payout tracking, account verification on payment |
| QuickBooks Online | In Progress | OAuth built, sync engine exists, needs hardening |
| Payroll (Gusto/ADP) | In Progress | OAuth, hours export, labor report built |
| Distributors (PFG) | In Progress | CSV upload, webhook connector, catalog sync |
| Email (SMTP) | Live | Proposals, confirmations, team invites |
| ICS / Calendar | Live | .ics export to Google Calendar / iCal |
| Anthropic API | Live | CAIN event builder, recipe gen, chat assistant |

### QuickBooks — Priority Integration
Relevant files: `src/lib/quickbooks/`

Priority work:
1. Finish sync queue retry logic with exponential backoff
2. Build sync status UI in `/settings` → Integrations tab
3. Add reconciliation view: per-event sync status (synced / pending / failed)
4. Test against live QuickBooks sandbox

Sync logic:
- Confirmed event → QuickBooks Invoice (line items: food, staff, rentals, bar, admin fee, tax)
- Client → QuickBooks Customer (create if not exists, match on email)
- Payment received → mark invoice paid in QuickBooks
- Supplier invoice (from spending/OCR) → QuickBooks Bill

### Payroll — Production Sign-Off
Relevant files: `src/lib/payroll/`

Priority work:
1. Test hours export against Gusto sandbox with multi-role event staff
2. Validate labor report PDF output
3. Build disconnect/reconnect UI with clear error state
4. Add export confirmation screen — user reviews hours before sending

### Distributors — CSV Stability
Relevant files: `src/lib/distributors/`

Priority work:
1. Harden PFG CSV parser for malformed rows and encoding issues
2. Build product catalog sync UI (last sync time, item count, price changes)
3. Price change alerts for tracked ingredients
4. Shopping list → distributor order flow end-to-end

> **Integration Principle:** Every integration should save a user from opening another app. Build integrations to completion — not to "connected but limited." A half-built sync is worse than no sync.

---

## 6. UX PRINCIPLES

Cateros users are operators — often working on mobile or a small laptop in a kitchen, a van, or a venue. The UI must be fast to navigate, forgiving of interruption, and oriented around action.

| Principle | Meaning |
|-----------|---------|
| Operational First | Every screen answers: what do I need to do next? |
| One Source of Truth | Never make users update the same thing in two places |
| Progressive Disclosure | Essential view first, advanced features one step deeper |
| Speed | Under 1.5s load for primary views |
| Mobile-Usable | Critical actions must work on phone (not mobile-first, but mobile-usable) |
| Status Transparency | Event, proposal, payment, staff status always visible at a glance |
| Forgiveness | Drafts auto-saved. No irreversible actions without confirmation. CAIN never auto-commits. |

### Sidebar Navigation
The sidebar organizes 17+ nav items into 5 logical sections with subtle section headers:

| Section | Items |
|---------|-------|
| Operations | Dashboard, Events, C.A.I.N |
| Kitchen | Recipes, Recipe Analytics, Shopping List, Prep |
| Sales | Proposals, Branding, Vendor Profile |
| Team | Staff, Schedule, Team, Team Invites |
| Admin | Notifications, Audit Log |

Section headers hide when the sidebar is collapsed. Settings and Sign out remain pinned at the bottom outside any group. The sidebar adapts labels and item visibility based on `business_type` and `enabled_modules` from the user profile.

### Event Detail Tabs
| Tab | Contents |
|-----|---------|
| Overview | Client info, date, venue, guest count, status controls, notes, readiness checklist |
| Pricing | Full pricing engine — food, staff, rentals, bar, totals, margin, P&L |
| Payments | Payment schedules, Stripe payment links (Pro) |
| Staff | Assignments with role and hours, conflict indicators |
| Vendors | Venue linking, vendor collaboration (Pro) |
| Production | Kitchen prep sheet, breakdown PDF, shopping list link |
| Activity | Audit log for this event |

Each tab loads independently. Every empty state must be meaningful — never a blank screen.

### Empty State Pattern
Every empty state should follow this structure:
1. **Relevant icon** — visually indicates the feature
2. **Headline** — tells the user what belongs here (e.g., "No events yet")
3. **Description** — explains how to get started (e.g., "Create your first event to start managing your catering operations.")
4. **Primary action button** — the one thing they should do next (e.g., "New Event")

### Light Mode Redesign (Planned)
- Clean white backgrounds with slate/navy text hierarchy
- Copper accent (#C0602A) for primary CTAs and section markers
- Card-based layout for event lists and recipe library
- Status badge system: green (confirmed/live), amber (proposed/pending), slate (draft), red (canceled)
- Table typography: 13–14px with generous row height

---

## 7. CODING STANDARDS

### Server Actions
- All data mutations go through Server Actions in `src/lib/actions/`
- Return typed result objects — never throw to client
- Pattern: `{ data: T | null, error: string | null }`
- Validate all inputs with Zod schemas before database writes

### API Routes
- Only for external integrations — not for internal CRUD
- Return consistent error shapes: `{ error: string, code: string }`
- Apply rate limiting on AI and webhook routes
- Verify Stripe Connect account status (`charges_enabled`) before processing payments

### TypeScript
- Strict mode — no `any` without justification
- All types defined in `src/types/index.ts`
- Zod schemas for all form inputs and external API responses

### Database
- Every new table needs RLS — include in the migration file
- Scope by `user_id` or `organization_id` consistently
- Use `gen_random_uuid()` for primary keys
- Always include `created_at` and `updated_at` with trigger
- When org filter is available, apply it as mandatory — not optional

### CAIN / AI Routes
- CAIN writes to `cain_drafts` only — never production tables
- Pro entitlement check at the route level, not just the UI
- Handle API errors gracefully and surface them in the SSE stream
- Log CAIN runs to `audit_log`
- Both system prompts (chat + event builder) must include current date

### Error Handling
- Supabase errors: catch, log to `audit_log`, return typed error — never swallow
- Integration failures (QuickBooks, payroll): always surface sync status — never silently succeed
- CAIN stream: error events must reach the client UI
- Loading states for async integrations must include timeout/fallback (don't show "Loading..." forever)

### Validation Standards
- All numeric inputs: validate min/max bounds (e.g., guest count 1–10,000, percentages 0–100)
- All string inputs: trim whitespace, enforce max length
- All email fields: validate format with Zod `.email()`
- All status transitions: validate against allowed transition map server-side

---

## 8. BUILD PRIORITIES

### Immediate (Now → 2 Weeks) — Remaining Bug Fix + Integration Hardening

**One remaining bug:**
1. **CAIN event builder date awareness** — The chat system prompt has date injection, but `src/lib/cain/system-prompt.ts` (used by the event builder agentic loop) does not. Add `const today = new Date().toLocaleDateString(...)` and inject it into the event builder system prompt.

**Then complete the three integrations:**
1. **QuickBooks** — retry logic, sync status UI, reconciliation view, sandbox testing
2. **Payroll** — Gusto sandbox testing, labor report validation, export confirmation UI
3. **Distributors** — CSV parser hardening, catalog sync UI, price alerts

> **Pragmatic rule:** Quality-of-life improvements to core event/pricing/proposal/recipe flows are always fair game alongside integration work. The "no new features" rule applies only to features that touch integration surfaces or add new product domains.

### Next Sprint (2–6 Weeks)
1. **Light mode redesign** — design tokens in Tailwind, system preference detection, priority pages: Dashboard, Events, CAIN, Recipes, Proposals
2. **CAIN recipe substitution suggestions** — based on distributor pricing and availability
3. **Post-event cost comparison** — projected vs. actual food cost and labor
4. **Testing infrastructure** — Vitest for pricing/recipe/shopping, Playwright for critical E2E paths

### Near-Term (6–16 Weeks)
| Feature | Description |
|---------|-------------|
| Client Portal Enhancement | Clients view proposals, approve, sign contracts, pay deposits |
| Recipe Nutrition / Allergens | Allergen tagging, optional nutrition data, surfaced in production sheets |
| Advanced Reporting | Food cost % by event, labor cost % by month, CAIN usage metrics |
| Staff Self-Service | Availability submission, shift confirmation via lightweight portal |
| Template Library | Pre-built event packages that auto-populate pricing and staffing |
| POS Integration (Square) | Sync confirmed event menu; pull sales back to Cateros |
| Hospitality Network V1 | Vendor profiles and caterer → vendor booking flow |
| Observability | Sentry for runtime errors, Vercel Analytics for page performance, AI cost tracking |

---

## 9. DATA INTEGRITY & MIGRATION PRINCIPLES

### Schema Change Protocol
1. Every schema change gets its own migration file: `supabase-migration-{feature}.sql`
2. New columns should have sensible defaults — never break existing rows
3. JSON columns (like `pricing_data`) should be versioned or include migration helpers for backward compatibility
4. Test migrations against a staging database before applying to production
5. Never rename or drop columns in production without a deprecation period

### Cascade Rules
- Deleting an event should cascade to: proposals, staff assignments, payment schedules, production data
- Soft-delete is preferred for events and proposals — add `deleted_at` column rather than hard delete
- Orphaned records (proposals without events) should be cleaned up by a periodic job

### Idempotency
- Stripe webhook handlers must be idempotent — use `eq("status", "pending")` guards on updates
- Payment schedule status updates should check current state before writing
- CAIN commit should verify the draft hasn't already been committed

---

## 10. QA STANDARDS

### Pre-Release Checklist
1. Event CRUD: create, edit, status change, delete work without data loss
2. CAIN: brief → stream → extraction → plan review → commit creates valid event
3. Pricing: all line item types calculate correctly, totals match formula
4. Proposals: PDF generates with correct branding, pricing, and client info
5. Stripe: checkout → webhook → subscription status update confirmed
6. Auth: signup, login, password reset, org invite all work
7. RLS: user A cannot read or modify user B's data — test explicitly
8. Mobile: event list, CAIN, and production sheets render at 375px viewport
9. Validation: empty names, invalid emails, zero guest counts are rejected with clear error messages

### Testing Stack
- **Unit:** Vitest for `pricing.ts`, `validations.ts`, `recipe-scaler.ts`, `shopping-aggregator.ts`, `staffAvailability.ts`
- **Integration:** Playwright for critical path E2E
- **AI:** Prompt regression tests for CAIN — valid structured output for standard briefs

### Testing Priorities
| Priority | Scope |
|----------|-------|
| P0 | Event create → CAIN → commit → pricing → proposal → Stripe payment |
| P1 | QuickBooks sync, Stripe webhooks, CAIN tools, distributor CSV parsing |
| P2 | Pricing calculations, recipe scaling, shopping aggregation, RLS coverage, input validation |
| P3 | Proposal PDF rendering, production sheet output, mobile layouts |

---

## 11. BUILD DIRECTIVE FORMAT

When Claude Code receives a directive, it will follow this structure. When writing directives for Claude Code, always include:

```
Feature: [name]
Context: [relevant files and current state]
Goal: [what should exist when this is done]
Steps: [ordered implementation steps]
Edge cases: [explicit handling required]
Do not break: [related features to protect]
Tests to write: [what to verify]
RLS: [policies required for new tables]
Entitlement gate: [Basic / Pro / none]
```

---

## 12. ROLE SEPARATION

| Role | Responsibility |
|------|---------------|
| Claude Code (Terminal) | Implementation — writes and modifies production code per directives |
| Parallel Assistant (Cowork) | Product + engineering strategy — reviews specs, writes directives, spots risks |
| CAIN (In-Product) | Operational AI for caterers — event planning, recipe generation |
| Andrew | Product owner — approves direction, sets priorities, makes final calls |

---

> **Platform Principle:** Build for scale, not just today. Every feature should be built assuming 10,000 active catering businesses are using it. That means proper RLS, typed schemas, server-side validation, graceful error handling, and no hard-coded assumptions about a single user's setup. Cateros is a software company. Build accordingly.

---

## 13. RESOLVED BUGS (Audit Log)

The following bugs from the original directive have been verified as resolved. They are preserved here for historical reference and to prevent regressions.

| Bug | Description | Status | Resolution |
|-----|-------------|--------|------------|
| Bug 1 | CAIN has no date awareness | **Partially Fixed** | Chat system prompt injects date. Event builder system prompt (`system-prompt.ts`) still needs date injection. |
| Bug 2 | Team member invites not accessible | **Fixed** | `/team/invites/` page exists with full UI, linked from sidebar |
| Bug 3 | CAIN does not complete event creation | **Fixed** | Full commit chain works: `cain_drafts` → `events` table with error handling and redirect |
| Bug 4 | Product name inconsistency (CaterOS) | **Fixed** | All instances use "Cateros" throughout codebase |
| Bug 5 | Sidebar disappears on certain pages | **Fixed** | All authenticated pages include Sidebar in their layout |
| Bug 6 | Pro subscription flashes upgrade prompt | **Fixed** | All Pro features gated server-side before client renders |
| Bug 7 | Font and style changes not rendering | **Fixed** | DM Sans + Georgia loaded via Google Fonts, Tailwind config correct |
| Bug 8 | AI Assistant in nav | **Fixed** | `/assistant` removed from sidebar, route preserved but unlinked |
| Bug 9 | Venue management shows upgrade for Pro users | **Fixed** | `getOrgEntitlements()` falls back to user-level subscription when no org exists |

### Recent Improvements (March 2026 Session)
- Added Zod validation schemas for all event/recipe/pricing/settings forms
- Added proposal status transition state machine (server-side enforcement)
- Added events list pagination (50 per page)
- Added Stripe Connect account verification (`charges_enabled` check)
- Added staff double-booking detection utility (`src/lib/staffAvailability.ts`)
- Added input validation to `calculatePricing()` (rejects invalid ranges)
- Reorganized sidebar navigation into 5 grouped sections
- Fixed `getOrgEntitlements()` to fall back to user-level entitlements (fixes vendor profile + venue gating for users without orgs)
- Fixed schedule page salary vs hourly rate display

---

## 14. DIRECTIVE: ROLE-BASED ONBOARDING + ADAPTIVE PRODUCT EXPERIENCE

**Feature:** Role-Based Onboarding and Adaptive UX Layer
**Classification:** Platform-level expansion — affects auth flow, navigation, dashboard, and feature access
**Tier:** Core functionality available to all tiers; Pro unlocks cross-role collaboration features
**Status:** Phase 1–3 implemented. Phases 4–7 in progress or planned.

### Context

Cateros currently assumes a single user type: caterer. The platform has the infrastructure to serve the full hospitality event ecosystem — venues, planners, florists, bands, rental companies, private chefs — but the UI, nav, and onboarding treat everyone identically. This directive expands Cateros from a catering tool into a hospitality event engine for the entire vendor ecosystem.

Relevant existing files:
- `src/app/onboarding/` — onboarding flow (implemented with role selection)
- `src/app/dashboard/` — current dashboard
- `src/components/layout/Sidebar.tsx` — main nav (grouped sections implemented)
- `src/lib/entitlements.ts` — feature gating
- `src/types/index.ts` — UserProfile type
- `supabase-schema.sql` + `supabase-migration-settings.sql` — profile and settings tables
- `src/lib/actions/` — auth and settings Server Actions

### Goal

When complete:
1. During signup, users select their **business type** and **primary goal**
2. The platform adapts the dashboard, sidebar, terminology, and default feature set around those answers
3. All business types share one codebase, one database, and one event/CRM/billing infrastructure
4. Users are never hard-locked — additional modules can be enabled at any time
5. Each operator type feels like the product was built for them specifically

> **One rule above all:** The system should feel curated for each niche without fragmenting the product into separate codebases. One infrastructure. One network. One event framework. Many faces.

### Supported Business Types

| Value | Display Name |
|-------|-------------|
| `caterer` | Caterer |
| `restaurant` | Restaurant |
| `private_chef` | Private Chef |
| `venue` | Venue |
| `event_planner` | Event Planner |
| `florist` | Florist |
| `band_entertainment` | Band or Entertainment |
| `rental_company` | Rental Company |
| `hospitality_management` | Hospitality Management |
| `other` | Other Vendor |

### Supported Primary Goals

| Value | Display Label |
|-------|--------------|
| `book_more_business` | Book More Business |
| `manage_events` | Manage Events |
| `create_proposals` | Create Proposals |
| `organize_staff` | Organize Staff |
| `track_costs` | Track Costs |
| `coordinate_vendors` | Coordinate Vendors |
| `run_production` | Run Production |
| `build_client_relationships` | Build Client Relationships |

---

### Phase 1 — Database Schema ✅ COMPLETE

Migration file: `supabase-migration-roles.sql`

Added columns to `profiles` table: `business_type`, `primary_goal`, `enabled_modules`, `onboarding_role_completed`.

Created `business_type_configs` table with terminology mappings per business type.

---

### Phase 2 — Role Selection Onboarding ✅ COMPLETE

6-step onboarding flow implemented in `/app/onboarding/OnboardingClient.tsx`:
1. Business Type selection (10 options)
2. Primary Goal selection (8 options)
3. Profile setup
4. Stripe connection
5. First event
6. Completion

Saves `business_type`, `primary_goal`, and `enabled_modules` to profile via Server Action.

---

### Phase 3 — Adaptive Navigation ✅ COMPLETE

Sidebar reads `business_type` and `enabled_modules` from user profile. Nav items, labels, and ordering adapt per role. Items outside the role's primary list go into "More" section.

---

### Phase 4 — Adaptive Dashboard (TODO)

Modify `src/app/dashboard/` to render a role-aware widget layout using a `DASHBOARD_CONFIGS` map.

Each config defines:
- Which KPI cards appear first
- Which quick-action buttons are shown (label adapts to role: "New Event" / "New Gig" / "New Reservation")
- Which primary chart is shown (revenue by event, gigs by month, inventory turnover, etc.)

The user's `primary_goal` provides a second dimension: if goal is `book_more_business`, surface open proposal count and conversion rate prominently regardless of business type.

---

### Phase 5 — Terminology Layer (TODO)

Build a `useTerminology()` hook that reads `business_type` from user context and returns a terminology map:

```typescript
const terms = useTerminology()
// terms.event    → "Gig" for band, "Booking" for venue, "Event" for caterer
// terms.client   → "Guest" for private chef, "Client" for most others
// terms.staff    → "Band Members" for band, "Vendors" for planner, "Staff" for caterer
// terms.proposal → "Contract" for band, "Quote" for rental, "Proposal" for caterer
```

Apply to: page headings, empty states, CTA labels, nav item labels, PDF output headings.
Do NOT apply to: database field names, API payloads, or Server Action parameters — terminology is a display-only layer.

---

### Phase 6 — Module Management in Settings (TODO)

Add a "Modules" section to `/settings` where account admins can:
- See which modules are currently enabled
- Enable additional modules (e.g. a venue enabling Recipes and Food Cost for in-house catering)
- Read a short description of what each module adds before enabling

Write changes to `profiles.enabled_modules` via Server Action. Nav updates reactively — no full page reload required.

---

### Phase 7 — CAIN System Prompt Update (TODO)

Pass `business_type` into `buildCainSystemPrompt()` in `src/lib/cain/system-prompt.ts`.

CAIN should adapt its planning logic per role:
- `venue`: lead with room-block logistics and preferred vendor recommendations rather than food cost
- `event_planner`: lead with multi-vendor coordination and timeline, not recipe selection
- `caterer`: current behavior unchanged
- All other types: suppress irrelevant sections (e.g. florist CAIN should not suggest staffing ratios for servers)

---

### Edge Cases

- **Multi-role operators:** A caterer who also rents equipment should have both nav configs merged without duplicates. Primary role takes dashboard and ordering priority.
- **Existing users:** All existing users default to `business_type = 'caterer'`. Their experience must not change unless they complete the role selection flow.
- **Team members:** Inherit the organization's `business_type`. They do not set their own role independently.
- **Empty states:** Every nav item must have a role-aware empty state. A florist landing on inventory for the first time should see "Track your stems and supplies" — not a generic empty table.
- **Terminology in PDFs:** Pass the terminology map into PDF generation functions (`generateProposalPDF`, `generateProductionPDF`) so exported documents use role-appropriate language.

### Do Not Break

- Existing caterer onboarding — this is additive, not a replacement
- `entitlements.ts` feature gating — module access layers on top of Basic/Pro, does not replace it
- CAIN event builder — must continue to function fully for caterer role without any regression
- Stripe billing flow — no changes to payment or subscription logic
- RLS on all existing tables — `business_type_configs` is the only new public-read table

---

*Last updated: March 27, 2026 | Update this file when priorities shift, integrations complete, or new features are defined.*
