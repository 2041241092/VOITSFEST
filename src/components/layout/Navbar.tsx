"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, User, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  full_name: string;
  role: string;
}

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (user) {
          setCurrentUser(user);
          const { data } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single();
          if (mounted && data) {
            setProfile(data);
          }
        } else {
          setCurrentUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error fetching user in Navbar:", err);
      }
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUser(session.user);
        const { data } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .single();
        if (mounted && data) {
          setProfile(data);
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Click outside listener for dropdown
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

  const displayName = profile?.full_name || currentUser?.email?.split("@")[0] || "Account";
  const userRole = profile?.role || "user";
  const dashboardLink = userRole === "admin" ? "/admin" : userRole === "security" ? "/security" : "/dashboard";

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/60 dark:bg-surface/60 backdrop-blur-xl border-b border-secondary-container/30 shadow-[0_0_20px_rgba(35,68,133,0.4)]">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image 
            src="/assets/img/LOGO VOITSFEST.png" 
            alt="VOITSFEST Logo" 
            width={160} 
            height={48} 
            className="h-10 md:h-12 w-auto object-contain hover:scale-105 transition-transform"
            priority
          />
        </Link>

        {/* Centered Navigation */}
        <ul className="hidden md:flex space-x-gutter justify-center flex-1 items-center">
          <li className="relative group">
            <Link className="text-on-surface/80 hover:text-primary transition-colors hover:bg-primary/10 duration-300 px-3 py-2 rounded-lg font-poppins text-label-sm uppercase flex items-center gap-1" href="#">
              Competitions <ChevronDown className="w-4 h-4" />
            </Link>
            <div className="absolute top-full left-0 mt-2 w-64 glass-card rounded-xl border border-primary/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
              <Link className="block px-4 py-3 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors border-b border-primary/10" href="/competition/bpc/register">Business Plan Competition (BPC)</Link>
              <Link className="block px-4 py-3 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors" href="/competition/bcc/register">Business Case Competition (BCC)</Link>
            </div>
          </li>
          <li className="relative group">
            <Link className="text-on-surface/80 hover:text-primary transition-colors hover:bg-primary/10 duration-300 px-3 py-2 rounded-lg font-poppins text-label-sm uppercase flex items-center gap-1" href="#">
              Events <ChevronDown className="w-4 h-4" />
            </Link>
            <div className="absolute top-full left-0 mt-2 w-56 glass-card rounded-xl border border-primary/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
              <Link className="block px-4 py-3 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors border-b border-primary/10" href="/seminar/register">Seminar Kewirausahaan</Link>
              <Link className="block px-4 py-3 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors border-b border-primary/10" href="/colorfun">ColorFun Run</Link>
              <Link className="block px-4 py-3 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors" href="/festival">Festival</Link>
            </div>
          </li>
          <li className="relative">
            <Link className="text-on-surface/80 hover:text-primary transition-colors hover:bg-primary/10 duration-300 px-3 py-2 rounded-lg font-poppins text-label-sm uppercase" href="/tenant/register">Tenants</Link>
          </li>
          <li className="relative">
            <Link className="text-on-surface/80 hover:text-primary transition-colors hover:bg-primary/10 duration-300 px-3 py-2 rounded-lg font-poppins text-label-sm uppercase" href="/#sponsors">Sponsors</Link>
          </li>
        </ul>

        {/* Action Buttons / User Dropdown */}
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 transition-all group focus:outline-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary group-hover:border-secondary transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-on-surface max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#0d1228]/95 backdrop-blur-2xl border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.6)] py-3 z-50 divide-y divide-white/10 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Info Header */}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">{displayName}</p>
                    <p className="text-xs text-on-surface-variant truncate">{currentUser.email}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
                        {userRole}
                      </span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-1.5">
                    <Link
                      href={dashboardLink}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-on-surface hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-secondary" />
                      <span>{userRole === "admin" ? "Admin Central" : userRole === "security" ? "Security Central" : "My Dashboard"}</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
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
          ) : (
            <>
              <Link href="/register" className="bg-primary-fixed-dim text-on-primary font-poppins text-label-sm px-6 py-2 rounded-full scale-95 active:scale-90 transition-transform glow-effect uppercase hover:scale-105">
                REGISTER
              </Link>
              <Link href="/login" className="border-2 border-primary-fixed-dim text-primary-fixed-dim font-poppins text-label-sm px-6 py-2 rounded-full scale-95 active:scale-90 transition-transform glow-effect uppercase hover:bg-primary/10 hover:scale-105">
                LOGIN
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

