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

import BackgroundWrapper from "@/components/layout/BackgroundWrapper";

export const metadata: Metadata = {
  title: "VOITSFEST 2026",
  description: "Cosmic Parade of The Stars",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${ruthie.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-poppins">
        <BackgroundWrapper>{children}</BackgroundWrapper>
      </body>
    </html>
  );
}
