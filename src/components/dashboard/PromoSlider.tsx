"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Promo } from "@/types/database";

type PromoSliderProps = {
  promos: Promo[];
};

export default function PromoSlider({ promos }: PromoSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

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

  if (promos.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant border-dashed border-white/20 border-2">
        No active promos at the moment. Check back later!
      </div>
    );
  }

  return (
    <div className="relative group/slider">
      {promos.length > 1 && (
        <>
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface-container-highest/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-secondary hover:text-primary-container transition-all opacity-0 group-hover/slider:opacity-100 shadow-lg cursor-pointer"
            aria-label="Previous promo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface-container-highest/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-secondary hover:text-primary-container transition-all opacity-0 group-hover/slider:opacity-100 shadow-lg cursor-pointer"
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
          // Alternate themes for promos
          const isFirstTheme = index % 2 === 0;
          const bgGlow = isFirstTheme ? "bg-[#ffd700]/10" : "bg-[#87CEEB]/10";
          const badgeBg = isFirstTheme ? "bg-error/20 border-error/30 text-error" : "bg-[#87CEEB]/20 border-[#87CEEB]/30 text-[#87CEEB]";
          const priceColor = isFirstTheme ? "gold-text-gradient" : "text-[#87CEEB]";
          const btnClass = isFirstTheme
            ? "bg-[#ffd700] text-primary-container shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(255,215,0,0.6)]"
            : "bg-[#87CEEB] text-primary-container shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(135,206,235,0.6)]";

          return (
            <div
              key={promo.id}
              className="glass-card rounded-xl p-6 glow-effect relative overflow-hidden min-w-full md:min-w-[calc(100%-24px)] snap-center flex-shrink-0"
            >
              <div className={`absolute -right-20 -top-20 w-64 h-64 ${bgGlow} rounded-full blur-3xl pointer-events-none`}></div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${badgeBg}`}>
                      {promo.discount_type === "bundling" ? "Bundle Offer" : "Promo"}
                    </span>
                    {promo.target_event && (
                      <span className="px-2 py-0.5 text-xs font-bold uppercase rounded border bg-primary/20 border-primary/40 text-primary">
                        Event: {promo.target_event}
                      </span>
                    )}
                    {promo.kuota_maksimal != null && (
                      <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded border bg-white/5 border-white/10 text-on-surface-variant">
                        Quota: {promo.kuota_terpakai ?? 0}/{promo.kuota_maksimal}
                      </span>
                    )}
                  </div>
                  <h4 className="font-headline-sm text-2xl font-bold text-white mb-2">{promo.title}</h4>
                  <p className="text-on-surface-variant font-body-md text-sm">{promo.description}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    {/* Assuming discount_value is the final price for simplicity, or we can just show the discount */}
                    <span className="text-on-surface-variant text-sm block">Special Deal</span>
                    <span className={`font-headline-sm text-xl font-bold ${priceColor}`}>
                      {promo.discount_type === "percent" ? `${promo.discount_value}% OFF` : `Rp ${promo.discount_value.toLocaleString()}`}
                    </span>
                  </div>
                  <Link
                    href={
                      (promo.target_event || "").toLowerCase().includes("fest")
                        ? `/festival/checkout?promoId=${promo.id}`
                        : `/colorfun/checkout?promoId=${promo.id}`
                    }
                    className={`py-3 px-6 font-label-md text-sm rounded-full transition-shadow whitespace-nowrap inline-flex items-center justify-center font-bold ${btnClass}`}
                  >
                    Grab Deal
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
