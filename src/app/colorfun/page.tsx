import CustomHeading from "@/components/ui/CustomHeading";
import FlipCard from "@/components/ui/FlipCard";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatDisplayDate } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDisplayTime(timeStr?: string, fallback: string = "06:00 WIB - Selesai") {
  if (!timeStr || !timeStr.trim()) return fallback;
  const t = timeStr.trim();
  if (t.toLowerCase().includes("wib") || t.toLowerCase().includes("selesai")) {
    return t;
  }
  return `${t} WIB - Selesai`;
}

export default async function ColorFunRun() {
  const supabase = await createClient();

  // Fetch from cms_settings for ColorFun Run details (controlled by Admin Central CMS)
  let cfrRaw: { date?: string; time?: string; location?: string } | undefined;

  try {
    const { data: records } = await supabase
      .from("cms_settings")
      .select("key, value")
      .in("key", ["cfr_details", "event_details"]);

    const cfrRec = records?.find((r) => r.key === "cfr_details");
    const evRec = records?.find((r) => r.key === "event_details");

    if (cfrRec?.value && typeof cfrRec.value === "object") {
      cfrRaw = cfrRec.value as any;
    } else if (evRec?.value && typeof evRec.value === "object" && (evRec.value as any).cfr) {
      cfrRaw = (evRec.value as any).cfr;
    }
  } catch (err) {
    console.error("Error fetching ColorFun Run CMS metadata:", err);
  }

  const cfrDate = formatDisplayDate(cfrRaw?.date, "Minggu, 25 Oktober 2026");
  const cfrTime = formatDisplayTime(cfrRaw?.time, "06:00 WIB - Selesai");
  const cfrVenue = (cfrRaw?.location && cfrRaw.location.trim()) || "ITS Campus";

  return (
    <>
      <div className="star-bg fixed"></div>
      <Navbar />
      
      <main className="pt-[100px] relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[921px] flex items-center justify-center overflow-hidden px-margin-desktop max-md:px-margin-mobile py-section-gap">
          <div className="relative z-10 text-center flex flex-col items-center max-w-4xl mx-auto mt-16">
            <div className="glass-card px-6 py-2 rounded-full mb-stack-lg inline-block border border-primary-container/30">
              <span className="font-poppins text-label-sm text-primary-container uppercase tracking-[0.2em]">Spark the momentum</span>
            </div>
            
            <CustomHeading 
              as="h1" 
              text="COLORFUN RUN" 
              className="font-headline-lg text-display-lg max-md:font-headline-lg-mobile max-md:text-headline-lg-mobile text-primary-fixed mb-stack-md glowing-text uppercase floating-element" 
            />
            
            <p className="font-poppins text-body-lg text-on-surface-variant max-w-2xl mb-stack-lg mt-stack-md bg-surface/50 backdrop-blur-md p-4 rounded-xl border border-white/5">
              {cfrDate} &nbsp;|&nbsp; {cfrTime} &nbsp;|&nbsp; {cfrVenue}
            </p>
          </div>
        </section>

        {/* Cosmic Memories Grid */}
        <section className="py-section-gap px-margin-desktop max-md:px-margin-mobile max-w-container-max mx-auto rounded-3xl border border-white/5 relative overflow-hidden bg-surface-container-lowest/20" id="tickets">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="text-center mb-section-gap relative z-10">
            <CustomHeading 
              as="h2" 
              text="MEMORIES" 
              className="font-headline-lg text-headline-lg max-md:font-headline-lg-mobile max-md:text-headline-lg-mobile text-primary-fixed-dim mb-stack-sm" 
            />
            <p className="font-poppins text-body-lg text-primary uppercase tracking-[0.3em] opacity-80">Colorfun run Rekap</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter relative z-10">
            {/* Memory Card 1 */}
            <FlipCard
              className="h-[320px]"
              front={
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <Image
                    src="/assets/img/memories/frame-1.png"
                    alt="Decorative Frame"
                    fill
                    className="object-contain z-0 pointer-events-none p-2"
                  />
                </div>
              }
              back={
                <div className="relative w-full h-full">
                  <Image
                    src="/assets/img/cfr-1.jpg"
                    alt="ColorFun Run Memory 1"
                    fill
                    className="object-cover rounded-xl"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-70 pointer-events-none rounded-xl" />
                  <div className="absolute bottom-3 left-3 right-3 text-left z-10 pointer-events-none">
                    <p className="font-poppins text-xs font-semibold text-primary-fixed uppercase tracking-wider">Color Burst</p>
                    <p className="font-poppins text-[11px] text-on-surface/80">Glowing Powder Run</p>
                  </div>
                </div>
              }
            />

            {/* Memory Card 2 */}
            <FlipCard
              className="h-[320px]"
              front={
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <Image
                    src="/assets/img/memories/frame-2.png"
                    alt="Decorative Frame"
                    fill
                    className="object-contain z-0 pointer-events-none p-2"
                  />
                </div>
              }
              back={
                <div className="relative w-full h-full">
                  <Image
                    src="/assets/img/cfr-2.jpg"
                    alt="ColorFun Run Memory 2"
                    fill
                    className="object-cover rounded-xl"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-70 pointer-events-none rounded-xl" />
                  <div className="absolute bottom-3 left-3 right-3 text-left z-10 pointer-events-none">
                    <p className="font-poppins text-xs font-semibold text-primary-fixed uppercase tracking-wider">Night Vibe</p>
                    <p className="font-poppins text-[11px] text-on-surface/80">Laser Spectacle</p>
                  </div>
                </div>
              }
            />

            {/* Memory Card 3 */}
            <FlipCard
              className="h-[320px]"
              front={
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <Image
                    src="/assets/img/memories/frame-3.png"
                    alt="Decorative Frame"
                    fill
                    className="object-contain z-0 pointer-events-none p-2"
                  />
                </div>
              }
              back={
                <div className="relative w-full h-full">
                  <Image
                    src="/assets/img/cfr-3.jpg"
                    alt="ColorFun Run Memory 3"
                    fill
                    className="object-cover rounded-xl"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-70 pointer-events-none rounded-xl" />
                  <div className="absolute bottom-3 left-3 right-3 text-left z-10 pointer-events-none">
                    <p className="font-poppins text-xs font-semibold text-primary-fixed uppercase tracking-wider">Electric Beats</p>
                    <p className="font-poppins text-[11px] text-on-surface/80">Stage Performances</p>
                  </div>
                </div>
              }
            />

            {/* Memory Card 4 */}
            <FlipCard
              className="h-[320px]"
              front={
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <Image
                    src="/assets/img/memories/frame-4.png"
                    alt="Decorative Frame"
                    fill
                    className="object-contain z-0 pointer-events-none p-2"
                  />
                </div>
              }
              back={
                <div className="relative w-full h-full">
                  <Image
                    src="/assets/img/cfr-4.jpg"
                    alt="ColorFun Run Memory 4"
                    fill
                    className="object-cover rounded-xl"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-70 pointer-events-none rounded-xl" />
                  <div className="absolute bottom-3 left-3 right-3 text-left z-10 pointer-events-none">
                    <p className="font-poppins text-xs font-semibold text-primary-fixed uppercase tracking-wider">Unite &amp; Glow</p>
                    <p className="font-poppins text-[11px] text-on-surface/80">Festival Finish Line</p>
                  </div>
                </div>
              }
            />
          </div>
        </section>
      </main>
      
      <Footer />
    </>
  );
}
