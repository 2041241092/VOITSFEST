"use client";

import React, { useState } from "react";

export default function FlipCard({
  front,
  back,
  className = "",
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`flip-card group h-[300px] w-full cursor-pointer [perspective:1000px] select-none ${
        flipped ? "flipped" : ""
      } ${className}`}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={`flip-card-inner relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="flip-card-front absolute inset-0 w-full h-full rounded-2xl overflow-hidden [backface-visibility:hidden] bg-gradient-to-br from-secondary-container/60 to-surface-container-lowest/90 border border-primary-container/30 shadow-lg shadow-primary/5 flex flex-col items-center justify-center p-4">
          {front}
        </div>
        <div className="flip-card-back absolute inset-0 w-full h-full rounded-2xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-primary-container/80 shadow-[0_0_25px_rgba(240,192,77,0.4)] bg-surface-container">
          {back}
        </div>
      </div>
    </div>
  );
}
