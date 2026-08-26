import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ulcershield-ai.vercel.app";
const SITE_NAME = "UlcerShield AI";
const SITE_DESCRIPTION =
  "AI-Powered Digital Twin for Real-Time Pressure Ulcer Prevention. Personalized risk analysis, Remaining Safe Tissue Time countdown, and Claude-powered clinical guidance — from a low-cost ESP32 sensor rig linked over Web Bluetooth.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Bedsore Prevention Platform`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "bedsore",
    "pressure injury",
    "pressure ulcer",
    "prevention",
    "digital tissue twin",
    "remaining safe tissue time",
    "ESP32",
    "Web Bluetooth",
    "Claude",
    "clinical decision support",
    "UlcerShield",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · Bedsore Prevention Platform`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["ar_SA", "ko_KR"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Bedsore Prevention Platform`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "medical",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#030b16" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-fontsize="m"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
