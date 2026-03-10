import Link from "next/link";
import { ChefHat } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C1220] text-[#F4F1ED]">
      {/* Navigation */}
      <nav className="border-b border-[#2A3A5C] px-6 py-4 sticky top-0 z-50 bg-[#0C1220]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-semibold tracking-tight">Cateros</span>
            </Link>
            <div className="hidden md:flex items-center gap-5 ml-4">
              <a href="#features" className="text-sm text-[#D4A373] hover:text-[#F4F1ED] transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-[#D4A373] hover:text-[#F4F1ED] transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="border-t border-[#2A3A5C]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
                  <ChefHat className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-display text-base font-semibold">Cateros</span>
              </div>
              <p className="text-xs text-[#7A8BA8] leading-relaxed">
                The Event Operations Platform for catering and event professionals.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#D4A373] mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Pricing</a></li>
                <li><Link href="/signup" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Get Started</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#D4A373] mb-3">Company</h4>
              <ul className="space-y-2">
                <li><a href="mailto:support@cateros.com" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Contact</a></li>
                <li><Link href="/login" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#D4A373] mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#2A3A5C] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#7A8BA8]">&copy; {new Date().getFullYear()} Cateros. All rights reserved.</p>
            <p className="text-xs text-[#7A8BA8]">Built for catering and event professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
