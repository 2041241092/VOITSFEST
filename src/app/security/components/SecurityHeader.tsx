"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Shield, 
  LogOut, 
  User, 
  ShieldCheck 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SecurityHeaderProps {
  guardName: string;
  guardEmail: string;
  role: string;
}

export default function SecurityHeader({
  guardName,
  guardEmail,
  role,
}: SecurityHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Sign out handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 w-full z-50 bg-[#0b1026]/75 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)] h-20 transition-all">
      <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center justify-between">
        
        {/* 1. Left Section: LOGO VOITSFEST.png */}
        <div className="flex items-center justify-start flex-1">
          <Link 
            href="/security" 
            className="flex items-center gap-3 group"
            title="VOITSFEST Security Dashboard"
          >
            <Image 
              src="/assets/img/LOGO VOITSFEST.png" 
              alt="VOITSFEST Logo" 
              width={160} 
              height={48} 
              className="h-9 md:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </Link>
        </div>

        {/* 2. Center / Title Section: 'Security Dashboard' matching Admin Central typography */}
        <div className="flex items-center justify-center flex-1 text-center">
          <div className="flex items-center gap-2 select-none">
            <h1 className="font-poppins font-bold text-xl sm:text-2xl tracking-wide flex items-center gap-2">
              <span className="text-white drop-shadow-[0_0_15px_rgba(176,198,255,0.6)]">
                Security
              </span>
              <span className="text-secondary drop-shadow-[0_0_20px_rgba(240,192,77,0.7)]">
                Dashboard
              </span>
            </h1>
          </div>
        </div>

        {/* 3. Right Section: User Account Profile button with dropdown */}
        <div className="flex items-center justify-end flex-1 gap-3 sm:gap-4">
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Account Menu"
              aria-label="Security Account Menu"
              aria-expanded={dropdownOpen}
              className={`p-2.5 rounded-full border transition-all duration-200 flex items-center justify-center active:scale-95 cursor-pointer ${
                dropdownOpen 
                  ? "bg-secondary/25 border-secondary text-secondary shadow-[0_0_15px_rgba(240,192,77,0.3)]" 
                  : "bg-surface/40 hover:bg-secondary/15 border-white/15 text-on-surface hover:text-secondary hover:border-secondary/40"
              }`}
            >
              <User className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#0f1738]/95 backdrop-blur-2xl border border-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.6)] py-2 text-on-surface animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                {/* Account Info: User Name and Email */}
                <div className="px-5 py-4 border-b border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white tracking-tight truncate max-w-[170px]">
                      {guardName || "Petugas Security"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/40 shadow-[0_0_10px_rgba(240,192,77,0.2)]">
                      <ShieldCheck className="w-3 h-3" /> {(role || "SECURITY").toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant break-all">
                    {guardEmail || "security@voitsfest.id"}
                  </span>
                </div>

                {/* Navigation Item: 'Security Dashboard' button/link */}
                <div className="px-2 py-2">
                  <Link
                    href="/security"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-on-surface-variant hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left"
                  >
                    <Shield className="w-4 h-4 text-secondary" />
                    <span>Security Dashboard</span>
                  </Link>
                </div>

                {/* Divider line */}
                <div className="h-px bg-white/10 my-1 mx-2" />

                {/* Action Item: 'Log Out' button */}
                <div className="px-2 py-1">
                  <button 
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-error hover:text-white hover:bg-error/20 rounded-xl transition-colors text-left disabled:opacity-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
