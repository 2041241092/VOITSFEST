"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Loader2 } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
  text?: string;
  iconClassName?: string;
  onLogoutStart?: () => void;
}

export default function LogoutButton({
  className = "text-on-surface-variant hover:text-error transition-colors flex items-center gap-2 font-label-md cursor-pointer",
  showText = true,
  text = "Logout",
  iconClassName = "w-5 h-5",
  onLogoutStart,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    if (onLogoutStart) onLogoutStart();

    try {
      const supabase = createClient();
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
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
      aria-label="Log out"
    >
      {loading ? (
        <Loader2 className={`${iconClassName} animate-spin`} />
      ) : (
        <LogOut className={iconClassName} />
      )}
      {showText && <span>{loading ? "Logging out..." : text}</span>}
    </button>
  );
}
