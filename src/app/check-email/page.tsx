"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChefHat, Mail } from "lucide-react";
import { Suspense } from "react";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-screen bg-[#0f0d0b] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-[#f5ede0]">Cateros</span>
        </div>

        <div className="card p-8">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-6 h-6 text-brand-400" />
          </div>

          <h1 className="font-display text-2xl font-semibold text-[#f5ede0] mb-2">
            Check your inbox
          </h1>

          <p className="text-sm text-[#9c8876] mb-1">
            We sent a confirmation link to
          </p>

          {email && (
            <p className="text-sm font-medium text-[#f5ede0] mb-6">{email}</p>
          )}

          {!email && (
            <p className="text-sm text-[#9c8876] mb-6">your email address.</p>
          )}

          <p className="text-sm text-[#9c8876] mb-6">
            Click the link in the email to verify your account and get started.
          </p>

          <Link
            href="/login"
            className="btn-primary inline-flex items-center justify-center w-full"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f0d0b] flex items-center justify-center">
          <div className="text-[#9c8876] text-sm">Loading...</div>
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
