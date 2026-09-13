"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Users, 
  Calendar,
  AlertCircle,
  Flame,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Promo } from "@/types/database";
import { 
  formatDisplayWIB, 
  formatDateRangeWIB, 
  getEventTimeStatus, 
  parseWibDate, 
  isEventActive,
  isEventStarted,
  isEventEnded
} from "@/lib/timeUtils";
import { 
  fetchPricingTiers, 
  PricingEvent, 
  PricingTiersConfig, 
  DEFAULT_PRICING_TIERS 
} from "@/lib/pricing";
import { 
  fetchGateways, 
  GatewaysConfig, 
  DEFAULT_GATEWAYS, 
  GatewayEvent 
} from "@/lib/gateways";
import { fetchAllSubEventQuotas, SubEventQuotaMap } from "@/lib/quota";
import { createClient } from "@/lib/supabase/client";

type PromoSliderProps = {
  promos: Promo[];
};

function getTargetPricingEvent(targetEventStr?: string | null): PricingEvent | null {
  if (!targetEventStr) return null;
  const s = targetEventStr.toLowerCase().trim();
  if (s.includes("color") || s.includes("cfr") || s.includes("run")) return "colorfun";
  if (s.includes("fest")) return "festival";
  if (s.includes("seminar")) return "seminar";
  if (s.includes("bcc")) return "bcc";
  if (s.includes("bpc")) return "bpc";
  if (s.includes("tenant")) return "tenant";
  return null;
}

const PRICING_TO_GATEWAY: Record<PricingEvent, GatewayEvent> = {
  colorfun: "cfr",
  festival: "festival",
  seminar: "seminar",
  bcc: "bcc",
  bpc: "bpc",
  tenant: "tenant",
};

export default function PromoSlider({ promos: initialPromos }: PromoSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [promos, setPromos] = useState<Promo[]>(initialPromos);
  const [pricingTiers, setPricingTiers] = useState<PricingTiersConfig>(DEFAULT_PRICING_TIERS);
  const [subEventQuotas, setSubEventQuotas] = useState<SubEventQuotaMap | null>(null);
  const [gateways, setGateways] = useState<GatewaysConfig>(DEFAULT_GATEWAYS);
  const [now, setNow] = useState<number>(Date.now());

  // Sync with prop changes
  useEffect(() => {
    setPromos(initialPromos);
  }, [initialPromos]);

  // Live timer tick every 1 second for real-time countdown calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time synchronization with Supabase & Admin Central updates
  const fetchLatestPromos = useCallback(async () => {
    try {
      const supabase = createClient();
      const [promosRes, cfrRes, festRes, tiers, allQuotas, gw] = await Promise.all([
        supabase
          .from("promos")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("colorfun_registrations").select("promo_id, payment_status"),
        supabase.from("festival_registrations").select("promo_id, payment_status"),
        fetchPricingTiers(),
        fetchAllSubEventQuotas(),
        fetchGateways(),
      ]);

      if (tiers) setPricingTiers(tiers);
      if (allQuotas) setSubEventQuotas(allQuotas);
      if (gw) setGateways(gw);

      const promoRegCount = new Map<string, number>();
      const allRegs = [...(cfrRes.data || []), ...(festRes.data || [])];
      for (const reg of allRegs) {
        if (!reg.promo_id) continue;
        const status = (reg.payment_status || "pending").toLowerCase();
        if (status === "approved" || status === "verified" || status === "pending") {
          promoRegCount.set(reg.promo_id, (promoRegCount.get(reg.promo_id) || 0) + 1);
        }
      }

      if (promosRes.data) {
        const enriched = (promosRes.data as Promo[]).map((p) => {
          const liveCount = promoRegCount.get(p.id) || 0;
          return {
            ...p,
            kuota_terpakai: Math.max(p.kuota_terpakai ?? 0, liveCount),
          };
        });
        setPromos(enriched);
      }
    } catch (err) {
      console.warn("Notice updating live promos in PromoSlider:", err);
    }
  }, []);

  useEffect(() => {
    fetchLatestPromos();

    const supabase = createClient();
    const handleRefresh = () => {
      fetchLatestPromos();
    };

    window.addEventListener("promo-quota-updated", handleRefresh);
    window.addEventListener("admin-refresh-data", handleRefresh);

    const channel = supabase
      .channel("promo-slider-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        handleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_settings" },
        handleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colorfun_registrations" },
        handleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_registrations" },
        handleRefresh
      )
      .subscribe();

    return () => {
      window.removeEventListener("promo-quota-updated", handleRefresh);
      window.removeEventListener("admin-refresh-data", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [fetchLatestPromos]);

  const scrollLeft = () => {
    if (sliderRef.current) {
      const scrollAmount = sliderRef.current.clientWidth || 350;
      sliderRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      const scrollAmount = sliderRef.current.clientWidth || 350;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Helper to calculate live countdown string
  const getCountdownString = (endDateStr?: string | null) => {
    if (!endDateStr) return null;
    const endObj = parseWibDate(endDateStr);
    if (!endObj) return null;
    const diff = endObj.getTime() - now;
    if (diff <= 0) return "Periode Berakhir";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (days > 0) {
      return `${days}h ${hours}j ${minutes}m`;
    }
    return `${String(hours).padStart(2, "0")}j ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}d`;
  };

  if (promos.length === 0) {
    return (
      <div className="bg-slate-950/60 backdrop-blur-xl rounded-2xl p-8 text-center text-slate-300 border-dashed border-white/15 border-2 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        Belum ada promo atau paket bundling aktif saat ini. Kunjungi kembali secara berkala!
      </div>
    );
  }

  return (
    <div className="relative group/slider">
      {promos.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface-container-highest/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-secondary hover:text-primary-container transition-all md:opacity-0 md:group-hover/slider:opacity-100 shadow-lg cursor-pointer"
            aria-label="Previous promo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface-container-highest/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-secondary hover:text-primary-container transition-all md:opacity-0 md:group-hover/slider:opacity-100 shadow-lg cursor-pointer"
            aria-label="Next promo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <div
        ref={sliderRef}
        className="slider-track flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {promos.map((promo, index) => {
          const { isActive, isStarted, isEnded } = getEventTimeStatus(promo.start_date, promo.end_date);
          const isQuotaSoldOut = promo.kuota_maksimal != null && (promo.kuota_terpakai ?? 0) >= promo.kuota_maksimal;
          const isBundling = promo.discount_type === "bundling";
          const countdown = getCountdownString(promo.end_date);

          // Target sub-event status guard from cms_settings.pricing_tiers and gateways
          const targetKey = getTargetPricingEvent(promo.target_event);
          let isSubEventBlocked = false;
          let subEventBlockText = "";

          if (targetKey) {
            // Check gateway toggle (from cms_settings gateways)
            const gwKey = PRICING_TO_GATEWAY[targetKey];
            if (gateways && (gateways[gwKey] === false || (targetKey === "colorfun" && (gateways as any).colorfun === false))) {
              isSubEventBlocked = true;
              subEventBlockText = "Pendaftaran Ditutup";
            }

            // Check sub-event pricing_tiers dates
            const tier = pricingTiers?.[targetKey];
            if (tier) {
              const tierTime = getEventTimeStatus(tier.start_date, tier.end_date);
              if (!tierTime.isStarted || tierTime.isEnded) {
                isSubEventBlocked = true;
                subEventBlockText = "Pendaftaran Ditutup";
              }
            }

            // Check sub-event quota: bundling/promo cards respect overall venue capacity (isEventFull),
            // and are not blocked when only phase_quota is full
            const quota = subEventQuotas?.[targetKey];
            if (quota && quota.isEventFull) {
              isSubEventBlocked = true;
              subEventBlockText = "Event Penuh";
            }
          }

          // Status Badge Evaluation
          let statusBadgeText = "Promo Aktif";
          let statusBadgeClass = "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
          let isUsable = true;

          if (!promo.is_active) {
            statusBadgeText = "Nonaktif";
            statusBadgeClass = "bg-slate-500/20 border-slate-500/30 text-slate-400";
            isUsable = false;
          } else if (isEnded) {
            statusBadgeText = "Periode Berakhir";
            statusBadgeClass = "bg-rose-500/20 border-rose-500/30 text-rose-400";
            isUsable = false;
          } else if (!isStarted) {
            statusBadgeText = "Segera Hadir";
            statusBadgeClass = "bg-amber-500/20 border-amber-500/30 text-amber-300";
            isUsable = false;
          } else if (isQuotaSoldOut) {
            statusBadgeText = "Sold Out";
            statusBadgeClass = "bg-rose-500/20 border-rose-500/30 text-rose-400";
            isUsable = false;
          }

          // Alternating aesthetic accents
          const isFirstTheme = index % 2 === 0;
          const bgGlow = isFirstTheme ? "bg-[#ffd700]/10" : "bg-[#87CEEB]/10";
          const accentColor = isFirstTheme ? "text-[#ffd700]" : "text-[#87CEEB]";
          const btnClass = isFirstTheme
            ? "bg-[#ffd700] hover:bg-[#ffd700]/90 text-primary-container shadow-[0_4px_12px_rgba(255,215,0,0.3)]"
            : "bg-[#87CEEB] hover:bg-[#87CEEB]/90 text-primary-container shadow-[0_4px_12px_rgba(135,206,235,0.3)]";

          // Target Checkout URL
          const targetUrl = (promo.target_event || "").toLowerCase().includes("fest")
            ? `/festival/checkout?promoId=${promo.id}`
            : (promo.target_event || "").toLowerCase().includes("color") || (promo.target_event || "").toLowerCase().includes("cfr")
            ? `/colorfun/checkout?promoId=${promo.id}`
            : `/festival/checkout?promoId=${promo.id}`;

          return (
            <div
              key={promo.id}
              className={`bg-slate-950/60 backdrop-blur-xl border ${
                isUsable && !isSubEventBlocked ? "border-white/10" : "border-white/5 opacity-75"
              } rounded-2xl p-6 relative overflow-hidden min-w-full md:min-w-[calc(100%-24px)] snap-center flex-shrink-0 shadow-[0_4px_25px_rgba(0,0,0,0.5)] transition-all`}
            >
              <div className={`absolute -right-20 -top-20 w-64 h-64 ${bgGlow} rounded-full blur-3xl pointer-events-none`}></div>
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                
                {/* Left Area: Tags, Title, Dates, Details */}
                <div className="flex-1 space-y-3">
                  
                  {/* Badge Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Flag */}
                    <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full border flex items-center gap-1 ${
                      isSubEventBlocked 
                        ? "bg-rose-500/20 border-rose-500/30 text-rose-400" 
                        : statusBadgeClass
                    }`}>
                      {isUsable && !isSubEventBlocked ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {isSubEventBlocked ? subEventBlockText : statusBadgeText}
                    </span>

                    {/* Offer Type */}
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full border bg-secondary/15 border-secondary/30 text-secondary">
                      {isBundling ? "Paket Bundling" : "Promo Spesial"}
                    </span>

                    {/* Bundle Capacity */}
                    {isBundling && promo.kapasitas && promo.kapasitas > 1 && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-cyan-500/15 border-cyan-500/30 text-cyan-300 flex items-center gap-1 font-mono">
                        <Users className="w-3 h-3" />
                        Paket {promo.kapasitas} Tiket
                      </span>
                    )}

                    {/* Target Event */}
                    {promo.target_event && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-white/5 border-white/10 text-on-surface-variant font-mono">
                        Sub-Event: {promo.target_event}
                      </span>
                    )}

                    {/* Live Quota Indicator */}
                    {promo.kuota_maksimal != null ? (
                      <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full border bg-white/5 border-white/10 text-on-surface-variant">
                        {promo.kuota_terpakai ?? 0} / {promo.kuota_maksimal} Slot Kuota Terpakai
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full border bg-cyan-500/10 border-cyan-500/25 text-cyan-300">
                        {promo.kuota_terpakai ?? 0} / ∞ Kuota Terpakai (Unlimited / Tanpa Batas)
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="font-headline-sm text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{promo.title}</span>
                      {isFirstTheme && <Flame className="w-5 h-5 text-[#ffd700] fill-[#ffd700]" />}
                    </h4>
                    <p className="text-on-surface-variant font-body-md text-sm mt-1 max-w-2xl leading-relaxed">
                      {promo.description || "Gunakan penawaran spesial ini untuk mendapatkan harga pendaftaran terbaik di VOITSFEST."}
                    </p>
                  </div>

                  {/* Active Live Countdown Timer */}
                  {isUsable && !isSubEventBlocked && countdown && (
                    <div className="pt-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-semibold">
                        <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                        <span>Sisa Waktu: {countdown}</span>
                      </div>
                    </div>
                  )}

                  {/* Validity Dates formatted strictly in WIB without double +7h offset */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Periode: {formatDateRangeWIB(promo.start_date, promo.end_date)}
                    </span>
                  </div>

                </div>

                {/* Right Area: Pricing & CTA Action */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  <div className="lg:text-right">
                    <span className="text-on-surface-variant text-xs uppercase tracking-wider block font-semibold">
                      {isBundling ? "Harga Paket Bundling" : "Nilai Diskon"}
                    </span>
                    <span className={`font-headline-sm text-2xl lg:text-3xl font-black font-mono ${accentColor}`}>
                      {promo.discount_type === "percent"
                        ? `${promo.discount_value}% OFF`
                        : `Rp ${promo.discount_value.toLocaleString("id-ID")}`}
                    </span>
                    {isBundling && promo.kapasitas && promo.kapasitas > 1 && (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        (untuk {promo.kapasitas} peserta sekaligus)
                      </span>
                    )}
                  </div>

                  {isUsable && !isSubEventBlocked ? (
                    <Link
                      href={targetUrl}
                      className={`py-3 px-7 rounded-full font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer ${btnClass}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Klaim Promo</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="py-3 px-7 rounded-full font-bold text-xs uppercase tracking-wider bg-white/5 border border-white/10 text-slate-400 pointer-events-none opacity-50 cursor-not-allowed whitespace-nowrap inline-flex items-center justify-center gap-2"
                    >
                      <span>{isSubEventBlocked ? subEventBlockText : statusBadgeText}</span>
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
