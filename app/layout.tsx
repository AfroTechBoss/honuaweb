import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "Honua",
  description: "Social platform for verified climate action.",
  openGraph: {
    title: "Honua",
    description: "Social platform for verified climate action.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Honua" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Honua",
    description: "Social platform for verified climate action.",
    images: ["/opengraph-image.png"],
  },
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
