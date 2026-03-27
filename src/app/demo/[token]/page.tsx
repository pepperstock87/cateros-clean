"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function DemoAccessPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/demo/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          viewer_name: name.trim() || undefined,
          viewer_email: email.trim() || undefined,
          viewer_company: company.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(data.redirect || "/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C1220] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <span className="text-[#0C1220] font-bold text-lg">C</span>
            </div>
            <span className="font-display text-2xl font-semibold tracking-tight">Cateros</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold mb-3">
            Partner Sandbox
          </h1>
          <p className="text-[#D4A373] text-sm leading-relaxed max-w-sm mx-auto">
            Explore event operations, menu costing, staffing, and margin tracking in a live environment with real sample data.
          </p>
        </div>

        {/* Access Form */}
        <div className="card p-6">
          {error && (
            <div className="bg-red-900/30 border border-red-900/50 text-red-400 text-sm px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Your name</label>
              <input
                className="input"
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Company <span className="text-[#7A8BA8]">(optional)</span></label>
              <input
                className="input"
                placeholder="PFG, Sysco, etc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up your demo...
                </>
              ) : (
                <>
                  Enter Demo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-[#7A8BA8] text-center mt-4">
            Read-only access. No account created. Your information is used to personalize the experience.
          </p>
        </div>

        <p className="text-center text-xs text-[#7A8BA8] mt-6">
          Powered by <span className="text-[#D4A373]">Cateros</span> &middot; The Event Operations Platform
        </p>
      </div>
    </div>
  );
}
