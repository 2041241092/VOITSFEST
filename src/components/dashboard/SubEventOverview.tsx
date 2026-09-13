"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Calendar, 
  Sparkles, 
  Tag, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  RotateCw,
  ExternalLink,
  Flame,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { 
  PricingEvent, 
  PricingTiersConfig, 
  DEFAULT_PRICING_TIERS, 
  fetchPricingTiers, 
  formatRupiah,
  PRICING_EVENT_NAMES 
} from "@/lib/pricing";
import { 
  fetchAllSubEventQuotas, 
  SubEventQuotaMap, 
  createFallbackQuota,
  listenToQuotaRefresh
} from "@/lib/quota";
import { 
  formatDateRangeWIB, 
  getEventTimeStatus,
  formatDisplayWIB
} from "@/lib/timeUtils";
import { createClient } from "@/lib/supabase/client";

interface SubEventOverviewProps {
  initialPricing?: PricingTiersConfig;
  initialQuotas?: SubEventQuotaMap;
}

interface EventMetaItem {
  key: PricingEvent;
  title: string;
  category: string;
  eventDateWib: string;
  image: string;
  url: string;
  badgeAccent: string;
  description: string;
}

const SUB_EVENTS_CATALOG: EventMetaItem[] = [
  {
    key: "festival",
    title: "VOITSFEST Main Festival",
    category: "Music & Art Festival",
    eventDateWib: "Sabtu, 24 Oktober 2026, 15:00 WIB",
    image: "/Bintang-Bintang Presisi.png",
    url: "/festival/checkout",
    badgeAccent: "bg-secondary/15 text-secondary border-secondary/30",
    description: "Festival musik spektakuler dengan penampilan artis nasional ternama, pertunjukan seni visual kosmik, dan bazaar kreatif.",
  },
  {
    key: "colorfun",
    title: "ColorFun Run 5K",
    category: "Fun Run & Sports",
    eventDateWib: "Minggu, 25 Oktober 2026, 06:00 WIB",
    image: "/Bintang-Bintang Presisi.png",
    url: "/colorfun/checkout",
    badgeAccent: "bg-[#87CEEB]/15 text-[#87CEEB] border-[#87CEEB]/30",
    description: "Lari santai 5K penuh warna warni holi powder dengan jersey eksklusif, medali finisher, dan water station pesta musik.",
  },
  {
    key: "seminar",
    title: "Cosmic Seminar Kewirausahaan",
    category: "Seminar & Talkshow",
    eventDateWib: "Sabtu, 17 Oktober 2026, 09:00 WIB",
    image: "/Bintang-Bintang Presisi.png",
    url: "/seminar/register",
    badgeAccent: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    description: "Seminar bisnis dan inovasi teknologi menghadirkan para founder startup sukses dan pakar industri nasional.",
  },
  {
    key: "bcc",
    title: "Business Case Competition (BCC)",
    category: "National Competition",
    eventDateWib: "September - Oktober 2026",
    image: "/Bintang-Bintang Presisi.png",
    url: "/competition/bcc/register",
    badgeAccent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description: "Kompetisi pemecahan studi kasus bisnis riil beregu untuk mengasah kemampuan analitis dan strategi bisnis mahasiswa.",
  },
  {
    key: "bpc",
    title: "Business Plan Competition (BPC)",
    category: "National Competition",
    eventDateWib: "September - Oktober 2026",
    image: "/Bintang-Bintang Presisi.png",
    url: "/competition/bpc/register",
    badgeAccent: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description: "Ajang adu gagasan inovasi rencana bisnis baru yang berkelanjutan, kreatif, dan berdampak nyata bagi masyarakat.",
  },
  {
    key: "tenant",
    title: "Tenant & Expo Bazaar",
    category: "F&B & Creative Expo",
    eventDateWib: "24 - 25 Oktober 2026",
    image: "/Bintang-Bintang Presisi.png",
    url: "/tenant/register",
    badgeAccent: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    description: "Pendaftaran booth tenant kuliner, merchandise, dan brand kreatif di arena festival utama VOITSFEST 2026.",
  },
];

export default function SubEventOverview({
  initialPricing,
  initialQuotas,
}: SubEventOverviewProps) {
  const [pricing, setPricing] = useState<PricingTiersConfig>(
    initialPricing || DEFAULT_PRICING_TIERS
  );
  const [quotas, setQuotas] = useState<SubEventQuotaMap | null>(initialQuotas || null);
  const [loading, setLoading] = useState(!initialQuotas);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      const [tiers, liveQuotas] = await Promise.all([
        fetchPricingTiers(supabase),
        fetchAllSubEventQuotas(),
      ]);
      setPricing(tiers);
      setQuotas(liveQuotas);
    } catch (err) {
      console.warn("Notice updating live pricing & quotas:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // 1. In-app and cross-window events from Admin Central
    const unsubscribe = listenToQuotaRefresh(() => {
      loadData();
    });

    // 2. Realtime subscription to database changes in cms_settings and registrations
    const channel = supabase
      .channel("subevent-overview-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_settings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "festival_registrations" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "colorfun_registrations" }, () => loadData())
      .subscribe();

    return () => {
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>Katalog &amp; Fase Pendaftaran Sub-Event</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Live Admin Sync
            </span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Fase pendaftaran, harga tiket aktif, dan kuota slot yang dikonfigurasi langsung dari Admin Central.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer w-fit"
          title="Segarkan data kuota dan fase"
        >
          <RotateCw className={`w-3.5 h-3.5 text-secondary ${loading ? "animate-spin" : ""}`} />
          <span>Update Status</span>
        </button>
      </div>

      {/* Grid of Sub-Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SUB_EVENTS_CATALOG.map((item) => {
          const tier = pricing[item.key] || DEFAULT_PRICING_TIERS[item.key];
          const quotaStatus = quotas?.[item.key];

          const { isActive: isDateActive, isStarted, isEnded } = getEventTimeStatus(
            tier.start_date,
            tier.end_date
          );

          // Status & Availability Determination
          const isPhaseFull = quotaStatus ? quotaStatus.isPhaseFull : false;
          const isEventFull = quotaStatus ? quotaStatus.isEventFull : false;
          const remainingPhaseQuota = quotaStatus ? quotaStatus.remainingPhaseQuota : tier.phase_quota;

          let statusBadgeText = "Fase Aktif";
          let statusBadgeClass = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
          let canRegister = true;

          if (isPhaseFull || isEventFull || (remainingPhaseQuota !== null && remainingPhaseQuota <= 0)) {
            statusBadgeText = "Sold Out";
            statusBadgeClass = "bg-rose-500/20 border-rose-500/30 text-rose-400";
            canRegister = false;
          } else if (isEnded) {
            statusBadgeText = "Periode Berakhir";
            statusBadgeClass = "bg-rose-500/15 border-rose-500/25 text-rose-400";
            canRegister = false;
          } else if (!isStarted) {
            statusBadgeText = "Segera Hadir";
            statusBadgeClass = "bg-amber-500/15 border-amber-500/25 text-amber-300";
            canRegister = false;
          } else if (remainingPhaseQuota !== null && remainingPhaseQuota <= 20) {
            statusBadgeText = `Kuota Terbatas (${remainingPhaseQuota} slot)`;
            statusBadgeClass = "bg-amber-500/20 border-amber-500/30 text-amber-300";
            canRegister = true;
          }

          return (
            <div
              key={item.key}
              className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_4px_25px_rgba(0,0,0,0.5)] group hover:border-secondary/40 transition-all"
            >
              {/* Card Header Image */}
              <div className="h-40 w-full relative overflow-hidden bg-surface-dim">
                <Image
                  src={item.image}
                  fill
                  alt={item.title}
                  className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
                
                {/* Category Pill */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white font-bold text-[10px] uppercase tracking-wider rounded-full border border-white/15">
                  {item.category}
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${statusBadgeClass}`}>
                    {statusBadgeText === "Fase Aktif" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    )}
                    {statusBadgeText}
                  </span>
                </div>

                {/* Bottom of Image: Live Phase & Price Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-secondary text-primary-container font-mono shadow">
                    <Tag className="w-3 h-3" />
                    {tier.phase}
                  </span>
                  <span className="font-mono text-lg font-black text-[#ffd700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {formatRupiah(tier.price)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <h4 className="text-lg font-bold text-white tracking-tight group-hover:text-secondary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Schedule & Phase Validity Information */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-slate-300 font-mono">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span>Pelaksanaan: {item.eventDateWib}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span className="truncate">
                        Jadwal Fase: {formatDateRangeWIB(tier.start_date, tier.end_date)}
                      </span>
                    </div>

                    {/* Quota Slot Indicator */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400">Kuota Fase:</span>
                      <strong className="text-white">
                        {tier.phase_quota != null
                          ? `${remainingPhaseQuota ?? tier.phase_quota} / ${tier.phase_quota} slot`
                          : "Unlimited"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card CTA Action */}
                <div className="pt-2">
                  {canRegister ? (
                    <Link
                      href={item.url}
                      className="w-full text-center py-2.5 bg-secondary/15 hover:bg-secondary text-secondary hover:text-primary-container border border-secondary/30 rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group-hover:shadow-[0_0_15px_rgba(240,192,77,0.2)]"
                    >
                      <span>Daftar / Beli Tiket</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full text-center py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed opacity-60"
                    >
                      {statusBadgeText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
