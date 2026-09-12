"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import CustomHeading from "@/components/ui/CustomHeading";
import { Sponsor } from "@/types/database";
import { Handshake } from "lucide-react";

interface SponsorsListProps {
  initialSponsors?: Sponsor[];
  initialMediaPartners?: Sponsor[];
}

function SponsorCard({ item, isSponsor }: { item: Sponsor; isSponsor: boolean }) {
  const hasLink = Boolean(item.website_url && item.website_url.trim());

  return (
    <div
      className={`bg-neutral-900/50 border border-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-300 shrink-0 group ${
        isSponsor
          ? "rounded-2xl h-28 w-56 sm:h-32 sm:w-64 md:h-32 md:w-64 p-5 hover:border-primary/50 hover:bg-neutral-900/70 hover:shadow-[0_0_25px_rgba(176,198,255,0.15)] hover:scale-105"
          : "rounded-xl h-20 w-40 sm:h-22 sm:w-44 md:h-24 md:w-48 p-3.5 hover:border-tertiary/50 hover:bg-neutral-900/70 hover:shadow-[0_0_20px_rgba(208,188,255,0.15)] hover:scale-105"
      }`}
      title={hasLink ? `${item.name} — ${item.website_url}` : item.name}
    >
      {hasLink ? (
        <a
          href={item.website_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full flex items-center justify-center cursor-pointer"
        >
          <img
            src={item.logo_url}
            alt={item.name}
            className={`${
              isSponsor ? "max-h-20 sm:max-h-24 max-w-[85%]" : "max-h-12 sm:max-h-14 max-w-[80%]"
            } object-contain drop-shadow transition-transform duration-300 group-hover:scale-105`}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent && !parent.querySelector(".fallback-text")) {
                const span = document.createElement("span");
                span.className = `fallback-text ${
                  isSponsor ? "text-sm" : "text-xs"
                } font-semibold text-white/90 text-center truncate px-2`;
                span.innerText = item.name;
                parent.appendChild(span);
              }
            }}
          />
        </a>
      ) : (
        <div className="w-full h-full flex items-center justify-center cursor-default">
          <img
            src={item.logo_url}
            alt={item.name}
            className={`${
              isSponsor ? "max-h-20 sm:max-h-24 max-w-[85%]" : "max-h-12 sm:max-h-14 max-w-[80%]"
            } object-contain drop-shadow transition-transform duration-300 group-hover:scale-105`}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent && !parent.querySelector(".fallback-text")) {
                const span = document.createElement("span");
                span.className = `fallback-text ${
                  isSponsor ? "text-sm" : "text-xs"
                } font-semibold text-white/90 text-center truncate px-2`;
                span.innerText = item.name;
                parent.appendChild(span);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

// Helper to ensure enough items for seamless marquee loop without empty gaps on ultrawide screens
function getMarqueeList(items: Sponsor[]): Sponsor[] {
  if (items.length === 0) return [];
  let repeated = [...items];
  while (repeated.length < 8) {
    repeated = [...repeated, ...items];
  }
  return repeated;
}

export default function SponsorsList({
  initialSponsors,
  initialMediaPartners,
}: SponsorsListProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors || []);
  const [mediaPartners, setMediaPartners] = useState<Sponsor[]>(initialMediaPartners || []);
  const [loading, setLoading] = useState(initialSponsors === undefined);

  useEffect(() => {
    // If initial server data is provided, sync it to state
    if (initialSponsors !== undefined && initialMediaPartners !== undefined) {
      setSponsors(initialSponsors);
      setMediaPartners(initialMediaPartners);
      setLoading(false);
      return;
    }

    // Client-side fallback fetching if no server props provided
    const supabase = createClient();
    async function loadSponsors() {
      try {
        const { data, error } = await supabase
          .from("sponsors")
          .select("*")
          .eq("is_active", true)
          .order("order", { ascending: true });

        if (data && !error) {
          const sp = data.filter((item: any) => {
            const val = (item.category || item.type || "sponsor").toString().toLowerCase().trim();
            return val === "sponsor" || val === "sponsors";
          });
          const mp = data.filter((item: any) => {
            const val = (item.category || item.type || "").toString().toLowerCase().trim();
            return val === "media_partner" || val === "media partner" || val === "mediapartner" || val === "medpart";
          });
          setSponsors(sp);
          setMediaPartners(mp);
        }
      } catch (err) {
        console.error("Error loading sponsors:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSponsors();
  }, [initialSponsors, initialMediaPartners]);

  const sponsorMarqueeItems = useMemo(() => getMarqueeList(sponsors), [sponsors]);
  const mediaPartnerMarqueeItems = useMemo(() => getMarqueeList(mediaPartners), [mediaPartners]);

  // If loading, return null to prevent layout shifts
  if (loading) {
    return null;
  }

  // Empty State: If no sponsors or media partners are active
  const hasPartners = sponsors.length > 0 || mediaPartners.length > 0;
  if (!hasPartners) {
    return (
      <section id="sponsors" className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap relative z-10 font-poppins overflow-hidden">
        {/* Curated Atmospheric Accents (Safe Inset Positioning) */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden -z-10">
          <img
            src="/11.png"
            alt=""
            aria-hidden="true"
            className="absolute top-[6%] left-[6%] lg:left-[10%] w-32 sm:w-44 lg:w-52 h-auto opacity-40 animate-float-slow hidden md:block"
          />
          <img
            src="/54.png"
            alt=""
            aria-hidden="true"
            className="absolute bottom-[8%] right-[6%] lg:right-[10%] w-18 sm:w-24 lg:w-28 h-auto opacity-45 animate-float-subtle hidden md:block"
            style={{ animationDelay: "2.5s" }}
          />
        </div>

        <CustomHeading 
          as="h2" 
          text="Sponsors & Media Partners" 
          className="font-headline-lg text-headline-lg text-amber-400 mb-stack-lg text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:0_3px_12px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.4)]" 
        />
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-neutral-900/50 border border-white/10 max-w-md mx-auto text-center backdrop-blur-md shadow-lg">
          <Handshake className="w-10 h-10 text-on-surface-variant/40 mb-3" />
          <p className="text-sm text-on-surface-variant/70 italic font-medium">
            Menunggu partisipasi mitra
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="sponsors" className="max-w-[100vw] mx-auto py-section-gap overflow-hidden w-full relative z-10 font-poppins">
      {/* Curated Atmospheric Accents (Depth of Field & Safe Inset Positioning) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden -z-10">
        {/* Deep Violet Planet: Upper Left Safe Inset */}
        <img
          src="/11.png"
          alt=""
          aria-hidden="true"
          className="absolute top-[6%] left-[6%] lg:left-[10%] w-36 sm:w-48 lg:w-56 h-auto opacity-40 animate-float-slow hidden md:block"
        />

        {/* Soft Golden Stardust: Mid-Bottom Safe Inset */}
        <img
          src="/35.png"
          alt=""
          aria-hidden="true"
          className="absolute bottom-[8%] left-[20%] lg:left-[26%] w-44 sm:w-56 lg:w-64 h-auto opacity-40 animate-drift-subtle hidden lg:block"
          style={{ animationDelay: "1.5s" }}
        />

        {/* Floating Asteroid Fragment: Lower Right Safe Inset */}
        <img
          src="/54.png"
          alt=""
          aria-hidden="true"
          className="absolute bottom-[6%] right-[6%] lg:right-[10%] w-20 sm:w-28 lg:w-32 h-auto opacity-45 animate-float-subtle hidden md:block"
          style={{ animationDelay: "2.5s" }}
        />
      </div>

      <CustomHeading 
        as="h2" 
        text="Sponsors & Media Partners" 
        className="font-headline-lg text-headline-lg text-amber-400 mb-stack-lg text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:0_3px_12px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.4)]" 
      />

      <div className="flex flex-col gap-12 w-full">
        {/* TOP ROW: Sponsors (Larger visual prominence) */}
        {sponsors.length > 0 && (
          <div className="w-full">
            <h3 className="text-center text-xs uppercase tracking-widest text-secondary mb-6 font-semibold">
              Official Event Sponsors
            </h3>
            
            {sponsors.length <= 4 ? (
              // Centered layout for small item counts
              <div className="flex flex-wrap items-center justify-center gap-6 max-w-6xl mx-auto px-4">
                {sponsors.map((item) => (
                  <SponsorCard key={item.id} item={item} isSponsor={true} />
                ))}
              </div>
            ) : (
              // Infinite horizontal scrolling marquee for larger counts
              <div className="relative group w-full flex overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                <div className="scroll-track flex">
                  {/* Track 1 */}
                  <div className="flex gap-6 pr-6 shrink-0 items-center">
                    {sponsorMarqueeItems.map((item, idx) => (
                      <SponsorCard key={`sp-1-${item.id}-${idx}`} item={item} isSponsor={true} />
                    ))}
                  </div>
                  {/* Track 2 (Duplicate for infinite seamless loop) */}
                  <div className="flex gap-6 pr-6 shrink-0 items-center" aria-hidden="true">
                    {sponsorMarqueeItems.map((item, idx) => (
                      <SponsorCard key={`sp-2-${item.id}-${idx}`} item={item} isSponsor={true} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ROW: Media Partners (Noticeably more compact) */}
        {mediaPartners.length > 0 && (
          <div className="w-full">
            <h3 className="text-center text-xs uppercase tracking-widest text-tertiary mb-6 font-semibold">
              Media Partners
            </h3>
            
            {mediaPartners.length <= 4 ? (
              // Centered layout for small item counts
              <div className="flex flex-wrap items-center justify-center gap-4 max-w-6xl mx-auto px-4">
                {mediaPartners.map((item) => (
                  <SponsorCard key={item.id} item={item} isSponsor={false} />
                ))}
              </div>
            ) : (
              // Infinite horizontal scrolling marquee for larger counts
              <div className="relative group w-full flex overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                <div className="scroll-track flex">
                  {/* Track 1 */}
                  <div className="flex gap-4 pr-4 shrink-0 items-center">
                    {mediaPartnerMarqueeItems.map((item, idx) => (
                      <SponsorCard key={`mp-1-${item.id}-${idx}`} item={item} isSponsor={false} />
                    ))}
                  </div>
                  {/* Track 2 (Duplicate for infinite seamless loop) */}
                  <div className="flex gap-4 pr-4 shrink-0 items-center" aria-hidden="true">
                    {mediaPartnerMarqueeItems.map((item, idx) => (
                      <SponsorCard key={`mp-2-${item.id}-${idx}`} item={item} isSponsor={false} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
