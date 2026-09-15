import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Specter",
  description: "Scroll something worth it. One topic a week, in real depth.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    // iOS ignores manifest icons and uses this one.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Specter",
    // Not "black-translucent": that forces white status-bar text, which vanishes
    // against the #ffffff light-mode ground. "default" lets themeColor drive it.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Extend under the notch and home indicator; safe-area insets do the spacing.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-ink antialiased overscroll-none">
        {/*
          Phone-first, so nothing below assumes a width. On a desktop viewport
          that let the 1:1 card images scale to the full window — one card came
          out taller than the screen. Cap the app at a phone's width and centre
          it, so a laptop shows a faithful preview instead of a broken layout.
        */}
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-bg sm:border-x sm:border-divider">
          {children}
        </div>
      </body>
    </html>
  );
}
