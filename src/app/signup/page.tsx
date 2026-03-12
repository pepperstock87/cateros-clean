"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signupAction } from "@/lib/actions/auth";
import Link from "next/link";
import { ChefHat, Loader2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";
  const isInvite = searchParams.get("invite") === "1";
  const prefilledEmail = searchParams.get("email") || "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    if (redirectTo) formData.set("redirectTo", redirectTo);
    if (isInvite) formData.set("invite", "1");
    try {
      const result = await signupAction(formData);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      // redirect() throws — expected
    }
  }

  return (
    <div className="min-h-screen bg-[#0C1220] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold">Cateros</span>
          </div>
          {isInvite ? (
            <>
              <h1 className="font-display text-2xl font-semibold mb-2">Join your team</h1>
              <div className="inline-flex items-center gap-1.5 text-sm text-[#D4A373]">
                <Users className="w-4 h-4" />
                Create your free account to join
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold mb-2">Create your account</h1>
              <p className="text-sm text-[#D4A373]">Start your 14-day trial</p>
            </>
          )}
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input type="text" name="full_name" required className="input" placeholder="John Doe" />
            </div>

            {!isInvite && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Company Name</label>
                <input type="text" name="company_name" required className="input" placeholder="Your Restaurant" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                required
                className="input"
                placeholder="you@example.com"
                defaultValue={prefilledEmail}
              />
              {isInvite && prefilledEmail && (
                <p className="text-[11px] text-[#7A8BA8] mt-1">Use the email address the invite was sent to.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" name="password" required minLength={6} className="input" placeholder="••••••••" />
            </div>

            {error && (
              <div className="card p-3 bg-red-900/20 border-red-800/50">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
              {pending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
              ) : isInvite ? (
                "Create account & join team"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-sm text-[#D4A373] text-center mt-4">
            Already have an account?{" "}
            <Link
              href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
