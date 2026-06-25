import type { Metadata, Viewport } from "next";
import { Cinzel, Caveat, Nunito } from "next/font/google";
import "./globals.css";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const hand = Caveat({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-hand",
  display: "swap",
  fallback: ["cursive"],
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Wanderlist — the map of your life",
  description:
    "An endless, explorable map where experiences become memories. Add a dream, complete it with a photo, and watch your world grow.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#e3d2ad",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${hand.variable} ${body.variable}`}
    >
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
