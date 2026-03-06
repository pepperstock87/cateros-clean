# Cateros — Claude Code Project Guide

## What is Cateros?
Cateros is a catering business management platform built with **Next.js 15**, **Supabase**, **Stripe**, and deployed on **Vercel**. It helps catering companies manage events, recipes, proposals, scheduling, branding, and billing.

---

## Tech Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Database & Auth:** Supabase (Postgres + Auth + SSR)
- **Payments:** Stripe (subscriptions with Basic & Pro tiers)
- **Styling:** Tailwind CSS + Radix UI components
- **PDF Generation:** jsPDF + jsPDF-autotable
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Deployment:** Vercel

---

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── entitlements/   # Subscription entitlement checks
│   │   ├── recipes/        # Recipe AI generation endpoint
│   │   └── stripe/         # Stripe webhooks & checkout
│   ├── billing/            # Billing & subscription management
│   ├── branding/           # Business branding settings
│   ├── dashboard/          # Main dashboard
│   ├── events/             # Event management (CRUD + [id] detail)
│   ├── proposals/          # Proposal generation
│   ├── recipes/            # Recipe management (CRUD + [id] detail)
│   ├── schedule/           # Scheduling view
│   ├── settings/           # User/account settings
│   ├── login/              # Auth pages
│   └── signup/
├── components/
│   ├── dashboard/          # DashboardChart, SubscriptionBanner
│   ├── events/             # EventStatusSelect, PricingEngine
│   ├── layout/             # Sidebar
│   ├── proposals/          # GenerateProposalButton
│   ├── recipes/            # RecipeCard
│   └── ui/                 # Shared UI components (UpgradePrompt, etc.)
├── lib/
│   ├── actions/            # Server actions: auth, events, recipes, settings
│   ├── supabase/           # Supabase client, server, middleware helpers
│   ├── entitlements.ts     # Subscription tier feature gating
│   ├── generateProposalPDF.ts
│   ├── pricing.ts
│   └── utils.ts
├── types/index.ts
└── middleware.ts            # Auth middleware (Supabase SSR)
```

---

## Dev Commands
```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

---

## Environment Variables (.env.local)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID_BASIC
- STRIPE_PRICE_ID_PRO
- NEXT_PUBLIC_APP_URL (localhost:3000 in dev)

---

## Subscription Tiers
Feature gating handled in src/lib/entitlements.ts
- Free — limited features
- Basic — expanded access
- Pro — full access
Upgrade prompts use <UpgradePrompt> component.

---

## Auth Flow
- Supabase Auth with SSR via @supabase/ssr
- Middleware in src/middleware.ts protects routes
- Server client: src/lib/supabase/server.ts
- Browser client: src/lib/supabase/client.ts

---

## Key Patterns
- Data mutations use Next.js Server Actions in src/lib/actions/
- API routes handle Stripe webhooks and external calls
- Sidebar (src/components/layout/Sidebar.tsx) is the main nav
- Database schema in supabase-schema.sql at project root

---

## Deployment
- Vercel — config in vercel.json
- Production env vars set in Vercel dashboard
- Update NEXT_PUBLIC_APP_URL for production
