"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Countdown from "./Countdown";
import CustomHeading from "@/components/ui/CustomHeading";
import EnterGalaxyButton from "./EnterGalaxyButton";
import MascotShowcase from "./MascotShowcase";

export default function Hero() {
  const [countdownLabel, setCountdownLabel] = useState<string>("The Next Milestone");

  useEffect(() => {
    const supabase = createClient();
    async function loadCountdownLabel() {
      try {
        const { data, error } = await supabase
          .from("cms_settings")
          .select("value")
          .eq("key", "countdown_label")
          .single();

        if (data && !error && data.value) {
          const raw = typeof data.value === "string" ? data.value : String(data.value);
          if (raw.trim()) {
            setCountdownLabel(raw.trim());
          }
        }
      } catch (err) {
        console.error("Error loading countdown_label:", err);
      }
    }
    loadCountdownLabel();
  }, []);

  return (
    <>
      {/* Hero Section: 2-Column Responsive Grid with Curated Cosmic Accents */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 lg:py-16 overflow-hidden">
        {/* Curated Atmospheric Accents (Depth of Field & Safe Inset Positioning) */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden -z-10">
          {/* Safe Inset Planet: Upper Left Area */}
          <img
            src="/1.png"
            alt=""
            aria-hidden="true"
            className="absolute top-[10%] left-[6%] lg:left-[8%] w-40 sm:w-52 lg:w-60 h-auto opacity-50 animate-float-slow hidden md:block"
          />

          {/* Golden Radiant Stardust Halo: Upper Right Area behind Mascot */}
          <img
            src="/36.png"
            alt=""
            aria-hidden="true"
            className="absolute top-[14%] right-[6%] lg:right-[10%] w-52 sm:w-64 lg:w-80 h-auto opacity-45 animate-float-subtle hidden sm:block"
            style={{ animationDelay: "1.5s" }}
          />

          {/* Textured Asteroid Rock: Safe Lower Left in Negative Space */}
          <img
            src="/47.png"
            alt=""
            aria-hidden="true"
            className="absolute bottom-[12%] left-[10%] lg:left-[14%] w-20 sm:w-28 lg:w-32 h-auto opacity-55 animate-drift-subtle hidden lg:block"
            style={{ animationDelay: "3s" }}
          />

          {/* Subtle Stardust Cluster: Floating in Central Negative Space */}
          <img
            src="/55.png"
            alt=""
            aria-hidden="true"
            className="absolute top-[22%] left-[50%] -translate-x-1/2 w-24 sm:w-32 lg:w-36 h-auto opacity-45 animate-float-reverse hidden md:block"
            style={{ animationDelay: "2s" }}
          />
        </div>

        {/* 2-Column Responsive Grid: max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[85vh] */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[85vh]">
          {/* Left Column (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left z-10 space-y-4 sm:space-y-5">
            {/* Main Title */}
            <CustomHeading 
              as="h1" 
              text="VOITSFEST" 
              className="font-headline-lg text-5xl sm:text-7xl lg:text-8xl xl:text-9xl uppercase font-bold tracking-tighter text-primary-container drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] [text-shadow:0_4px_16px_rgba(0,0,0,0.95),0_0_25px_rgba(240,192,77,0.5)] leading-none" 
            />

            {/* Subtitle / Tagline */}
            <p className="font-headline-md text-2xl sm:text-3xl lg:text-4xl uppercase font-bold tracking-wider text-primary-container drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:0_3px_12px_rgba(0,0,0,0.9),0_0_20px_rgba(240,192,77,0.4)]">
              Shine Loud, Glow Together
            </p>
            
            {/* Milestone Label */}
            <div className="pt-2 w-full flex flex-col items-center lg:items-start">
              <p className="font-headline-md text-sm sm:text-base text-secondary font-medium tracking-wide uppercase mb-3 drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] [text-shadow:0_2px_8px_rgba(0,0,0,0.9),0_0_16px_rgba(176,198,255,0.4)]">
                {countdownLabel || "The Next Milestone"}
              </p>
              
              {/* Event Countdown Timer */}
              <Countdown className="mb-4" />
            </div>

            {/* Primary CTA Button */}
            <div className="pt-2">
              <EnterGalaxyButton />
            </div>
          </div>

          {/* Right Column (lg:col-span-5): Mascot Character Showcase */}
          <div className="lg:col-span-5 w-full flex flex-col items-center justify-center relative">
            <MascotShowcase />
          </div>
        </div>
      </section>
    </>
  );
}
