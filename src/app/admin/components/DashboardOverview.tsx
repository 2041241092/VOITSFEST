"use client";

import { useEffect, useState, useCallback } from "react";
import PaymentVerification from "./PaymentVerification";
import CMSManager from "./CMSManager";
import { Users, Wallet, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalRegistrants: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    try {
      // 1. Pending Payments Count (status === 'Pending')
      const { count: pendingCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending");

      // 2. Total Revenue (sum of amount from transactions where status === 'Verified' across all sub-events)
      const { data: verifiedTx } = await supabase
        .from("transactions")
        .select("amount")
        .eq("status", "Verified");

      const revenue = verifiedTx?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

      // 3. Total Registrants: Only ColorFun Run & Festival (from tickets or verified CFR/Festival transactions)
      // Excludes BPC, BCC, Seminar, Tenant
      const { count: ticketsCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("event_type", ["CFR", "FESTIVAL"]);

      const { count: verifiedCfrFestCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .in("sub_event_type", ["CFR", "FESTIVAL"])
        .eq("status", "Verified");

      const totalRegistrants = Math.max(ticketsCount || 0, verifiedCfrFestCount || 0);

      setStats({
        totalRegistrants,
        totalRevenue: revenue,
        pendingPayments: pendingCount || 0,
      });
    } catch (err) {
      console.error("Error fetching dashboard overview stats:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();

    // Set up Realtime listener for live updates across transactions and tickets tables
    const channel = supabase
      .channel("admin-dashboard-stats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchStats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats, supabase]);

  // Clean Indonesian Rupiah formatting helper (e.g. Rp 15.250.000)
  const formatRupiah = (amount: number) => {
    return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
  };

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* 1. Overview Summary Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Registrants (CFR & Festival only, clean numeric count) */}
        <div className="bg-surface-container/40 backdrop-blur-xl border border-white/15 rounded-2xl p-6 relative overflow-hidden group hover:border-secondary/40 hover:shadow-[0_0_25px_rgba(176,198,255,0.15)] transition-all">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-xs text-on-surface-variant/80 mb-2 tracking-widest uppercase">
                TOTAL REGISTRANTS
              </p>
              <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                {loading ? "..." : stats.totalRegistrants.toLocaleString("id-ID")}
              </h3>
              <p className="text-xs text-secondary mt-3 font-medium">
                ColorFun Run &amp; Festival
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary shadow-[0_0_15px_rgba(176,198,255,0.2)]">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Revenue (All verified sub-events, clean Rupiah format) */}
        <div className="bg-surface-container/40 backdrop-blur-xl border border-white/15 rounded-2xl p-6 relative overflow-hidden group hover:border-tertiary/40 hover:shadow-[0_0_25px_rgba(230,191,160,0.15)] transition-all">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-xs text-on-surface-variant/80 mb-2 tracking-widest uppercase">
                TOTAL REVENUE
              </p>
              <h3 className="text-3xl md:text-4xl font-bold text-tertiary tracking-tight">
                {loading ? "..." : formatRupiah(stats.totalRevenue)}
              </h3>
              <p className="text-xs text-tertiary/80 mt-3 font-medium">
                Verified Transactions
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tertiary/15 border border-tertiary/30 flex items-center justify-center text-tertiary shadow-[0_0_15px_rgba(230,191,160,0.2)]">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Pending Payments (Clean numeric pending count) */}
        <div className="bg-surface-container/40 backdrop-blur-xl border border-white/15 rounded-2xl p-6 relative overflow-hidden group hover:border-error/40 hover:shadow-[0_0_25px_rgba(255,180,171,0.15)] transition-all">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-error/10 rounded-full blur-2xl group-hover:bg-error/20 transition-colors pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-xs text-on-surface-variant/80 mb-2 tracking-widest uppercase">
                PENDING PAYMENTS
              </p>
              <h3 className="text-4xl md:text-5xl font-bold text-error tracking-tight">
                {loading ? "..." : stats.pendingPayments.toLocaleString("id-ID")}
              </h3>
              <p className="text-xs text-error/80 mt-3 font-medium">
                Transactions Awaiting Verification
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-error/15 border border-error/30 flex items-center justify-center text-error shadow-[0_0_15px_rgba(255,180,171,0.2)]">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

      </section>

      {/* 2. Payment Verification Center (Reactivity callback wired) */}
      <PaymentVerification onTransactionUpdated={fetchStats} />

      {/* 3. Bottom Grid: CMS Controls & Gateways */}
      <CMSManager />
    </div>
  );
}
