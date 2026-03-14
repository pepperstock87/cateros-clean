"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  CreditCard,
  CalendarPlus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Building2,
  Target,
  UtensilsCrossed,
  Store,
  ChefHat,
  Landmark,
  ClipboardList,
  Flower2,
  Music,
  Truck,
  Hotel,
  Briefcase,
} from "lucide-react";
import { updateProfile, completeOnboarding, createEventOnboarding, saveRoleSelection } from "@/lib/actions/onboarding";
import type { BusinessType, PrimaryGoal } from "@/types";

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: typeof Building2 }[] = [
  { value: "caterer", label: "Caterer", icon: UtensilsCrossed },
  { value: "restaurant", label: "Restaurant", icon: Store },
  { value: "private_chef", label: "Private Chef", icon: ChefHat },
  { value: "venue", label: "Venue", icon: Landmark },
  { value: "event_planner", label: "Event Planner", icon: ClipboardList },
  { value: "florist", label: "Florist", icon: Flower2 },
  { value: "band_entertainment", label: "Band or Entertainment", icon: Music },
  { value: "rental_company", label: "Rental Company", icon: Truck },
  { value: "hospitality_management", label: "Hospitality Management", icon: Hotel },
  { value: "other", label: "Other Vendor", icon: Briefcase },
];

const PRIMARY_GOALS: { value: PrimaryGoal; label: string }[] = [
  { value: "book_more_business", label: "Book More Business" },
  { value: "manage_events", label: "Manage Events" },
  { value: "create_proposals", label: "Create Proposals" },
  { value: "organize_staff", label: "Organize Staff" },
  { value: "track_costs", label: "Track Costs" },
  { value: "coordinate_vendors", label: "Coordinate Vendors" },
  { value: "run_production", label: "Run Production" },
  { value: "build_client_relationships", label: "Build Client Relationships" },
];

const STEPS = [
  { label: "Business", icon: Building2 },
  { label: "Goal", icon: Target },
  { label: "Profile", icon: User },
  { label: "Stripe", icon: CreditCard },
  { label: "Event", icon: CalendarPlus },
  { label: "Done", icon: CheckCircle2 },
];

export default function OnboardingClient({
  initialFullName,
  initialCompanyName,
}: {
  initialFullName: string;
  initialCompanyName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  // Step 0 — Business Type
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [secondaryTypes, setSecondaryTypes] = useState<BusinessType[]>([]);

  // Step 1 — Primary Goal
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);

  // Step 2 — Profile
  const [fullName, setFullName] = useState(initialFullName);
  const [companyName, setCompanyName] = useState(initialCompanyName);

  // Step 3 — Stripe
  const [stripeConnected, setStripeConnected] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Step 4 — Event
  const [eventName, setEventName] = useState("");
  const [clientName, setClientName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [eventCreated, setEventCreated] = useState(false);

  // Summary tracking
  const [profileSaved, setProfileSaved] = useState(false);

  const canProceedProfile =
    fullName.trim().length >= 2 && companyName.trim().length >= 2;

  function toggleSecondaryType(type: BusinessType) {
    if (type === businessType) return; // Can't select primary as secondary
    setSecondaryTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : prev.length < 2
          ? [...prev, type]
          : prev
    );
  }

  function handleNext() {
    if (step === 0) {
      // Business type — just advance (saved with goal in step 1)
      if (!businessType) {
        toast.error("Please select your business type");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      // Save role selection
      if (!primaryGoal) {
        toast.error("Please select your primary goal");
        return;
      }
      startTransition(async () => {
        const result = await saveRoleSelection({
          business_type: businessType!,
          primary_goal: primaryGoal,
          secondary_business_types: secondaryTypes,
        });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setStep(2);
      });
      return;
    }
    if (step === 2) {
      // Save profile before moving on
      startTransition(async () => {
        const result = await updateProfile({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
        });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setProfileSaved(true);
        setStep(3);
      });
      return;
    }
    if (step < 5) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setConnectingStripe(false);
        return;
      }
      if (data.url) {
        // Open Stripe onboarding in a new tab
        window.open(data.url, "_blank");
        setStripeConnected(true);
        toast.success("Stripe Connect started in a new tab");
      }
    } catch {
      toast.error("Failed to start Stripe Connect");
    }
    setConnectingStripe(false);
  }

  function handleCreateEvent() {
    if (!eventName.trim() || !clientName.trim() || !eventDate) {
      toast.error("Please fill in the event name, client name, and date");
      return;
    }
    startTransition(async () => {
      const result = await createEventOnboarding({
        name: eventName.trim(),
        clientName: clientName.trim(),
        eventDate,
        guestCount: parseInt(guestCount) || 50,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEventCreated(true);
      toast.success("Event created!");
      setStep(5);
    });
  }

  function handleFinish() {
    startTransition(async () => {
      const result = await completeOnboarding();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.label} className="flex items-center gap-3">
              {i > 0 && (
                <div
                  className={`w-8 h-px transition-colors duration-300 ${
                    isComplete ? "bg-[#D4A373]" : "bg-[#2A3A5C]"
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-[#D4A373] text-[#0B1120] scale-110"
                      : isComplete
                        ? "bg-[#D4A373]/20 text-[#D4A373]"
                        : "bg-[#111827] border border-[#2A3A5C] text-[#7A8BA8]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-xs transition-colors duration-300 ${
                    isActive
                      ? "text-[#D4A373] font-medium"
                      : isComplete
                        ? "text-[#F4F1ED]/60"
                        : "text-[#7A8BA8]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#111827] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D4A373] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Content card */}
      <div className="bg-[#111827] border border-[#2A3A5C] rounded-2xl p-8 shadow-xl">
        {/* Step 0: Business Type */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-[#D4A373]" />
                <span className="text-sm font-medium text-[#D4A373] uppercase tracking-wider">
                  Step 1 of {STEPS.length}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                What best describes your business?
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                We&apos;ll tailor the platform to fit your workflow.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((bt) => {
                const Icon = bt.icon;
                const isSelected = businessType === bt.value;
                return (
                  <button
                    key={bt.value}
                    onClick={() => {
                      setBusinessType(bt.value);
                      // Remove from secondary if it was there
                      setSecondaryTypes((prev) => prev.filter((t) => t !== bt.value));
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center ${
                      isSelected
                        ? "bg-[#D4A373]/10 border-[#D4A373] text-[#D4A373]"
                        : "bg-[#0B1120] border-[#2A3A5C] text-[#F4F1ED]/70 hover:border-[#D4A373]/40 hover:text-[#F4F1ED]"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{bt.label}</span>
                  </button>
                );
              })}
            </div>
            {businessType && (
              <div className="space-y-3">
                <p className="text-sm text-[#F4F1ED]/50">
                  We also do... <span className="text-[#F4F1ED]/30">(optional, up to 2)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.filter((bt) => bt.value !== businessType).map((bt) => {
                    const isSelected = secondaryTypes.includes(bt.value);
                    return (
                      <button
                        key={bt.value}
                        onClick={() => toggleSecondaryType(bt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                          isSelected
                            ? "bg-[#D4A373]/10 border-[#D4A373]/50 text-[#D4A373]"
                            : "bg-[#0B1120] border-[#2A3A5C] text-[#F4F1ED]/50 hover:border-[#D4A373]/30"
                        } ${!isSelected && secondaryTypes.length >= 2 ? "opacity-40 cursor-not-allowed" : ""}`}
                        disabled={!isSelected && secondaryTypes.length >= 2}
                      >
                        {bt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Primary Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-[#D4A373]" />
                <span className="text-sm font-medium text-[#D4A373] uppercase tracking-wider">
                  Step 2 of {STEPS.length}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                What do you need most right now?
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                This helps us prioritize what you see first.
              </p>
            </div>
            <div className="space-y-2">
              {PRIMARY_GOALS.map((g) => {
                const isSelected = primaryGoal === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => setPrimaryGoal(g.value)}
                    className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[#D4A373]/10 border-[#D4A373] text-[#D4A373]"
                        : "bg-[#0B1120] border-[#2A3A5C] text-[#F4F1ED]/70 hover:border-[#D4A373]/40 hover:text-[#F4F1ED]"
                    }`}
                  >
                    <span className="text-sm font-medium">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Welcome & Profile */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[#D4A373]" />
                <span className="text-sm font-medium text-[#D4A373] uppercase tracking-wider">
                  Step 3 of {STEPS.length}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                Welcome to Cateros
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Let&apos;s set up your account. Tell us about yourself and your
                business.
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
                  className="w-full px-4 py-2.5 bg-[#0B1120] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
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
                  className="w-full px-4 py-2.5 bg-[#0B1120] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Connect Stripe */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-[#D4A373]" />
                <span className="text-sm font-medium text-[#D4A373] uppercase tracking-wider">
                  Step 4 of {STEPS.length}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                Connect Stripe
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Accept payments directly from clients. Connect your Stripe
                account to get paid for events and proposals.
              </p>
            </div>
            <div className="bg-[#0B1120] border border-[#2A3A5C] rounded-xl p-6 space-y-4">
              <div className="space-y-3 text-sm text-[#F4F1ED]/70">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A373] mt-0.5 flex-shrink-0" />
                  <span>Accept credit card payments from clients</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A373] mt-0.5 flex-shrink-0" />
                  <span>Collect deposits and milestone payments</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A373] mt-0.5 flex-shrink-0" />
                  <span>Track all payments in one place</span>
                </div>
              </div>
              {stripeConnected ? (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Stripe Connect started — complete setup in the new tab
                </div>
              ) : (
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="w-full px-6 py-3 bg-[#635BFF] text-white font-medium rounded-lg hover:bg-[#635BFF]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connectingStripe ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Connect with Stripe
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Create First Event */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarPlus className="w-5 h-5 text-[#D4A373]" />
                <span className="text-sm font-medium text-[#D4A373] uppercase tracking-wider">
                  Step 5 of {STEPS.length}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                Create your first event
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Add an upcoming event to get started, or skip this and create
                one later.
              </p>
            </div>
            {eventCreated ? (
              <div className="bg-[#0B1120] border border-green-500/20 rounded-xl p-6 flex items-center gap-3 text-green-400">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Event created!</div>
                  <div className="text-sm text-green-400/70">
                    {eventName} — {clientName}
                  </div>
                </div>
              </div>
            ) : (
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
                    className="w-full px-4 py-2.5 bg-[#0B1120] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="clientName"
                    className="block text-sm font-medium text-[#F4F1ED]/80 mb-1.5"
                  >
                    Client Name
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full px-4 py-2.5 bg-[#0B1120] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
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
                      className="w-full px-4 py-2.5 bg-[#0B1120] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors [color-scheme:dark]"
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
                      className="w-full px-4 py-2.5 bg-[#0B1120] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder:text-[#F4F1ED]/30 focus:outline-none focus:ring-2 focus:ring-[#D4A373]/50 focus:border-[#D4A373]/50 transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateEvent}
                  disabled={isPending}
                  className="w-full px-6 py-3 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4" />
                      Create Event
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#D4A373]/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#D4A373]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#F4F1ED]">
                You&apos;re all set!
              </h1>
              <p className="mt-2 text-[#F4F1ED]/60">
                Here&apos;s a summary of what you set up:
              </p>
            </div>
            <div className="text-left space-y-3 bg-[#0B1120] rounded-xl p-5 border border-[#2A3A5C]">
              <div className="flex justify-between items-center">
                <span className="text-[#F4F1ED]/50 text-sm">Business Type</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {BUSINESS_TYPES.find((bt) => bt.value === businessType)?.label || "Caterer"}
                </span>
              </div>
              <div className="border-t border-[#2A3A5C]" />
              <div className="flex justify-between items-center">
                <span className="text-[#F4F1ED]/50 text-sm">Primary Goal</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {PRIMARY_GOALS.find((g) => g.value === primaryGoal)?.label || "Manage Events"}
                </span>
              </div>
              <div className="border-t border-[#2A3A5C]" />
              <div className="flex justify-between items-center">
                <span className="text-[#F4F1ED]/50 text-sm">Name</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {fullName || "Not set"}
                </span>
              </div>
              <div className="border-t border-[#2A3A5C]" />
              <div className="flex justify-between items-center">
                <span className="text-[#F4F1ED]/50 text-sm">Company</span>
                <span className="text-[#F4F1ED] text-sm font-medium">
                  {companyName || "Not set"}
                </span>
              </div>
              <div className="border-t border-[#2A3A5C]" />
              <div className="flex justify-between items-center">
                <span className="text-[#F4F1ED]/50 text-sm">
                  Stripe Connect
                </span>
                <span
                  className={`text-sm font-medium ${stripeConnected ? "text-green-400" : "text-[#7A8BA8]"}`}
                >
                  {stripeConnected ? "Started" : "Skipped"}
                </span>
              </div>
              {eventCreated && (
                <>
                  <div className="border-t border-[#2A3A5C]" />
                  <div className="flex justify-between items-center">
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

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {step > 0 && step < 5 && (
              <button
                onClick={handleBack}
                disabled={isPending}
                className="flex items-center gap-1.5 text-sm text-[#F4F1ED]/50 hover:text-[#F4F1ED] transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Skip for now on Stripe and Event steps */}
            {(step === 3 || (step === 4 && !eventCreated)) && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={isPending}
                className="text-sm text-[#F4F1ED]/40 hover:text-[#F4F1ED]/60 transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
            )}

            {/* Business Type — Next */}
            {step === 0 && (
              <button
                onClick={handleNext}
                disabled={!businessType || isPending}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Primary Goal — Next (saves role) */}
            {step === 1 && (
              <button
                onClick={handleNext}
                disabled={!primaryGoal || isPending}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {/* Profile — Next (saves profile) */}
            {step === 2 && (
              <button
                onClick={handleNext}
                disabled={!canProceedProfile || isPending}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {/* Stripe — Next */}
            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Event created — Next */}
            {step === 4 && eventCreated && (
              <button
                onClick={() => setStep(5)}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Done — Go to Dashboard */}
            {step === 5 && (
              <button
                onClick={handleFinish}
                disabled={isPending}
                className="px-6 py-2.5 bg-[#D4A373] text-[#0B1120] font-medium rounded-lg hover:bg-[#D4A373]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  "Go to Dashboard"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
