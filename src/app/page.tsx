import Link from "next/link";
import { ChefHat, TrendingUp, FileText, BookOpen, BarChart2, Users, Calendar, Zap, Quote, MapPin, Store, ArrowRight, ClipboardList, DollarSign } from "lucide-react";
import FAQSection from "@/components/landing/FAQSection";

const ENGINE_STEPS = [
  { label: "Inquiry", color: "bg-brand-400" },
  { label: "Proposal", color: "bg-brand-400" },
  { label: "Approval", color: "bg-brand-400" },
  { label: "Coordination", color: "bg-brand-400" },
  { label: "Production", color: "bg-brand-400" },
  { label: "Staffing", color: "bg-brand-400" },
  { label: "Execution", color: "bg-brand-400" },
  { label: "Profit Tracking", color: "bg-brand-400" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0C1220] text-[#F4F1ED]">
      {/* Navigation */}
      <nav className="border-b border-[#2A3A5C] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">Cateros</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn-primary">Start free trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-950 border border-brand-800 text-brand-300 text-xs font-medium px-4 py-2 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          The Cateros Event Engine
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.1] mb-8 tracking-tight">
          Run events on the<br />
          <span className="text-brand-400">Cateros Event Engine</span>
        </h1>
        <p className="text-[#D4A373] text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
          Cateros connects caterers, venues, clients, and vendors in one unified platform to plan, price, manage, and execute events.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-base font-medium">Start your free trial</Link>
          <Link href="#pricing" className="btn-secondary px-10 py-3.5 text-base font-medium">See pricing</Link>
        </div>
        <p className="text-xs text-[#7A8BA8] mt-5">No credit card required · 14-day free trial · Cancel anytime</p>
      </div>

      {/* Powering modern event operations label */}
      <div className="text-center pb-6">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">Powering modern event operations</span>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-28">
        <h2 className="text-center font-display text-3xl md:text-4xl font-semibold mb-4">
          Everything you need to power<br className="hidden md:block" /> modern event operations
        </h2>
        <p className="text-center text-[#D4A373] mb-14 max-w-2xl mx-auto">
          From the first inquiry to the final invoice — one platform for your entire event workflow.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Calendar,
              title: "Event Planning",
              desc: "Build and manage events from inquiry to execution. Track every detail, timeline, and milestone in one place.",
            },
            {
              icon: FileText,
              title: "Proposals & Approvals",
              desc: "Create polished proposals and streamline client approvals. Clients review, accept, or request changes — no back-and-forth emails.",
            },
            {
              icon: MapPin,
              title: "Venue & Vendor Coordination",
              desc: "Keep venues, caterers, and third-party vendors aligned in one system. Everyone sees what they need, nothing they don't.",
            },
            {
              icon: Users,
              title: "Staff & Production",
              desc: "Manage staffing, production details, and event logistics with clarity. Know who's working, what's needed, and when.",
            },
            {
              icon: TrendingUp,
              title: "Pricing & Profitability",
              desc: "Track real costs and protect margins on every event. See food, labor, rentals, and overhead in real time.",
            },
            {
              icon: Store,
              title: "Client Experience",
              desc: "Give clients a cleaner, more professional planning experience. Branded portals, digital approvals, and seamless communication.",
            },
          ].map(({ icon: Icon, title, desc }) => (
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

      {/* The Cateros Event Engine — Workflow */}
      <div className="bg-[#182030] border-y border-[#2A3A5C] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400 mb-3 block">The Cateros Event Engine</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              One system. Every stage of every event.
            </h2>
            <p className="text-[#D4A373] max-w-2xl mx-auto">
              From the first client inquiry to post-event profit tracking — Cateros keeps everything connected.
            </p>
          </div>

          {/* Desktop workflow — horizontal */}
          <div className="hidden md:block">
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute top-5 left-[4%] right-[4%] h-px bg-brand-800/60" />
              <div className="absolute top-5 left-[4%] right-[4%] h-px bg-gradient-to-r from-brand-400/40 via-brand-400/20 to-brand-400/40" />

              {ENGINE_STEPS.map((step, i) => (
                <div key={step.label} className="relative z-10 flex flex-col items-center text-center" style={{ width: `${100 / ENGINE_STEPS.length}%` }}>
                  <div className="w-10 h-10 rounded-full bg-[#0C1220] border-2 border-brand-600 flex items-center justify-center mb-3">
                    <span className="text-xs font-bold text-brand-400">{i + 1}</span>
                  </div>
                  <span className="text-xs font-medium text-[#F4F1ED] leading-tight">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile workflow — vertical */}
          <div className="md:hidden flex flex-col items-center">
            {ENGINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-4 mb-4 last:mb-0">
                <div className="w-9 h-9 rounded-full bg-[#0C1220] border-2 border-brand-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-brand-400">{i + 1}</span>
                </div>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-brand-400 font-display text-lg font-medium mt-12">Every event. One system.</p>
        </div>
      </div>

      {/* Problem / Positioning Section */}
      <div className="max-w-5xl mx-auto px-6 py-28 text-center">
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
      </div>

      {/* Social Proof / Stats Bar */}
      <div className="bg-[#182030] border-y border-[#2A3A5C] py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "5+ hours", label: "Saved per week on event planning" },
            { value: "30%", label: "Better margins with smart pricing" },
            { value: "Zero", label: "Missed details with readiness checklists" },
            { value: "< 2 min", label: "To generate professional proposals" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="font-display text-2xl md:text-3xl font-bold text-brand-400 mb-1">{value}</div>
              <div className="text-xs md:text-sm text-[#D4A373]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="max-w-6xl mx-auto px-6 py-28">
        <h2 className="text-center font-display text-3xl md:text-4xl font-semibold mb-4">Trusted by event professionals</h2>
        <p className="text-center text-[#D4A373] mb-14">See what our customers have to say</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote:
                "We were losing money on weekend weddings and didn\u2019t even know it. Cateros showed us our labor costs were way off \u2014 we fixed our pricing and added 15% to our margins within a month.",
              name: "Sarah M.",
              role: "Executive Chef",
              company: "The Grand Bistro",
            },
            {
              quote:
                "Our old process was a mess \u2014 Excel for recipes, Word for proposals, texts for staffing. Now everything lives in one place. We landed three new corporate accounts last quarter.",
              name: "Marcus R.",
              role: "Catering Director",
              company: "Riverside Kitchen",
            },
            {
              quote:
                "I used to spend Sunday nights building quotes at my kitchen table. Now I price an event during a phone call and send the proposal before we hang up. My clients think I have a whole team behind me.",
              name: "Lisa T.",
              role: "Owner",
              company: "Fresh Fork Catering",
            },
          ].map(({ quote, name, role, company }) => (
            <div key={name} className="card p-7 flex flex-col">
              <Quote className="w-8 h-8 text-brand-800 mb-4 shrink-0" />
              <p className="italic text-sm leading-relaxed mb-6 flex-1">{quote}</p>
              <div>
                <p className="font-medium text-sm">{name}</p>
                <p className="text-xs text-[#D4A373]">
                  {role}, {company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <FAQSection />

      {/* Pricing */}
      <div id="pricing" className="max-w-6xl mx-auto px-6 pb-28">
        <h2 className="text-center font-display text-3xl md:text-4xl font-semibold mb-4">Simple, transparent pricing</h2>
        <p className="text-center text-[#D4A373] mb-14">Choose the plan that fits your operation</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Basic */}
          <div className="card p-7">
            <h3 className="font-display text-xl font-semibold mb-2">Basic</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold">$65</span>
              <span className="text-[#D4A373] text-lg">/month</span>
            </div>
            <p className="text-sm text-[#D4A373] mb-6">Essential tools for managing events and pricing</p>
            <Link href="/signup" className="btn-secondary w-full block text-center mb-2 py-3">Start 14-day trial</Link>
            <p className="text-xs text-[#7A8BA8] text-center mb-6">No credit card required</p>
            <ul className="space-y-3 text-sm">
              {[
                "Unlimited events",
                "Full pricing engine",
                "Professional PDF proposals",
                "Recipe cost library",
                "Profit dashboard",
                "Client portal",
                "Email support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="card p-7 border-2 border-brand-600 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-[#0C1220] text-xs font-semibold px-4 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">Pro</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-brand-300">$149</span>
              <span className="text-[#D4A373] text-lg">/month</span>
            </div>
            <p className="text-sm text-[#D4A373] mb-6">Advanced tools for growing operations</p>
            <Link href="/signup" className="btn-primary w-full block text-center mb-2 py-3">Start 14-day trial</Link>
            <p className="text-xs text-[#7A8BA8] text-center mb-6">No credit card required</p>
            <ul className="space-y-3 text-sm">
              {[
                "Everything in Basic, plus:",
                "Staff scheduling & payroll",
                "Venue & vendor coordination",
                "Custom branded proposals",
                "Production sheets (BEO)",
                "AI business assistant",
                "Advanced analytics",
                "Team collaboration",
                "Priority support & onboarding",
              ].map((f, i) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">✓</span>
                  <span className={i === 0 ? "font-medium" : ""}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-[#2A3A5C] py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400 mb-4 block">The Cateros Event Engine</span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-5">Ready to run events the modern way?</h2>
          <p className="text-[#D4A373] text-lg mb-10 max-w-xl mx-auto">
            Join caterers, venues, and event professionals using Cateros to plan, price, and execute events profitably.
          </p>
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-base font-medium inline-block">Start your free trial</Link>
          <p className="text-xs text-[#7A8BA8] mt-4">No credit card required</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#2A3A5C] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
              <ChefHat className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-[#7A8BA8]">Cateros</span>
          </div>
          <p className="text-xs text-[#7A8BA8]">&copy; {new Date().getFullYear()} Cateros. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
