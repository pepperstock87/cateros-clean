"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChefHat,
  CalendarPlus,
  BookOpen,
  Palette,
  UserPlus,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { dismissWelcomeAction } from "@/lib/actions/onboarding";

interface WelcomeModalProps {
  hasSeenWelcome: boolean;
}

const steps = [
  {
    icon: CalendarPlus,
    title: "Create your first event",
    description:
      "Set up a catering event with guests, venue, and menu details.",
    href: "/events/new",
  },
  {
    icon: BookOpen,
    title: "Add a recipe to your library",
    description:
      "Build your recipe collection for easy menu planning and costing.",
    href: "/recipes/new",
  },
  {
    icon: Palette,
    title: "Set up your branding",
    description:
      "Customize your logo, colors, and proposal styles to match your brand.",
    href: "/branding",
  },
  {
    icon: UserPlus,
    title: "Invite your first staff member",
    description:
      "Add team members so everyone stays in sync on upcoming events.",
    href: "/staff",
  },
];

export function WelcomeModal({ hasSeenWelcome }: WelcomeModalProps) {
  const [open, setOpen] = useState(!hasSeenWelcome);
  const [isPending, startTransition] = useTransition();

  if (open === false) return null;

  function handleDismiss() {
    setOpen(false);
    startTransition(() => {
      dismissWelcomeAction();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-[#1a1714] border border-[#2e271f] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#9c8876] hover:text-[#f5ede0] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="relative px-8 pt-10 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-950 border border-brand-800 mb-5">
            <ChefHat className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#f5ede0] mb-2">
            Welcome to CaterOS
          </h2>
          <p className="text-sm text-[#9c8876] max-w-sm mx-auto leading-relaxed">
            Your catering command center is ready. Here are a few things to get
            you up and running.
          </p>
        </div>

        {/* Checklist */}
        <div className="px-8 pb-2 space-y-2">
          {steps.map((step) => (
            <Link
              key={step.href}
              href={step.href}
              onClick={handleDismiss}
              className="group flex items-start gap-4 p-4 rounded-xl bg-[#0f0d0b] border border-[#2e271f] hover:border-brand-800 transition-all duration-200"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-950 border border-brand-800 flex items-center justify-center group-hover:bg-brand-900 transition-colors">
                <step.icon className="w-5 h-5 text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f5ede0] group-hover:text-brand-300 transition-colors">
                  {step.title}
                </p>
                <p className="text-xs text-[#9c8876] mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9c8876] mt-1 flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 pt-4 pb-8">
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="w-full btn-primary inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Get Started
          </button>
          <p className="text-center text-xs text-[#9c8876] mt-3">
            You can always find these in your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
