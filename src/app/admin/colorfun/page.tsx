"use client";

import AdminHeader from "../components/AdminHeader";
import CFRDatabase from "../components/CFRDatabase";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminColorfunPage() {
  return (
    <div 
      className="min-h-screen overflow-x-hidden antialiased text-on-background font-poppins pb-24"
      style={{
        backgroundColor: "#0b1026",
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(46, 78, 143, 0.15) 0%, rgba(11, 16, 38, 1) 70%)",
        backgroundAttachment: "fixed"
      }}
    >
      <AdminHeader />

      <main className="pt-8 px-6 min-h-screen">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-medium text-secondary hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Admin Central</span>
            </Link>
          </div>

          <CFRDatabase />
        </div>
      </main>
    </div>
  );
}
