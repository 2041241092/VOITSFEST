import type { Metadata } from "next";
import { Poppins, Ruthie, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const ruthie = Ruthie({
  weight: "400",
  variable: "--font-ruthie",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

import AmbientComets from "@/components/effects/AmbientComets";

export const metadata: Metadata = {
  title: "VOITSFEST 2026",
  description: "Cosmic Parade of The Stars",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${ruthie.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="relative bg-[#020617] text-white min-h-screen font-poppins">
        {/* 1. Base Responsive Background Layer (Lowest Layer) */}
        <div className="fixed inset-0 -z-30 pointer-events-none overflow-hidden">
          <div
            className="block md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('/Background 2.png')` }}
          />
          <div
            className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('/Background-desktop.png')` }}
          />
        </div>

        {/* 2. Ambient Comets (Middle Background Layer) */}
        <AmbientComets />

        {/* 3. Main Application Content (Interactive Foreground Layer) */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
