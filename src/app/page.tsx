import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import EventDetails from "@/components/landing/EventDetails";
import CelestialEvents from "@/components/landing/CelestialEvents";
import JourneyMap from "@/components/landing/JourneyMap";
import SponsorsList from "@/components/landing/SponsorsList";
import { createClient } from "@/lib/supabase/server";
import { Sponsor } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching sponsors for landing page:", error.message);
  }

  const allPartners = (data as Sponsor[]) || [];
  const sponsors = allPartners.filter((item) => {
    const val = (item.category || (item as any).type || "sponsor").toString().toLowerCase().trim();
    return val === "sponsor" || val === "sponsors";
  });
  const mediaPartners = allPartners.filter((item) => {
    const val = (item.category || (item as any).type || "").toString().toLowerCase().trim();
    return val === "media_partner" || val === "media partner" || val === "mediapartner" || val === "medpart";
  });

  return (
    <div className="text-on-background font-body-md overflow-x-hidden relative min-h-screen">
      {/* Background dark overlay for contrast */}
      <div className="fixed inset-0 -z-20 pointer-events-none bg-background/40"></div>

      <Navbar />

      <main className="pb-section-gap relative z-10 pt-20">
        <Hero />
        <EventDetails />
        <CelestialEvents />
        <JourneyMap />
        <SponsorsList initialSponsors={sponsors} initialMediaPartners={mediaPartners} />
      </main>

      <Footer />
    </div>
  );
}
