"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import Link from "next/link";
import { ChefHat, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return (
    <div className="min-h-screen bg-[#0f0d0b] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold">Cateros</span>
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Welcome back</h1>
          <p className="text-sm text-[#9c8876]">Sign in to your account</p>
        </div>

        <div className="card p-6">
          <form action={action} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" name="email" required className="input" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" name="password" required className="input" placeholder="••••••••" />
            </div>

            {state?.error && (
              <div className="card p-3 bg-red-900/20 border-red-800/50">
                <p className="text-sm text-red-300">{state.error}</p>
              </div>
            )}

            <button type="submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2">
              {pending ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-[#9c8876] text-center mt-4">
            Don't have an account?{" "}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
