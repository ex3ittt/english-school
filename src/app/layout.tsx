import type { Metadata, Viewport } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-unbounded",
  display: "swap",
});

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-golos",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s — ${brand.name}` },
  description: `${brand.name}: личный кабинет ученика`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1e1813",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${golos.variable}`}>
      <body>{children}</body>
    </html>
  );
}
