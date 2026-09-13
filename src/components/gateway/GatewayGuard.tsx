"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GatewayEvent, isGatewayOpen, EVENT_NAMES } from "@/lib/gateways";
import { fetchPricingTiers, PricingEvent } from "@/lib/pricing";
import { fetchAllSubEventQuotas } from "@/lib/quota";
import { getEventTimeStatus } from "@/lib/timeUtils";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";

interface GatewayGuardProps {
  event: GatewayEvent;
  children: React.ReactNode;
}

const GATEWAY_TO_PRICING: Record<GatewayEvent, PricingEvent> = {
  cfr: "colorfun",
  festival: "festival",
  seminar: "seminar",
  bcc: "bcc",
  bpc: "bpc",
  tenant: "tenant",
};

function GatewayGuardLoading({ eventName }: { eventName?: string }) {
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
            Verifikasi Akses Registrasi
          </h3>
          <p className="text-xs text-primary-fixed-dim tracking-wide">
            {eventName || "Memeriksa status pendaftaran dan validitas promo..."}
          </p>
        </div>
      </div>
    </div>
  );
}

function GatewayGuardContent({ event, children }: GatewayGuardProps) {
  const [checking, setChecking] = useState(true);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function verifyAll() {
      try {
        const pricingKey = GATEWAY_TO_PRICING[event];
        const supabase = createClient();

        // 1. Evaluate Sub-Event Gateway status (from cms_settings gateways)
        const open = await isGatewayOpen(event);
        if (!isMounted) return;
        if (!open) {
          setBlockedReason("Pendaftaran untuk sub-event ini sedang ditutup oleh panitia.");
          setChecking(false);
          return;
        }

        // 2. Evaluate Sub-Event status in cms_settings.pricing_tiers (dates and quotas)
        const [tiers, allQuotas] = await Promise.all([
          fetchPricingTiers(),
          fetchAllSubEventQuotas(),
        ]);
        if (!isMounted) return;

        const tier = tiers[pricingKey];
        if (tier) {
          // Check validity dates in literal WIB
          const { isStarted, isEnded } = getEventTimeStatus(tier.start_date, tier.end_date);
          if (!isStarted) {
            setBlockedReason("Periode pendaftaran untuk fase ini belum dibuka.");
            setChecking(false);
            return;
          }
          if (isEnded) {
            setBlockedReason("Periode pendaftaran untuk sub-event ini telah berakhir.");
            setChecking(false);
            return;
          }
        }

        // Check quota availability
        const quota = allQuotas[pricingKey];
        if (quota && (quota.isEventFull || quota.isPhaseFull)) {
          setBlockedReason("Total kuota pendaftaran untuk sub-event ini telah mencapai kapasitas maksimal (Sold Out).");
          setChecking(false);
          return;
        }

        // 3. If a promo_id / coupon parameter is passed in the URL, verify promo validity
        const promoParam =
          searchParams?.get("promoId") ||
          searchParams?.get("promo_id") ||
          searchParams?.get("coupon") ||
          searchParams?.get("promo");

        if (promoParam) {
          // Look up promo record
          let query = supabase.from("promos").select("*");
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promoParam)) {
            query = query.eq("id", promoParam);
          } else {
            query = query.ilike("title", promoParam);
          }

          const { data: promoData, error: promoErr } = await query.maybeSingle();
          if (!isMounted) return;

          if (promoErr || !promoData || !promoData.is_active) {
            setBlockedReason("Kupon promo atau paket bundling yang Anda pilih tidak aktif atau tidak ditemukan.");
            setChecking(false);
            return;
          }

          // Verify promo date window
          const { isActive: isPromoActive } = getEventTimeStatus(promoData.start_date, promoData.end_date);
          if (!isPromoActive) {
            setBlockedReason("Masa berlaku kupon promo atau paket bundling ini telah berakhir.");
            setChecking(false);
            return;
          }

          // Verify remaining quota in public.promos
          if (promoData.kuota_maksimal != null) {
            const [festPromoRes, cfrPromoRes] = await Promise.all([
              supabase
                .from("festival_registrations")
                .select("id, payment_status")
                .eq("promo_id", promoData.id),
              supabase
                .from("colorfun_registrations")
                .select("id, payment_status")
                .eq("promo_id", promoData.id),
            ]);

            const festUsed = (festPromoRes.data || []).filter((r: any) => {
              const s = (r.payment_status || "").toLowerCase();
              return s !== "rejected" && s !== "";
            }).length;
            const cfrUsed = (cfrPromoRes.data || []).filter((r: any) => {
              const s = (r.payment_status || "").toLowerCase();
              return s !== "rejected" && s !== "";
            }).length;

            const totalUsed = Math.max(promoData.kuota_terpakai ?? 0, festUsed + cfrUsed);
            if (totalUsed >= promoData.kuota_maksimal) {
              setBlockedReason("Kuota untuk paket promo atau bundling ini telah habis terpakai.");
              setChecking(false);
              return;
            }
          }
        }

        // All checks passed!
        setBlockedReason(null);
        setChecking(false);
      } catch (err) {
        console.error("Gateway guard verification error:", err);
        // On unexpected error, do not block
        if (isMounted) {
          setBlockedReason(null);
          setChecking(false);
        }
      }
    }

    verifyAll();

    return () => {
      isMounted = false;
    };
  }, [event, searchParams]);

  if (checking) {
    return <GatewayGuardLoading eventName={EVENT_NAMES[event]} />;
  }

  // If checks failed: Do not render the form. Display locked screen notice with button to dashboard.
  if (blockedReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1026] text-on-background px-4 py-16 font-poppins relative overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center gap-6 text-center max-w-lg w-full p-8 md:p-10 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.7)] relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
              {EVENT_NAMES[event] || "Sub-Event VOITSFEST"}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
              Pendaftaran untuk sub-event ini sedang ditutup atau kuota promo telah habis
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed pt-1">
              {blockedReason}
            </p>
          </div>

          <div className="pt-2 w-full">
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-secondary hover:bg-secondary/90 text-primary-container font-bold text-sm tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(240,192,77,0.3)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function GatewayGuard(props: GatewayGuardProps) {
  return (
    <Suspense fallback={<GatewayGuardLoading eventName={EVENT_NAMES[props.event]} />}>
      <GatewayGuardContent {...props} />
    </Suspense>
  );
}

export function useGatewayGuard(event: GatewayEvent) {
  const [checking, setChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    isGatewayOpen(event).then((open) => {
      if (isMounted) {
        setIsOpen(open);
        setChecking(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [event]);

  return { checking, isOpen };
}

