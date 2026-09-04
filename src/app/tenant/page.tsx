"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGatewayGuard } from "@/components/gateway/GatewayGuard";
import { Loader2 } from "lucide-react";

export default function TenantIndexPage() {
  const { checking, isOpen } = useGatewayGuard("tenant");
  const router = useRouter();

  useEffect(() => {
    if (!checking && isOpen) {
      router.replace("/tenant/register");
    }
  }, [checking, isOpen, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1026] text-on-background px-4 font-poppins">
      <div className="flex flex-col items-center gap-4 text-center max-w-md p-8 rounded-2xl bg-surface/10 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(176,198,255,0.1)]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-secondary/20 border-t-secondary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-secondary animate-pulse" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-lg text-white mb-1">
            Verifikasi Gerbang Tenant
          </h3>
          <p className="text-xs text-primary-fixed-dim tracking-wide">
            Mengarahkan ke formulir pendaftaran tenant...
          </p>
        </div>
      </div>
    </div>
  );
}
