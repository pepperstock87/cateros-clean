import Link from "next/link";
import { ChefHat, TrendingUp, FileText, BookOpen, BarChart2, Users, Calendar, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0d0b] text-[#f5ede0]">
      <nav className="border-b border-[#2e271f] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Cateros</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Start free trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-950 border border-brand-800 text-brand-300 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Built for restaurants with catering operations
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-semibold leading-tight mb-6">
          Stop leaving money on the table.<br />
          <span className="text-brand-400">Price catering events right.</span>
        </h1>
        <p className="text-[#9c8876] text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          The all-in-one platform for restaurant catering operations. Calculate true costs, manage staff scheduling, and generate professional proposals that win business.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="btn-primary px-8 py-3 text-base">Start 14-day free trial →</Link>
          <Link href="#pricing" className="btn-secondary px-8 py-3 text-base">See pricing</Link>
        </div>
        <p className="text-xs text-[#6b5a4a] mt-4">No credit card required · Cancel anytime</p>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-center font-display text-3xl font-semibold mb-12">Everything you need in one platform</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, title: "Smart Pricing Engine", desc: "Calculate food, labor, rentals, and overhead in real-time" },
            { icon: FileText, title: "Professional Proposals", desc: "Generate branded PDFs that close more deals" },
            { icon: Calendar, title: "Staff Scheduling", desc: "Manage catering staff and track payroll costs" },
            { icon: BookOpen, title: "Recipe Cost Library", desc: "Auto-calculate per-person food costs from your menu" },
            { icon: BarChart2, title: "Profit Analytics", desc: "See which events make money and which don't" },
            { icon: Users, title: "Team Collaboration", desc: "Multi-user access with role-based permissions" },
            { icon: Zap, title: "Fast & Easy", desc: "Price an event in under 5 minutes" },
            { icon: ChefHat, title: "Built for Restaurants", desc: "Designed specifically for restaurant catering operations" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5">
              <div className="w-9 h-9 rounded-lg bg-brand-950 border border-brand-800 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-brand-400" />
              </div>
              <h3 className="font-medium text-sm mb-1">{title}</h3>
              <p className="text-xs text-[#9c8876] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-center font-display text-3xl font-semibold mb-4">Simple, transparent pricing</h2>
        <p className="text-center text-[#9c8876] mb-12">Choose the plan that fits your business</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="card p-6">
            <h3 className="font-display text-xl font-semibold mb-2">Free</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-[#9c8876]">/month</span>
            </div>
            <p className="text-sm text-[#9c8876] mb-6">Perfect for testing the platform</p>
            <Link href="/signup" className="btn-secondary w-full block text-center mb-6">Get started</Link>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>3 events per month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Basic pricing engine</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Watermarked PDF proposals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Basic dashboard</span>
              </li>
            </ul>
          </div>

          {/* Basic */}
          <div className="card p-6 border-2 border-brand-600 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-medium px-3 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">Basic</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">$65</span>
              <span className="text-[#9c8876]">/month</span>
            </div>
            <p className="text-sm text-[#9c8876] mb-6">For small restaurants & caterers</p>
            <Link href="/signup" className="btn-primary w-full block text-center mb-6">Start 14-day trial</Link>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong>Unlimited events</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Full pricing engine</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Professional PDF proposals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>25 recipes in cost library</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Full profit dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Email support</span>
              </li>
            </ul>
          </div>

          {/* Pro */}
          <div className="card p-6">
            <h3 className="font-display text-xl font-semibold mb-2">Pro</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">$149</span>
              <span className="text-[#9c8876]">/month</span>
            </div>
            <p className="text-sm text-[#9c8876] mb-6">For growing operations</p>
            <Link href="/signup" className="btn-secondary w-full block text-center mb-6">Start 14-day trial</Link>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong>Everything in Basic, plus:</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Staff scheduling & payroll tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Multi-user team access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Custom branded proposals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Advanced analytics & reporting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>API access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Priority support + onboarding</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-[#2e271f] py-16">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="font-display text-3xl font-semibold mb-4">Ready to stop underpricing your catering?</h2>
          <p className="text-[#9c8876] mb-8">Join restaurants across the country using Cateros to price events profitably.</p>
          <Link href="/signup" className="btn-primary px-8 py-3 text-base inline-block">Start your 14-day free trial →</Link>
        </div>
      </div>
    </div>
  );
}