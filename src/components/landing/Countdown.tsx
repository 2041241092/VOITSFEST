"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Countdown() {
  const [active, setActive] = useState(true);
  const [targetDate, setTargetDate] = useState<string>("2026-10-24T09:00:00");
  const [description, setDescription] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadCountdownSettings() {
      try {
        const { data } = await supabase
          .from("cms_settings")
          .select("*")
          .in("key", ["countdown", "countdown_target"]);

        if (data) {
          const cd = data.find((d) => d.key === "countdown");
          if (cd && cd.value) {
            if (typeof cd.value === "object") {
              if (cd.value.active !== undefined) setActive(Boolean(cd.value.active));
              if (cd.value.description) setDescription(cd.value.description);
              if (cd.value.date) setTargetDate(cd.value.date);
            } else {
              setActive(Boolean(cd.value));
            }
          }

          const target = data.find((d) => d.key === "countdown_target");
          if (target && target.value) {
            const raw = typeof target.value === "string" ? target.value : JSON.stringify(target.value).replace(/"/g, "");
            if (raw) setTargetDate(raw);
          }
        }
      } catch (err) {
        console.error("Error fetching countdown settings:", err);
      }
    }

    loadCountdownSettings();
  }, [supabase]);

  useEffect(() => {
    if (!active || !targetDate) return;

    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [active, targetDate]);

  if (!active) return null;

  return (
    <div className="flex flex-col items-center justify-center mb-stack-lg font-poppins">
      <div className="flex space-x-3 sm:space-x-gutter">
        <div className="glass-card p-3 sm:p-4 rounded-xl flex flex-col items-center min-w-[70px] sm:min-w-[90px] border border-white/10 shadow-lg">
          <span className="font-headline-lg text-2xl sm:text-4xl text-primary-container font-bold">
            {timeLeft.days}
          </span>
          <span className="font-label-sm text-[10px] sm:text-xs text-tertiary uppercase font-medium">Days</span>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl flex flex-col items-center min-w-[70px] sm:min-w-[90px] border border-white/10 shadow-lg">
          <span className="font-headline-lg text-2xl sm:text-4xl text-primary-container font-bold">
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="font-label-sm text-[10px] sm:text-xs text-tertiary uppercase font-medium">Hours</span>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl flex flex-col items-center min-w-[70px] sm:min-w-[90px] border border-white/10 shadow-lg">
          <span className="font-headline-lg text-2xl sm:text-4xl text-primary-container font-bold">
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="font-label-sm text-[10px] sm:text-xs text-tertiary uppercase font-medium">Mins</span>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl flex flex-col items-center min-w-[70px] sm:min-w-[90px] border border-white/10 shadow-lg">
          <span className="font-headline-lg text-2xl sm:text-4xl text-primary-container font-bold text-secondary">
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
          <span className="font-label-sm text-[10px] sm:text-xs text-tertiary uppercase font-medium">Secs</span>
        </div>
      </div>
    </div>
  );
}
