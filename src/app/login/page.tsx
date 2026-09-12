"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CustomHeading from "@/components/ui/CustomHeading";
import Link from "next/link";
import { Rocket, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

function LoginContent() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const redirectTarget = searchParams.get("redirect");
  const supabase = createClient();

  // If already authenticated and landing on /login, redirect immediately to redirect target or dashboard
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        if (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) {
          router.replace(redirectTarget);
        } else {
          router.replace("/dashboard");
        }
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [redirectTarget, router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    console.log("Login attempt started for email:", formData.email);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error("signInWithPassword error:", signInError);
        setError(signInError.message);
        return;
      }

      console.log("signInWithPassword successful. User ID:", data.user?.id);

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", data.user.id)
          .single();
          
        const userRole = profile?.role || data.user.user_metadata?.role || "user";
        
        if (userRole === "admin") {
          router.push("/admin");
        } else if (userRole === "security") {
          router.push("/security");
        } else {
          // Only send normal users to dashboard
          const target = (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) 
            ? redirectTarget 
            : "/dashboard";
          router.push(target);
        }

        router.refresh();
      }
    } catch (err: any) {
      console.error("Unexpected error during login flow:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-[120px] pb-20 px-4 md:px-12 max-w-[1280px] mx-auto w-full relative z-10 font-poppins">
        <div className="text-center mb-12">
          <CustomHeading 
            text="Masuk ke Galaxy" 
            className="text-4xl md:text-[72px] text-on-background mb-4 justify-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] [text-shadow:0_3px_12px_rgba(0,0,0,0.85),0_0_20px_rgba(0,0,0,0.6)]" 
          />
          <p className="text-lg text-primary-fixed-dim max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
            Selamat datang kembali, Penjelajah! Silakan masuk untuk melanjutkan perjalanan kosmik Anda di VOITSFEST 2026.
          </p>
        </div>

        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)] rounded-2xl p-6 md:p-12 w-full max-w-2xl mx-auto">
          <form onSubmit={handleLogin} className="space-y-8 max-w-md mx-auto">
            
            {message && (
              <div className="bg-tertiary-container/30 border border-tertiary/50 text-tertiary px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}
            
            {error && (
              <div className="bg-error-container/30 border border-error/50 text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="font-semibold text-sm text-slate-100 uppercase tracking-wider">Email Aktif</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-6 py-3 text-white placeholder:text-slate-400 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-all"
                placeholder="contoh@email.com" 
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-sm text-slate-100 uppercase tracking-wider">Kata Sandi (Password)</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-6 py-3 text-white placeholder:text-slate-400 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-all pr-12"
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[12px] text-slate-400">Minimal 8 karakter</p>
            </div>

            <div className="pt-6 space-y-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-tertiary text-primary-container font-bold px-8 py-3 rounded-full hover:shadow-[0_0_15px_rgba(230,191,160,0.5)] transition-all uppercase flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : (
                  <>Masuk ke Galaxy <Rocket className="w-5 h-5" /></>
                )}
              </button>
              
              <div className="text-center">
                <Link 
                  href={`/register${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`} 
                  className="text-sm text-on-surface-variant hover:text-tertiary transition-colors"
                >
                  Belum punya akun? <span className="text-tertiary font-bold">Daftar sekarang</span>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-white">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
