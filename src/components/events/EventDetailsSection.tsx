"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseEventDetails, formatDisplayDate, formatDisplayTime } from "@/lib/cms";

interface EventDetailsSectionProps {
  eventType: "cfr" | "festival";
  initialShowDetails: boolean;
  initialDate: string;
  initialTime: string;
  initialVenue: string;
  ctaLabel: string;
  ctaHref: string;
}

export default function EventDetailsSection({
  eventType,
  initialShowDetails,
  initialDate,
  initialTime,
  initialVenue,
  ctaLabel,
  ctaHref,
}: EventDetailsSectionProps) {
  const [showDetails, setShowDetails] = useState<boolean>(initialShowDetails);
  const [date, setDate] = useState<string>(initialDate);
  const [time, setTime] = useState<string>(initialTime);
  const [venue, setVenue] = useState<string>(initialVenue);

  // Sync state if initial props change
  useEffect(() => {
    setShowDetails(initialShowDetails);
  }, [initialShowDetails]);

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  useEffect(() => {
    setVenue(initialVenue);
  }, [initialVenue]);

  // Real-time synchronization from Supabase cms_settings
  useEffect(() => {
    const supabase = createClient();
    const detailKey = eventType === "cfr" ? "cfr_details" : "festival_details";
    const defaultTime = eventType === "cfr" ? "06:00 WIB - Selesai" : "16:00 WIB - Selesai";
    const defaultDate = eventType === "cfr" ? "Minggu, 25 Oktober 2026" : "Sabtu, 24 Oktober 2026";

    const channel = supabase
      .channel(`realtime-event-details-${eventType}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_settings" },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.key) return;

          // Event Details master toggle & metadata
          if (row.key === "event_details") {
            const active = parseEventDetails(row.value);
            setShowDetails(active);

            if (typeof row.value === "object" && row.value !== null) {
              const ev = row.value as any;
              const sub = eventType === "cfr" ? ev.cfr : ev.festival;
              if (sub) {
                if (sub.date) setDate(formatDisplayDate(sub.date, defaultDate));
                if (sub.time) setTime(formatDisplayTime(sub.time, defaultTime));
                if (sub.location) setVenue(sub.location.trim() || "ITS Campus");
              }
            }
          }

          // Sub-event specific details (cfr_details or festival_details)
          if (row.key === detailKey) {
            if (typeof row.value === "object" && row.value !== null) {
              const sub = row.value as any;
              if (sub.date) setDate(formatDisplayDate(sub.date, defaultDate));
              if (sub.time) setTime(formatDisplayTime(sub.time, defaultTime));
              if (sub.location) setVenue(sub.location.trim() || "ITS Campus");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventType]);

  if (!showDetails) {
    return null;
  }

  return (
    <div className="w-full flex flex-col items-center transition-all duration-500 ease-in-out">
      {/* Event Details Box (Tanggal, Waktu, Venue) */}
      <div className="w-full max-w-3xl mb-8 animate-in fade-in zoom-in-95 duration-500 transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tanggal Pelaksanaan */}
          <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-col items-center sm:items-start text-center sm:text-left border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl bg-surface/50 backdrop-blur-xl group">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary border border-secondary/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">
              Tanggal Pelaksanaan
            </span>
            <span className="text-sm md:text-base font-bold text-white leading-snug">
              {date}
            </span>
          </div>

          {/* Waktu Acara */}
          <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-col items-center sm:items-start text-center sm:text-left border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl bg-surface/50 backdrop-blur-xl group">
            <div className="w-10 h-10 rounded-xl bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">
              Waktu Acara
            </span>
            <span className="text-sm md:text-base font-bold text-white leading-snug">
              {time}
            </span>
          </div>

          {/* Lokasi Venue */}
          <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-col items-center sm:items-start text-center sm:text-left border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl bg-surface/50 backdrop-blur-xl group">
            <div className="w-10 h-10 rounded-xl bg-[#87CEEB]/15 text-[#87CEEB] border border-[#87CEEB]/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">
              Lokasi Venue
            </span>
            <span className="text-sm md:text-base font-bold text-white leading-snug line-clamp-2" title={venue}>
              {venue}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Registration CTA Button */}
      <div className="animate-in fade-in duration-300">
        <Link
          href={ctaHref}
          className="relative group/btn inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-full font-bold text-base sm:text-lg bg-primary-container text-on-primary shadow-[0_0_25px_rgba(240,192,77,0.5)] hover:shadow-[0_0_40px_rgba(240,192,77,0.85)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden border border-white/30"
        >
          <span className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity rounded-full"></span>
          <Sparkles className="w-5 h-5 text-on-primary animate-pulse" />
          <span className="tracking-wide">{ctaLabel}</span>
          <ArrowRight className="w-5 h-5 text-on-primary group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
