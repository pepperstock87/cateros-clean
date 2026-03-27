import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Portal – Cateros",
  description: "View your event details and communicate with your caterer",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background: #f9fafb;
            color: #111827;
          }
          * {
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f9fafb" }}>
        {children}
      </body>
    </html>
  );
}
