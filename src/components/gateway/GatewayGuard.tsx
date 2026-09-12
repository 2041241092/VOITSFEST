"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GatewayEvent, isGatewayOpen, EVENT_NAMES } from "@/lib/gateways";
import { Loader2 } from "lucide-react";

interface GatewayGuardProps {
  event: GatewayEvent;
  children: React.ReactNode;
}

export function useGatewayGuard(event: GatewayEvent) {
  const [checking, setChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      try {
        const open = await isGatewayOpen(event);
        if (!isMounted) return;

        if (!open) {
          router.replace("/registration-closed");
        } else {
          setIsOpen(true);
          setChecking(false);
        }
      } catch (err) {
        console.error("Gateway guard verification error:", err);
        // On unexpected network error, allow form access rather than blocking user
        if (isMounted) {
          setIsOpen(true);
          setChecking(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [event, router]);

  return { checking, isOpen };
}

export default function GatewayGuard({ event, children }: GatewayGuardProps) {
  const { checking, isOpen } = useGatewayGuard(event);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1026] text-on-background px-4 font-poppins">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-8 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-secondary/20 border-t-secondary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-secondary animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white mb-1">
              Verifikasi Gerbang Registrasi
            </h3>
            <p className="text-xs text-primary-fixed-dim tracking-wide">
              {EVENT_NAMES[event] || "Memeriksa ketersediaan kuota..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return null;
  }

  return <>{children}</>;
}
