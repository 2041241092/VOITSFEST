"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const mascots = [
  { src: "/Maskot 1.png", label: "Hydration Mode", tag: "STAY CHARGED" },
  { src: "/Maskot 2.png", label: "Runner Stance", tag: "COLORFUN RUN" },
  { src: "/Maskot 3.png", label: "Cheering Vibe", tag: "MAIN FESTIVAL" },
  { src: "/Maskot 4.png", label: "Skater Style", tag: "COSMIC FLOW" }
];

export default function MascotShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-switch every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mascots.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const selectMascot = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none py-4">
      {/* Floating Mascot & Podium Assembly */}
      <div className="relative w-full flex flex-col items-center animate-float-subtle">
        {/* Soft Cyan/Purple Radial Ambient Glow */}
        <div 
          aria-hidden="true"
          className="absolute -top-10 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-tr from-cyan-500/15 via-blue-600/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none -z-10"
        />

        {/* Mascot Stage Container */}
        <div className="relative w-full h-[320px] sm:h-[390px] md:h-[420px] flex items-end justify-center z-10">
          {mascots.map((mascot, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={mascot.src}
                className={`absolute inset-0 flex items-end justify-center transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                  isActive
                    ? "opacity-100 scale-100 translate-y-0 filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
                    : "opacity-0 scale-95 translate-y-6 pointer-events-none"
                }`}
              >
                <div className="relative w-auto h-[280px] sm:h-[350px] md:h-[380px] aspect-[700/1024]">
                  <Image
                    src={mascot.src}
                    alt={mascot.label}
                    fill
                    sizes="(max-width: 768px) 280px, 380px"
                    priority={index === 0}
                    className="object-contain"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Podium Base (PLANET 6.png) firmly placed under mascot feet */}
        <div className="relative -mt-10 sm:-mt-14 md:-mt-16 w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] z-0 pointer-events-none">
          {/* Subtle platform rim glow */}
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl transform scale-90" />
          
          <img
            src="/PLANET 6.png"
            alt="Showcase Podium"
            className="w-full h-auto object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]"
          />

          {/* Under-Podium Glow (Cyan / Purple / Blue) */}
          <div className="w-3/4 h-8 mx-auto -mt-3 bg-blue-500/25 blur-2xl rounded-full" />
        </div>
      </div>

      {/* Game-Style Selector Indicators */}
      <div className="mt-4 flex items-center gap-2.5 z-20">
        {mascots.map((mascot, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={idx}
              onClick={() => selectMascot(idx)}
              title={mascot.label}
              aria-label={`Select ${mascot.label}`}
              className={`group relative h-2.5 transition-all duration-300 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                isActive
                  ? "w-8 sm:w-10 bg-gradient-to-r from-primary via-primary-container to-secondary shadow-[0_0_14px_rgba(240,192,77,0.7)]"
                  : "w-2.5 sm:w-3 bg-white/20 hover:bg-white/45"
              }`}
            >
              <span className="sr-only">{mascot.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
