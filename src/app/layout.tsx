import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";

export const metadata: Metadata = {
  title: "Cateros – The Event Operations Platform",
  description: "Run events on the Cateros Event Engine. Proposals, pricing, staffing, vendors, and client approvals — all in one place.",
  metadataBase: new URL("https://cateros.com"),
  openGraph: {
    title: "Cateros – The Event Operations Platform",
    description: "Proposals, pricing, staffing, vendors, and client approvals — all in one place.",
    url: "https://cateros.com",
    siteName: "Cateros",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Cateros Event Engine" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cateros – The Event Operations Platform",
    description: "Proposals, pricing, staffing, vendors, and client approvals — all in one place.",
    images: ["/og-image.png"],
  },
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
            style: { background: "#1A2538", border: "1px solid #2A3A5C", color: "#F4F1ED" },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
