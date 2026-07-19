import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "Honua",
  description: "Social platform for verified climate action.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" />
      </head>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
