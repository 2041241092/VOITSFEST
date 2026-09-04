import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TicketSlider from "@/components/dashboard/TicketSlider";
import PromoSlider from "@/components/dashboard/PromoSlider";
import DashboardHeader from "./components/DashboardHeader";
import { Ticket, Promo, Transaction } from "@/types/database";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
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

  // Fetch user's transactions
  const { data: txData } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const transactions = (txData as Transaction[]) || [];

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
          <div className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ffd700] to-[#ffb4ab]">{firstName}!</span>
              </h2>
              <p className="text-on-surface-variant text-lg">Ready for the cosmic journey?</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column: Tickets & Promos */}
          <div className="xl:col-span-2 flex flex-col gap-8">
            
            <section>
              <h3 className="text-2xl font-bold text-secondary mb-6">My Active Tickets</h3>
              <TicketSlider tickets={tickets} />
            </section>

            <section>
              <h3 className="text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-2">
                🔥 Hot Deals
              </h3>
              <PromoSlider promos={promos} />
            </section>

          </div>

          {/* Right Column: Payment Status Tracker */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            <section className="h-full flex flex-col">
              <h3 className="text-2xl font-bold text-secondary mb-6">Payment Status</h3>
              <div className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-xl p-6 flex-1 flex flex-col gap-4">
                
                {transactions.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-8 border-2 border-dashed border-white/20 rounded-lg">
                    No recent transactions.
                  </p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="bg-surface-container-lowest/60 border border-white/5 rounded-lg p-4 relative overflow-hidden transition-opacity">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        tx.status === 'Verified' ? 'bg-tertiary' :
                        tx.status === 'Rejected' ? 'bg-error' : 'bg-[#ffd700]'
                      }`}></div>
                      <div className="flex justify-between items-start mb-2 pl-2">
                        <h5 className={`font-bold ${tx.status === 'Verified' ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                          {tx.sub_event_type} Ticket
                        </h5>
                        {tx.status === 'Verified' && <CheckCircle2 className="text-tertiary w-5 h-5" />}
                        {tx.status === 'Pending' && <Clock className="text-[#ffd700] w-5 h-5" />}
                        {tx.status === 'Rejected' && <XCircle className="text-error w-5 h-5" />}
                      </div>
                      <div className="pl-2 flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          tx.status === 'Verified' ? 'text-tertiary' :
                          tx.status === 'Rejected' ? 'text-error' : 'text-[#ffd700]'
                        }`}>
                          {tx.status}
                        </span>
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(tx.amount || 0)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                
              </div>
            </section>
          </div>

        </div>

        {/* Explore More Events */}
        <section className="mt-8 mb-12">
          <h3 className="text-2xl font-bold text-secondary mb-6">Explore More Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CFR Card */}
            <div className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden group flex flex-col">
              <div className="h-40 w-full relative overflow-hidden bg-surface-dim">
                <Image src="/assets/img/colorfun-run-bg.jpg" fill alt="CFR" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-secondary text-primary-container font-bold text-[10px] uppercase rounded-full">Sports</div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-xl font-bold mb-2">ColorFun Run</h4>
                <p className="text-sm text-on-surface-variant mb-6">A 5K neon-glow run through the festival grounds. Get ready to shine!</p>
                <Link href="/colorfun/checkout" className="w-full text-center py-2 border border-white/20 hover:bg-white/10 rounded font-bold transition-colors mt-auto">
                  Buy Ticket
                </Link>
              </div>
            </div>

            {/* Festival Card */}
            <div className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden group flex flex-col">
              <div className="h-40 w-full relative overflow-hidden bg-surface-dim">
                <Image src="/assets/img/festival-bg.jpg" fill alt="Festival" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-secondary text-primary-container font-bold text-[10px] uppercase rounded-full">Festival</div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-xl font-bold mb-2">VOITSFEST Main Festival</h4>
                <p className="text-sm text-on-surface-variant mb-6">The grand finale featuring music, art, and innovation. A night to remember.</p>
                <Link href="/festival/checkout" className="w-full text-center py-2 border border-white/20 hover:bg-white/10 rounded font-bold transition-colors mt-auto">
                  Buy Ticket
                </Link>
              </div>
            </div>

            {/* Tenant Card */}
            <div className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden group flex flex-col">
              <div className="h-40 w-full relative overflow-hidden bg-surface-dim">
                <Image src="/assets/img/tenant-bg.jpg" fill alt="Tenant" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-[#87CEEB] text-primary-container font-bold text-[10px] uppercase rounded-full">Business</div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-xl font-bold mb-2">Tenant Registration</h4>
                <p className="text-sm text-on-surface-variant mb-6">Join our cosmic marketplace and showcase your brand to thousands of visitors.</p>
                <Link href="/tenant/register" className="w-full text-center py-2 border border-white/20 hover:bg-white/10 rounded font-bold transition-colors mt-auto">
                  Register Now
                </Link>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
