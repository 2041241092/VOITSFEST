'use client';

import Image from 'next/image';

/**
 * AmbientComets — persistent ambient background layer.
 *
 * Two visual groups rendered over the base background:
 *
 *  • Komet 2 (4 instances): Slow diagonal-gliding comets moving top-right → bottom-left
 *    along a ≈30° slope (tan 30° ≈ 0.58, ΔX:ΔY ≈ 1.73:1). Zero CSS rotation —
 *    the asset is rendered in its native unrotated orientation.
 *
 *  • Komet 1 (15 instances): Twinkling celestial stars scattered across the entire
 *    viewport grid — hero area, mid-screen, bottom corners, and ambient clusters.
 *
 * All keyframes + utility classes live in globals.css.
 * Negative animation-delays guarantee motion is active on mount / route transitions.
 */
export default function AmbientComets() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none select-none overflow-hidden transform-gpu">

      {/* ═══════════════════════════════════════════════════════════════
          Komet 2 — Slow Diagonal Falling Comets (30° trajectory, no rotation)
          ═══════════════════════════════════════════════════════════════ */}

      <div className="absolute top-[2%] right-[10%] w-28 md:w-40 comet-glide-1 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 2.png" alt="" width={160} height={160} className="w-full h-auto object-contain" priority />
      </div>

      <div className="absolute top-[20%] right-[-5%] w-20 md:w-32 comet-glide-2 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 2.png" alt="" width={128} height={128} className="w-full h-auto object-contain" priority />
      </div>

      <div className="absolute top-[40%] right-[15%] w-24 md:w-36 comet-glide-3 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 2.png" alt="" width={144} height={144} className="w-full h-auto object-contain" priority />
      </div>

      <div className="absolute top-[12%] right-[35%] w-16 md:w-28 comet-glide-4 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 2.png" alt="" width={112} height={112} className="w-full h-auto object-contain" priority />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Komet 1 — Twinkling Celestial Stars (15 instances)
          ═══════════════════════════════════════════════════════════════ */}

      {/* ── Region A: Top-left header & hero area (3 stars) ── */}
      <div className="absolute top-[4%] left-[8%] w-5 md:w-8 star-twinkle-1 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={32} height={32} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[10%] left-[28%] w-4 md:w-6 star-twinkle-8 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={24} height={24} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[6%] left-[52%] w-6 md:w-9 star-twinkle-13 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={36} height={36} className="w-full h-auto object-contain" />
      </div>

      {/* ── Region B: Mid-screen between title and mascot showcase (4 stars) ── */}
      <div className="absolute top-[30%] left-[12%] w-5 md:w-9 star-twinkle-2 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={36} height={36} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[38%] left-[42%] w-4 md:w-7 star-twinkle-5 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={28} height={28} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[25%] left-[75%] w-5 md:w-8 star-twinkle-9 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={32} height={32} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[44%] left-[60%] w-3 md:w-5 star-twinkle-14 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={20} height={20} className="w-full h-auto object-contain" />
      </div>

      {/* ── Region C: Bottom corners & lower viewport (4 stars) ── */}
      <div className="absolute top-[72%] left-[5%] w-6 md:w-10 star-twinkle-3 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={40} height={40} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[80%] left-[48%] w-4 md:w-7 star-twinkle-6 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={28} height={28} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[88%] left-[82%] w-5 md:w-8 star-twinkle-10 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={32} height={32} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[65%] left-[22%] w-3 md:w-6 star-twinkle-15 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={24} height={24} className="w-full h-auto object-contain" />
      </div>

      {/* ── Region D: Ambient clusters — right & center (4 stars) ── */}
      <div className="absolute top-[18%] left-[90%] w-4 md:w-6 star-twinkle-4 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={24} height={24} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[55%] left-[35%] w-5 md:w-8 star-twinkle-7 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={32} height={32} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[50%] left-[85%] w-6 md:w-9 star-twinkle-11 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={36} height={36} className="w-full h-auto object-contain" />
      </div>
      <div className="absolute top-[60%] left-[68%] w-4 md:w-7 star-twinkle-12 transform-gpu will-change-[transform,opacity]">
        <Image src="/Komet 1.png" alt="" width={28} height={28} className="w-full h-auto object-contain" />
      </div>
    </div>
  );
}
