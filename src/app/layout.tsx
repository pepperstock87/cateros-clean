import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";

export const metadata: Metadata = {
  title: "Cateros – Catering Pricing & Proposal Software",
  description: "Professional pricing engine and proposal generator for catering companies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Suspense fallback={null}>
          <AssistantProvider />
        </Suspense>
        <Toaster
          theme="dark"
          toastOptions={{
            style: { background: "#1c1814", border: "1px solid #2e271f", color: "#f5ede0" },
          }}
        />
      </body>
    </html>
  );
}
