"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, LogOut, ChevronDown, Home, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
  role?: string;
}

export default function DashboardHeader({
  userName,
  userEmail,
  role = "user",
}: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = "/login";
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0b1026]/75 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex justify-between items-center px-4 md:px-8 h-20">
      {/* Left Logo & Brand */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            alt="VOITSFEST Logo"
            width={150}
            height={40}
            className="h-10 w-auto hover:scale-105 transition-transform"
            src="/assets/img/LOGO VOITSFEST.png"
            priority
          />
        </Link>
        <span className="hidden sm:inline-block text-xs uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
          User Dashboard
        </span>
      </div>

      {/* Right User Actions & Dropdown */}
      <div className="flex items-center gap-3 md:gap-5">
        <Link
          href="/"
          className="text-on-surface-variant hover:text-secondary text-sm hidden md:flex items-center gap-1.5 transition-colors font-medium"
        >
          <Home className="w-4 h-4" />
          <span>Public Portal</span>
        </Link>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary group-hover:border-secondary transition-colors">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-on-surface max-w-[140px] truncate hidden sm:inline">
              {userName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-on-surface-variant transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#0d1228]/95 backdrop-blur-2xl border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.6)] py-3 z-50 divide-y divide-white/10 animate-in fade-in zoom-in-95 duration-150">
              {/* User Profile Header */}
              <div className="px-4 py-2.5">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Account</p>
                <p className="text-sm font-semibold text-white truncate mt-0.5">{userName}</p>
                <p className="text-xs text-on-surface-variant truncate">{userEmail}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
                    {role}
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="py-1.5">
                <Link
                  href="/"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-on-surface hover:bg-white/10 hover:text-white transition-colors md:hidden"
                >
                  <Home className="w-4 h-4 text-secondary" />
                  <span>Public Portal</span>
                </Link>
                <Link
                  href="/colorfun/checkout"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-on-surface hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span>Buy ColorFun Run Ticket</span>
                </Link>
                <Link
                  href="/festival/checkout"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-on-surface hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span>Buy Festival Ticket</span>
                </Link>
              </div>

              {/* Logout Button in Dropdown */}
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors text-left cursor-pointer"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin text-error" />
                  ) : (
                    <LogOut className="w-4 h-4 text-error" />
                  )}
                  <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Direct Logout Button on header */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Log out"
          className="text-on-surface-variant hover:text-error transition-colors flex items-center gap-1.5 text-sm p-2 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin text-error" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="hidden sm:inline font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}
