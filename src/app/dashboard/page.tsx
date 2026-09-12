import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TicketSlider from "@/components/dashboard/TicketSlider";
import PromoSlider from "@/components/dashboard/PromoSlider";
import DashboardHeader from "./components/DashboardHeader";
import { Ticket, Promo } from "@/types/database";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get user session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Authoritative full_name from database profiles table (Server Component)
  const resolvedFullName = profile?.full_name?.trim() || "";
  const firstName = resolvedFullName ? resolvedFullName.split(" ")[0] : (user.email ? user.email.split("@")[0] : "User");

  // Fetch user's festival tickets
  const { data: ticketsData } = await supabase
    .from("tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const festivalTickets = ((ticketsData as Ticket[]) || []).map((t: any) => ({
    ...t,
    payment_status: (t.payment_status || (t.token ? "verified" : "pending")).toLowerCase(),
    amount_paid: Number(t.amount_paid || 0),
    ticket_phase: t.ticket_phase || null,
  }));

  // Fetch user's ColorFun registrations
  const { data: cfrData } = await supabase
    .from("colorfun_registrations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Map ColorFun tickets (all statuses: pending, verified, rejected)
  const cfrTickets: Ticket[] = (cfrData || []).map((reg: any) => ({
    id: reg.id,
    token: reg.ticket_qr_code || "",
    transaction_id: reg.id,
    user_id: reg.user_id || user.id,
    event_type: "CFR" as const,
    payment_status: (reg.payment_status || "pending").toLowerCase(),
    amount_paid: Number(reg.amount_paid || 0),
    ticket_phase: reg.ticket_phase || null,
    nomor_bib: reg.nomor_bib ?? reg.bib_number ?? null,
    group_id: reg.group_id ?? null,
    is_primary: reg.is_primary ?? null,
    scan_count: reg.scan_count || 0,
    scanned_by: null,
    scanned_at: reg.last_scanned_at || null,
    created_at: reg.created_at,
  }));

  // Fetch user's Festival registrations
  const { data: festivalRegsData } = await supabase
    .from("festival_registrations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Map Festival tickets (all statuses: pending, verified, rejected)
  const festivalTicketsList: Ticket[] = (festivalRegsData || []).map((reg: any) => ({
    id: reg.id,
    token: reg.ticket_qr_code || "",
    transaction_id: reg.id,
    user_id: reg.user_id || user.id,
    event_type: "FESTIVAL" as const,
    payment_status: (reg.payment_status || "pending").toLowerCase(),
    amount_paid: Number(reg.amount_paid || 0),
    ticket_phase: reg.ticket_phase || null,
    nomor_bib: reg.nomor_bib ?? reg.bib_number ?? null,
    group_id: reg.group_id ?? null,
    is_primary: reg.is_primary ?? null,
    scan_count: reg.scan_count || 0,
    scanned_by: null,
    scanned_at: reg.last_scanned_at || null,
    created_at: reg.created_at,
  }));

  const tickets = [...cfrTickets, ...festivalTicketsList, ...festivalTickets];

  // Fetch active promos
  const { data: promosData } = await supabase
    .from("promos")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const promos = (promosData as Promo[]) || [];

  return (
    <div className="min-h-screen text-on-surface pb-24">
      {/* Top Header with User Dropdown and Client-Side Logout */}
      <DashboardHeader
        userName={resolvedFullName || (user.email ? user.email.split("@")[0] : "User")}
        userEmail={user.email || profile?.email || ""}
        role={profile?.role || "user"}
      />

      {/* Main Content */}
      <main className="pt-28 px-4 md:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col gap-8">
        
        {/* Welcome Banner */}
        <section>
          <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ffd700] to-[#ffb4ab]">{firstName}!</span>
              </h2>
              <p className="text-slate-300 text-lg">Ready for the cosmic journey?</p>
            </div>
          </div>
        </section>

        {/* Tickets Section */}
        <section>
          <h3 className="text-2xl font-bold text-secondary mb-6">My Active Tickets</h3>
          <TicketSlider tickets={tickets} />
        </section>

        {/* Hot Deals / Promos Section */}
        <section>
          <h3 className="text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-2">
            🔥 Hot Deals
          </h3>
          <PromoSlider promos={promos} />
        </section>

        {/* Explore More Events */}
        <section className="mt-8 mb-12">
          <h3 className="text-2xl font-bold text-secondary mb-6">Explore More Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CFR Card */}
            <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group flex flex-col shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
              <div className="h-44 w-full relative overflow-hidden bg-surface-dim">
                <Image 
                  src="/Bintang-Bintang Presisi.png" 
                  fill 
                  alt="ColorFun Run" 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-secondary text-primary-container font-bold text-[10px] uppercase tracking-wider rounded-full shadow-md">
                  Sports
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <h4 className="text-xl font-bold text-white mb-4">ColorFun Run</h4>
                <Link 
                  href="/colorfun/checkout" 
                  className="w-full text-center py-2.5 bg-black/30 border border-white/10 hover:bg-black/50 text-white rounded-lg font-bold transition-colors mt-auto text-sm"
                >
                  Buy Ticket
                </Link>
              </div>
            </div>

            {/* Festival Card */}
            <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group flex flex-col shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
              <div className="h-44 w-full relative overflow-hidden bg-surface-dim">
                <Image 
                  src="/Bintang-Bintang Presisi.png" 
                  fill 
                  alt="VOITSFEST Main Festival" 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-secondary text-primary-container font-bold text-[10px] uppercase tracking-wider rounded-full shadow-md">
                  Festival
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <h4 className="text-xl font-bold text-white mb-4">VOITSFEST Main Festival</h4>
                <Link 
                  href="/festival/checkout" 
                  className="w-full text-center py-2.5 bg-black/30 border border-white/10 hover:bg-black/50 text-white rounded-lg font-bold transition-colors mt-auto text-sm"
                >
                  Buy Ticket
                </Link>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
