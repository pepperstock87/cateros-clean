import Link from "next/link";
import {
  Calendar,
  FileText,
  CreditCard,
  BookOpen,
  Users,
  Package,
  BarChart3,
  ArrowRight,
  ClipboardList,
  DollarSign,
  Store,
  Check,
} from "lucide-react";
import FAQSection from "@/components/landing/FAQSection";

const FEATURES = [
  {
    icon: Calendar,
    title: "Event Management",
    desc: "Build and manage events from inquiry to execution. Track every detail, timeline, and milestone in one place.",
  },
  {
    icon: FileText,
    title: "Proposals & Contracts",
    desc: "Create polished proposals and streamline client approvals. Clients review, accept, and sign — no back-and-forth emails.",
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    desc: "Accept deposits, track payments, and send invoices. Integrated Stripe processing keeps cash flow moving.",
  },
  {
    icon: BookOpen,
    title: "Recipe Management",
    desc: "Build a recipe library with cost tracking. Know your food cost per plate and protect margins on every menu.",
  },
  {
    icon: Users,
    title: "Staff Scheduling",
    desc: "Manage staffing, assign roles, and track availability. Know who's working, what's needed, and when.",
  },
  {
    icon: Package,
    title: "Inventory Tracking",
    desc: "Track equipment, rentals, and supplies across events. Never double-book or forget an item again.",
  },
  {
    icon: Store,
    title: "Client Portal",
    desc: "Give clients a branded, professional planning experience. Digital approvals, menus, and seamless communication.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "See revenue, margins, and event performance at a glance. Data-driven decisions for a more profitable operation.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create Your Event",
    desc: "Add event details, build your menu, set pricing, and assign staff — all in one place.",
  },
  {
    step: "2",
    title: "Send a Proposal",
    desc: "Generate a branded, professional proposal and share it with your client for review and approval.",
  },
  {
    step: "3",
    title: "Get Paid",
    desc: "Collect deposits, track payments, and manage invoices. Close the loop from proposal to profit.",
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    desc: "Get started and explore the platform",
    cta: "Get Started",
    highlight: false,
    features: [
      "Up to 3 active events",
      "Basic pricing engine",
      "PDF proposals",
      "Recipe library (up to 10)",
      "Email support",
    ],
  },
  {
    name: "Basic",
    price: "$65",
    period: "/month",
    desc: "Essential tools for managing events and pricing",
    cta: "Start Free Trial",
    highlight: false,
    features: [
      "Unlimited events",
      "Full pricing engine",
      "Professional PDF proposals",
      "Recipe cost library",
      "Profit dashboard",
      "Client portal",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    desc: "Advanced tools for growing operations",
    cta: "Start Free Trial",
    highlight: true,
    features: [
      "Everything in Basic, plus:",
      "Staff scheduling & payroll",
      "Venue & vendor coordination",
      "Custom branded proposals",
      "Production sheets (BEO)",
      "AI business assistant",
      "Advanced analytics",
      "Team collaboration",
      "Priority support & onboarding",
    ],
  },
];

const STATS = [
  { value: "500+", label: "Events Managed" },
  { value: "100+", label: "Hospitality Professionals" },
  { value: "$2M+", label: "Revenue Processed" },
  { value: "< 2 min", label: "To Generate a Proposal" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-950 border border-brand-800 text-brand-300 text-xs font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            The Event Operations Platform
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.1] mb-8 tracking-tight">
            The Operating System for the<br />
            <span className="text-brand-400">Hospitality Industry</span>
          </h1>
          <p className="text-[#D4A373] text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            The all-in-one platform for caterers, venues, planners, chefs, and florists — from proposals to payments, recipes to scheduling.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="btn-primary px-10 py-3.5 text-base font-medium inline-flex items-center gap-2">
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="btn-secondary px-10 py-3.5 text-base font-medium">
              See How It Works
            </a>
          </div>
          <p className="text-xs text-[#7A8BA8] mt-5">No credit card required &middot; 14-day free trial &middot; Cancel anytime</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20">
        <div className="text-center pb-6">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">Features</span>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-28">
          <h2 className="text-center font-display text-3xl md:text-4xl font-semibold mb-4">
            Everything you need to run<br className="hidden md:block" /> modern event operations
          </h2>
          <p className="text-center text-[#D4A373] mb-14 max-w-2xl mx-auto">
            From the first inquiry to the final invoice — one platform for your entire event workflow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 group hover:border-brand-800/60 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-brand-950 border border-brand-800 flex items-center justify-center mb-4 group-hover:bg-brand-900/60 transition-colors">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-medium text-base mb-2">{title}</h3>
                <p className="text-sm text-[#D4A373] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#182030] border-y border-[#2A3A5C] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400 mb-3 block">How It Works</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Three steps to streamlined events
            </h2>
            <p className="text-[#D4A373] max-w-2xl mx-auto">
              Cateros simplifies your entire workflow so you can focus on what matters — delivering great events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="relative text-center">
                {/* Connector line (desktop only) */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] right-[-40%] h-px bg-gradient-to-r from-brand-400/40 to-brand-400/10" />
                )}
                <div className="w-12 h-12 rounded-full bg-[#0C1220] border-2 border-brand-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-sm font-bold text-brand-400">{step}</span>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-[#D4A373] leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem / Positioning */}
      <section className="max-w-5xl mx-auto px-6 py-28 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-semibold mb-6 leading-tight">
          Events are still run across spreadsheets,<br className="hidden md:block" /> emails, and disconnected tools
        </h2>
        <p className="text-[#D4A373] text-lg max-w-3xl mx-auto leading-relaxed mb-12">
          Cateros brings caterers, venues, clients, and vendors into one connected system so events run smoother, faster, and more profitably.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: ClipboardList, label: "No more scattered spreadsheets", desc: "One source of truth for every event detail" },
            { icon: Users, label: "No more disconnected teams", desc: "Caterers, venues, and vendors stay aligned" },
            { icon: DollarSign, label: "No more margin guesswork", desc: "Real-time cost tracking on every event" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card p-6 text-center">
              <div className="w-11 h-11 rounded-lg bg-brand-950 border border-brand-800 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="font-medium text-sm mb-1">{label}</h3>
              <p className="text-xs text-[#D4A373] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-[#182030] border-y border-[#2A3A5C] py-14">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-brand-400 mb-8">
            Trusted by hospitality professionals
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="font-display text-2xl md:text-3xl font-bold text-brand-400 mb-1">{value}</div>
                <div className="text-xs md:text-sm text-[#D4A373]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pt-28">
        <FAQSection />
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 max-w-6xl mx-auto px-6 pb-28">
        <h2 className="text-center font-display text-3xl md:text-4xl font-semibold mb-4">Simple, transparent pricing</h2>
        <p className="text-center text-[#D4A373] mb-14">Choose the plan that fits your operation</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`card p-7 flex flex-col ${
                tier.highlight ? "border-2 border-brand-600 relative" : ""
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-[#0C1220] text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="font-display text-xl font-semibold mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className={`text-4xl font-bold ${tier.highlight ? "text-brand-300" : ""}`}>
                  {tier.price}
                </span>
                {tier.period && <span className="text-[#D4A373] text-lg">{tier.period}</span>}
              </div>
              <p className="text-sm text-[#D4A373] mb-6">{tier.desc}</p>
              <Link
                href="/signup"
                className={`${
                  tier.highlight ? "btn-primary" : "btn-secondary"
                } w-full block text-center mb-2 py-3`}
              >
                {tier.cta}
              </Link>
              <p className="text-xs text-[#7A8BA8] text-center mb-6">No credit card required</p>
              <ul className="space-y-3 text-sm mt-auto">
                {tier.features.map((f, i) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <span className={i === 0 && tier.name === "Pro" ? "font-medium" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#2A3A5C] py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400 mb-4 block">
            The Event Operations Platform
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-5">
            Ready to streamline your event operations?
          </h2>
          <p className="text-[#D4A373] text-lg mb-10 max-w-xl mx-auto">
            Join hospitality professionals using Cateros to plan, price, and execute events profitably.
          </p>
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-base font-medium inline-flex items-center gap-2">
            Start Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-[#7A8BA8] mt-4">No credit card required</p>
        </div>
      </section>
    </>
  );
}
