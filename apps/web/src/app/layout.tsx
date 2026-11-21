import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { MotionProvider } from "@/components/layout/motion-provider";
import { appIconBackground } from "@/lib/app-icon";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "HazardWatch",
    template: "%s · HazardWatch",
  },
  description:
    "Real-time natural hazard monitoring. Track wildfires, earthquakes, cyclones and floods, and get alerted when they hit the places you care about.",
  // Installed on a home screen, the app opens full screen below a dark status bar.
  appleWebApp: { title: "HazardWatch", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: appIconBackground,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
