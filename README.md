# CaterOS — Catering Pricing & Proposal Software

A production-ready SaaS MVP for catering companies. Price events accurately, generate professional PDF proposals, manage recipe food costs, and track profitability.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (custom dark theme)
- **Database & Auth**: Supabase
- **Payments**: Stripe (subscriptions)
- **PDF**: jsPDF + jspdf-autotable
- **Charts**: Recharts
- **Deployment**: Vercel

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd cateros
npm install
```

### 2. Set Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Go to **SQL Editor** in your Supabase dashboard
4. Run the contents of `supabase-schema.sql`

### 4. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create a recurring product at $49/month
3. Copy the price ID to `STRIPE_PRICE_ID_MONTHLY`
4. Set up a webhook endpoint at `your-domain.com/api/stripe/webhook`
   - Listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

---

## Features

### Authentication
- Email/password signup & login via Supabase Auth
- Auto-created user profiles on signup
- Secure server-side session management

### Event Pricing Engine
- Create events with client details, date, guest count
- Line-item menu pricing (cost per person × quantity)
- Staffing calculator (role × hourly rate × hours × headcount)
- Rentals & equipment line items
- Bar package selector (Beer & Wine, Full Bar, Custom)
- Admin/service fee percentage
- Tax percentage
- Real-time calculation: total cost, suggested price, projected margin
- Save pricing to Supabase

### PDF Proposal Generator
- Custom branded PDF with company name
- Event summary, menu details, staffing, cost breakdown
- Configurable terms & conditions
- Client signature block
- Download as PDF from the browser

### Recipe & Food Cost Library
- CRUD recipes with ingredient tracking
- Per-ingredient: name, quantity, unit, cost per unit
- Auto-calculated: total ingredient cost, cost per serving
- Category organization
- Use recipe costs to populate event menu pricing

### Profit Dashboard
- Stats: events this month, revenue, profit, avg margin
- 6-month revenue vs profit area chart
- Upcoming events sidebar
- Recent events table with status, revenue, margin

### Stripe Billing
- Monthly subscription ($49/month, 14-day trial)
- Stripe Checkout session
- Customer Portal for self-service management
- Webhook handler updates subscription status in DB

---

## Project Structure

```
cateros/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── login/page.tsx          # Login
│   │   ├── signup/page.tsx         # Signup
│   │   ├── dashboard/              # Dashboard (layout + page)
│   │   ├── events/                 # Events list, new event, [id] detail
│   │   ├── recipes/                # Recipe library, new recipe
│   │   ├── proposals/              # Proposals overview
│   │   ├── billing/                # Billing & Stripe
│   │   └── api/stripe/             # Checkout, Portal, Webhook routes
│   ├── components/
│   │   ├── layout/Sidebar.tsx      # App sidebar navigation
│   │   ├── dashboard/              # DashboardChart
│   │   ├── events/                 # PricingEngine, EventStatusSelect
│   │   ├── recipes/                # RecipeCard
│   │   └── proposals/              # GenerateProposalButton
│   ├── lib/
│   │   ├── supabase/               # client.ts, server.ts, middleware.ts
│   │   ├── actions/                # auth.ts, events.ts, recipes.ts
│   │   ├── pricing.ts              # Pricing calculation engine
│   │   ├── generateProposalPDF.ts  # jsPDF proposal generator
│   │   └── utils.ts                # cn, formatCurrency, formatPercent
│   ├── types/index.ts              # All TypeScript types
│   └── middleware.ts               # Route protection
├── supabase-schema.sql             # Run in Supabase SQL editor
├── vercel.json                     # Vercel deployment config
└── .env.local.example              # Environment variable template
```

---

## Customization

- **Branding colors**: Edit `tailwind.config.ts` — change `brand.*` palette
- **Subscription price**: Update `STRIPE_PRICE_ID_MONTHLY` and the UI price in `billing/page.tsx`
- **Admin fee / tax defaults**: Edit `DEFAULT_PRICING` in `src/lib/pricing.ts`
- **PDF styling**: Customize colors, fonts, and layout in `src/lib/generateProposalPDF.ts`

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (webhook only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_MONTHLY` | Stripe price ID for $49/mo plan |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL |
