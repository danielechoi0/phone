import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Research Reports", template: "%s · Research" },
  description: "Reports from Claude research sessions",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Research", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#16161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>◆</span> Research
          </Link>
        </header>
        <main>{children}</main>
        <footer className="footer">Built {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" })} ET</footer>
      </body>
    </html>
  );
}
