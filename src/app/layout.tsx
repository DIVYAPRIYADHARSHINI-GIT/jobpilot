import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import { themeInitScript } from "@/components/ThemeProvider";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui";
import { StatusSync } from "@/components/StatusSync";

// Self-hosted by Next.js. Tamil/Devanagari fonts are only downloaded when
// that script is on screen (unicode-range), so English pages stay light.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoTa = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "600", "700"], variable: "--font-noto-ta", display: "swap", preload: false });
const notoDeva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-noto-deva", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: { default: "JobPilot - Apply smarter, not harder.", template: "%s | JobPilot" },
  description: "JobPilot is a demo job application tracker that matches, auto-fills and submits applications on the built-in JobHub demo portal, then tracks them on a Kanban board. English, Tamil and Hindi.",
  applicationName: "JobPilot",
  openGraph: { title: "JobPilot", description: "Apply smarter, not harder. Demo auto job-application tracker.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${notoTa.variable} ${notoDeva.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-4 sm:py-8">{children}</main>
          <Footer />
          <Toaster />
          <StatusSync />
        </I18nProvider>
      </body>
    </html>
  );
}
