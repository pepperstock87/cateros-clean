"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, skipOnboarding } from "@/lib/actions/onboarding";

const STEPS = ["Profile", "Business", "First Event", "All Set"];

type BusinessType = "caterer" | "venue" | "planner" | "multi" | "";

const BUSINESS_TYPES = [
  {
    value: "caterer" as const,
    label: "Caterer",
    description: "Food preparation & service for events",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" />
      </svg>
    ),
  },
  {
    value: "venue" as const,
    label: "Venue",
    description: "Event space & venue management",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
  },
  {
    value: "planner" as const,
    label: "Event Planner",
    description: "Full-service event coordination",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    value: "multi" as const,
    label: "Multi-Service",
    description: "Catering, venue & planning combined",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // Step 1: Profile
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Step 2: Business type
  const [businessType, setBusinessType] = useState<BusinessType>("");

  // Step 3: First event (optional)
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");

  const canProceed = () => {
    if (step === 0) return fullName.trim().length >= 2 && companyName.trim().length >= 2;
    if (step === 1) return businessType !== "";
    return true;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    setError("");
    startTransition(async () => {
      const eventData =
        eventName.trim() && eventDate
          ? {
              name: eventName.trim(),
              date: eventDate,
              guestCount: parseInt(guestCount) || 50,
            }
          : null;

      const result = await completeOnboarding({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        businessType,
        event: eventData,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
      }
    });
  };

  const handleSkip = () => {
    startTransition(async () => {
      const result = await skipOnboarding();
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-[#F4F1ED]/60">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`transition-colors ${
                i === step
                  ? "text-[#D4A373] font-medium"
                  : i < step
                    ? "text-[#F4F1ED]/80"
                    : ""
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="h-1.5 bg-[#1A2538] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D4A373] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-[#1A2538] rounded-2xl border border-white/5 p-8 shadow-xl">
        {/* Step 1: Profile */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                Welcome to Cateros
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Let&apos;s get your account set up. Tell us a bit about yourself.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-[#F4F1ED]/80 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 bg-[#0C1220] border border-white/10 rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-[#F4F1ED]/80 mb-1.5"
                >
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Delightful Catering Co."
                  className="w-full px-4 py-2.5 bg-[#0C1220] border border-white/10 rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Business Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                What type of business do you run?
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                This helps us personalize your Cateros experience.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setBusinessType(type.value)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all ${
                    businessType === type.value
                      ? "border-[#D4A373] bg-[#D4A373]/10 ring-1 ring-[#D4A373]/30"
                      : "border-white/10 bg-[#0C1220] hover:border-white/20 hover:bg-[#0C1220]/80"
                  }`}
                >
                  <div
                    className={`${
                      businessType === type.value
                        ? "text-[#D4A373]"
                        : "text-[#F4F1ED]/50"
                    }`}
                  >
                    {type.icon}
                  </div>
                  <div>
                    <div
                      className={`font-medium ${
                        businessType === type.value
                          ? "text-[#D4A373]"
                          : "text-[#F4F1ED]"
                      }`}
                    >
                      {type.label}
                    </div>
                    <div className="text-xs text-[#F4F1ED]/40 mt-0.5">
                      {type.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: First Event */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                Add your first event
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Create a sample event to get started, or skip this step and add
                one later.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="eventName"
                  className="block text-sm font-medium text-[#F4F1ED]/80 mb-1.5"
                >
                  Event Name
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Johnson Wedding Reception"
                  className="w-full px-4 py-2.5 bg-[#0C1220] border border-white/10 rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="eventDate"
                    className="block text-sm font-medium text-[#F4F1ED]/80 mb-1.5"
                  >
                    Date
                  </label>
                  <input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0C1220] border border-white/10 rounded-lg text-[#F4F1ED] focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="guestCount"
                    className="block text-sm font-medium text-[#F4F1ED]/80 mb-1.5"
                  >
                    Guest Count
                  </label>
                  <input
                    id="guestCount"
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    placeholder="50"
                    min="1"
                    className="w-full px-4 py-2.5 bg-[#0C1220] border border-white/10 rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-[#F4F1ED]/40">
              Leave blank to skip. You can always create events from the
              dashboard.
            </p>
          </div>
        )}

        {/* Step 4: All Set */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#D4A373]/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#D4A373]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                You&apos;re all set!
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Here&apos;s a summary of your setup:
              </p>
            </div>
            <div className="text-left space-y-3 bg-[#0C1220] rounded-xl p-5 border border-white/5">
              <div className="flex justify-between">
                <span className="text-[#F4F1ED]/50 text-sm">Name</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {fullName}
                </span>
              </div>
              <div className="border-t border-white/5" />
              <div className="flex justify-between">
                <span className="text-[#F4F1ED]/50 text-sm">Company</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {companyName}
                </span>
              </div>
              <div className="border-t border-white/5" />
              <div className="flex justify-between">
                <span className="text-[#F4F1ED]/50 text-sm">Business Type</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {BUSINESS_TYPES.find((t) => t.value === businessType)?.label ||
                    "Not set"}
                </span>
              </div>
              {eventName.trim() && (
                <>
                  <div className="border-t border-white/5" />
                  <div className="flex justify-between">
                    <span className="text-[#F4F1ED]/50 text-sm">
                      First Event
                    </span>
                    <span className="text-[#F4F1ED] text-sm font-medium">
                      {eventName}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                className="text-sm text-[#F4F1ED]/50 hover:text-[#F4F1ED] transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSkip}
              disabled={isPending}
              className="text-sm text-[#F4F1ED]/40 hover:text-[#F4F1ED]/60 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0C1220] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0C1220] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Setting up...
                  </>
                ) : (
                  "Go to Dashboard"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step indicator dots */}
      <div className="flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "w-6 bg-[#D4A373]"
                : i < step
                  ? "w-1.5 bg-[#D4A373]/40"
                  : "w-1.5 bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
