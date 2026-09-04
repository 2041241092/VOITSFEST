"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Filter, Eye, CheckCircle, XCircle, RotateCw, AlertCircle } from "lucide-react";

export type UnifiedPaymentRecord = {
  id: string;
  source_id: string;
  user_id: string | null;
  origin_table: "colorfun_registrations" | "festival_registrations" | "transactions";
  sub_event_type: string;
  source_type: string;
  participant_name: string;
  rekening_pengirim?: string | null;
  amount: number;
  ticket_phase?: string | null;
  payment_proof_url: string;
  status: "Pending" | "Verified" | "Rejected";
  ticket_qr_code?: string | null;
  created_at: string;
};

// Backward-compatible alias
export type Transaction = UnifiedPaymentRecord;

type PaymentVerificationProps = {
  onTransactionUpdated?: () => void;
};

export default function PaymentVerification({ onTransactionUpdated }: PaymentVerificationProps = {}) {
  const [records, setRecords] = useState<UnifiedPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch records directly from both colorfun_registrations and festival_registrations (and transactions)
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [cfrRes, festRes, txRes] = await Promise.all([
        supabase.from("colorfun_registrations").select("*").order("created_at", { ascending: false }),
        supabase.from("festival_registrations").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false })
      ]);

      if (cfrRes.error) console.error("CFR fetch error in PaymentVerification:", cfrRes.error);
      if (festRes.error) console.error("Fest fetch error in PaymentVerification:", festRes.error);
      if (txRes.error) console.error("Tx fetch error in PaymentVerification:", txRes.error);

      const allItems: UnifiedPaymentRecord[] = [];
      const handledCfrIds = new Set<string>();
      const handledFestIds = new Set<string>();

      // 1. ColorFun Run registrations
      (cfrRes.data || []).forEach((c: any) => {
        handledCfrIds.add(c.id);
        const rawStatus = (c.payment_status || "pending").toLowerCase();
        const status: "Pending" | "Verified" | "Rejected" =
          rawStatus === "verified" ? "Verified" : rawStatus === "rejected" ? "Rejected" : "Pending";

        const amount = Number(c.amount_paid || 0);

        allItems.push({
          id: `cfr-${c.id}`,
          source_id: c.id,
          user_id: c.user_id || null,
          origin_table: "colorfun_registrations",
          sub_event_type: "ColorFun Run",
          source_type: "CFR",
          participant_name: c.nama_lengkap || "Peserta ColorFun",
          rekening_pengirim: c.rekening_pengirim || "-",
          amount,
          ticket_phase: c.ticket_phase || null,
          payment_proof_url: c.bukti_transfer_url || "",
          status,
          ticket_qr_code: c.ticket_qr_code || null,
          created_at: c.created_at,
        });
      });

      // 2. Festival registrations
      (festRes.data || []).forEach((f: any) => {
        handledFestIds.add(f.id);
        const rawStatus = (f.payment_status || "pending").toLowerCase();
        const status: "Pending" | "Verified" | "Rejected" =
          rawStatus === "verified" ? "Verified" : rawStatus === "rejected" ? "Rejected" : "Pending";

        const amount = Number(f.amount_paid || 0);

        allItems.push({
          id: `fest-${f.id}`,
          source_id: f.id,
          user_id: f.user_id || null,
          origin_table: "festival_registrations",
          sub_event_type: "Festival",
          source_type: "FESTIVAL",
          participant_name: f.nama_lengkap || "Peserta Festival",
          rekening_pengirim: f.rekening_pengirim || "-",
          amount,
          ticket_phase: f.ticket_phase || null,
          payment_proof_url: f.bukti_transfer_url || "",
          status,
          ticket_qr_code: f.ticket_qr_code || null,
          created_at: f.created_at,
        });
      });

      // 3. Fallback: Any transactions not already accounted for by source_id
      (txRes.data || []).forEach((tx: any) => {
        const isHandled =
          (tx.source_id && (handledCfrIds.has(tx.source_id) || handledFestIds.has(tx.source_id)));

        if (!isHandled) {
          const rawStatus = (tx.status || "Pending").toLowerCase();
          const status: "Pending" | "Verified" | "Rejected" =
            rawStatus === "verified" ? "Verified" : rawStatus === "rejected" ? "Rejected" : "Pending";

          allItems.push({
            id: `tx-${tx.id}`,
            source_id: tx.id,
            user_id: tx.user_id || null,
            origin_table: "transactions",
            sub_event_type: tx.sub_event_type || "Transaction",
            source_type: tx.source_type || "Direct",
            participant_name: "Peserta VOITSFEST",
            rekening_pengirim: "-",
            amount: Number(tx.amount || 0),
            payment_proof_url: tx.payment_proof_url || "",
            status,
            created_at: tx.created_at,
          });
        }
      });

      // Sort newest first
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecords(allItems);
    } catch (err: any) {
      console.error("Unexpected error in fetchPayments:", err);
      setErrorMessage("Terjadi kesalahan jaringan saat mengambil data pembayaran.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Realtime subscription across all registration and transaction tables
  useEffect(() => {
    const channel = supabase
      .channel("payment-verification-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colorfun_registrations" },
        () => {
          fetchPayments();
          if (onTransactionUpdated) onTransactionUpdated();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_registrations" },
        () => {
          fetchPayments();
          if (onTransactionUpdated) onTransactionUpdated();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchPayments();
          if (onTransactionUpdated) onTransactionUpdated();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments, onTransactionUpdated, supabase]);

  // Verify Action (Bi-directional sync)
  const handleVerify = async (record: UnifiedPaymentRecord) => {
    const { data: { user } } = await supabase.auth.getUser();

    try {
      if (record.origin_table === "colorfun_registrations") {
        const generatedQR = record.ticket_qr_code || ('CFR-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase());
        const { error } = await supabase
          .from("colorfun_registrations")
          .update({ payment_status: "verified", ticket_qr_code: generatedQR })
          .eq("id", record.source_id);

        if (error) {
          alert("Gagal memverifikasi pendaftaran CFR: " + error.message);
          return;
        }

        // Sync transactions table
        try {
          await supabase
            .from("transactions")
            .update({ status: "Verified", verified_at: new Date().toISOString(), verified_by: user?.id })
            .or(`source_id.eq.${record.source_id},user_id.eq.${record.user_id}`)
            .in("sub_event_type", ["CFR", "cfr", "colorfun"]);
        } catch (e) {
          console.warn("Notice syncing transactions:", e);
        }

      } else if (record.origin_table === "festival_registrations") {
        const generatedQR = record.ticket_qr_code || ('FEST-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase());
        const { error } = await supabase
          .from("festival_registrations")
          .update({ payment_status: "verified", ticket_qr_code: generatedQR })
          .eq("id", record.source_id);

        if (error) {
          alert("Gagal memverifikasi pendaftaran Festival: " + error.message);
          return;
        }

        // Sync transactions table
        try {
          await supabase
            .from("transactions")
            .update({ status: "Verified", verified_at: new Date().toISOString(), verified_by: user?.id })
            .or(`source_id.eq.${record.source_id},user_id.eq.${record.user_id}`)
            .in("sub_event_type", ["FESTIVAL", "festival"]);
        } catch (e) {
          console.warn("Notice syncing transactions:", e);
        }

      } else {
        const { error } = await supabase
          .from("transactions")
          .update({ status: "Verified", verified_at: new Date().toISOString(), verified_by: user?.id })
          .eq("id", record.source_id);

        if (error) {
          alert("Gagal memverifikasi transaksi: " + error.message);
          return;
        }
      }

      // Optimistic update
      setRecords(prev =>
        prev.map(r => (r.id === record.id ? { ...r, status: "Verified" } : r))
      );

      await fetchPayments();
      if (onTransactionUpdated) {
        onTransactionUpdated();
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      alert("Terjadi kesalahan saat memverifikasi: " + (err?.message || "Unknown error"));
    }
  };

  // Reject Action (Bi-directional sync)
  const handleReject = async (record: UnifiedPaymentRecord) => {
    try {
      if (record.origin_table === "colorfun_registrations") {
        const { error } = await supabase
          .from("colorfun_registrations")
          .update({ payment_status: "rejected" })
          .eq("id", record.source_id);

        if (error) {
          alert("Gagal menolak pendaftaran CFR: " + error.message);
          return;
        }

        try {
          await supabase
            .from("transactions")
            .update({ status: "Rejected" })
            .or(`source_id.eq.${record.source_id},user_id.eq.${record.user_id}`)
            .in("sub_event_type", ["CFR", "cfr", "colorfun"]);
        } catch (e) {
          console.warn("Notice syncing transactions rejection:", e);
        }

      } else if (record.origin_table === "festival_registrations") {
        const { error } = await supabase
          .from("festival_registrations")
          .update({ payment_status: "rejected" })
          .eq("id", record.source_id);

        if (error) {
          alert("Gagal menolak pendaftaran Festival: " + error.message);
          return;
        }

        try {
          await supabase
            .from("transactions")
            .update({ status: "Rejected" })
            .or(`source_id.eq.${record.source_id},user_id.eq.${record.user_id}`)
            .in("sub_event_type", ["FESTIVAL", "festival"]);
        } catch (e) {
          console.warn("Notice syncing transactions rejection:", e);
        }

      } else {
        const { error } = await supabase
          .from("transactions")
          .update({ status: "Rejected" })
          .eq("id", record.source_id);

        if (error) {
          alert("Gagal menolak transaksi: " + error.message);
          return;
        }
      }

      // Optimistic update
      setRecords(prev =>
        prev.map(r => (r.id === record.id ? { ...r, status: "Rejected" } : r))
      );

      await fetchPayments();
      if (onTransactionUpdated) {
        onTransactionUpdated();
      }
    } catch (err: any) {
      console.error("Reject error:", err);
      alert("Terjadi kesalahan saat menolak: " + (err?.message || "Unknown error"));
    }
  };

  const handleManualRefresh = async () => {
    await fetchPayments();
    if (onTransactionUpdated) {
      onTransactionUpdated();
    }
  };

  const filteredRecords = useMemo(() => {
    if (filter === "All") return records;
    return records.filter(r => r.status === filter);
  }, [records, filter]);

  return (
    <section className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col overflow-hidden relative shadow-2xl">
      {/* Header bar */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-surface/60">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
            Payment Verification Center
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary/15 text-tertiary border border-tertiary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              Live Supabase
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Sinkronisasi data langsung dari <code className="font-mono text-secondary">colorfun_registrations</code> &amp; <code className="font-mono text-secondary">festival_registrations</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Manual Refresh Data Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-on-surface hover:text-white transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            title="Muat Ulang Data (Live Fetch)"
          >
            <RotateCw className={`w-3.5 h-3.5 text-secondary ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-on-surface-variant hidden sm:inline" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-secondary/10 text-secondary border border-secondary/30 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-secondary/20 transition-colors focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#0b1026] text-on-surface">Semua Status</option>
              <option value="Pending" className="bg-[#0b1026] text-on-surface">Pending</option>
              <option value="Verified" className="bg-[#0b1026] text-on-surface">Verified</option>
              <option value="Rejected" className="bg-[#0b1026] text-on-surface">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error message alert */}
      {errorMessage && (
        <div className="p-4 bg-error/10 border-b border-error/20 text-error text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto bg-surface/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-surface-container-low/60 text-on-surface-variant text-[11px] uppercase tracking-wider">
              <th className="p-4 py-3.5 font-semibold">Event / Bundle</th>
              <th className="p-4 py-3.5 font-semibold">Nama Peserta</th>
              <th className="p-4 py-3.5 font-semibold">Amount</th>
              <th className="p-4 py-3.5 font-semibold">Status</th>
              <th className="p-4 py-3.5 font-semibold">Bukti Transfer</th>
              <th className="p-4 py-3.5 font-semibold">Waktu Transaksi</th>
              <th className="p-4 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-poppins divide-y divide-white/5">
            {loading && records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RotateCw className="w-5 h-5 animate-spin text-secondary" />
                    <p className="text-xs">Memuat data pembayaran dari Supabase...</p>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                  <p className="text-sm font-medium">Tidak ada transaksi ditemukan.</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1">
                    {filter !== "All"
                      ? `Belum ada transaksi dengan status "${filter}".`
                      : "Tabel transaksi di Supabase saat ini kosong."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredRecords.map((item) => (
                <tr key={item.id} className="hover:bg-surface-variant/30 transition-colors">
                  <td className="p-4 py-3 text-white font-medium">
                    <span className="block">{item.sub_event_type}</span>
                    <span className="text-[10px] font-mono text-secondary uppercase font-bold tracking-wider">
                      {item.origin_table === "colorfun_registrations" ? "ColorFun Run" : item.origin_table === "festival_registrations" ? "Festival" : item.source_type}
                    </span>
                  </td>
                  <td className="p-4 py-3 text-white font-medium">
                    <span className="block">{item.participant_name}</span>
                    {item.rekening_pengirim && item.rekening_pengirim !== "-" && (
                      <span className="text-[11px] font-mono text-on-surface-variant/70">
                        a.n {item.rekening_pengirim}
                      </span>
                    )}
                  </td>
                  <td className="p-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#ffd700] font-mono font-semibold text-sm">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(item.amount)}
                      </span>
                      {item.ticket_phase && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30 w-fit">
                          {item.ticket_phase}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                        item.status === "Pending"
                          ? "bg-error-container/30 text-error border-error/30"
                          : item.status === "Verified"
                          ? "bg-tertiary-container/50 text-tertiary border-tertiary/30"
                          : "bg-surface-variant text-on-surface-variant border-white/10"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === "Pending"
                            ? "bg-error"
                            : item.status === "Verified"
                            ? "bg-tertiary"
                            : "bg-on-surface-variant"
                        }`}
                      ></span>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 py-3">
                    {item.payment_proof_url ? (
                      <a
                        href={item.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-secondary/50 transition-all text-xs font-medium text-on-surface-variant hover:text-secondary"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Bukti
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant/50 italic">Tidak ada</span>
                    )}
                  </td>
                  <td className="p-4 py-3 text-xs text-on-surface-variant font-mono">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "-"}
                  </td>
                  <td className="p-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {item.status === "Pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReject(item)}
                            className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors cursor-pointer"
                            title="Tolak Transaksi (Reject)"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerify(item)}
                            className="p-1.5 rounded-lg text-tertiary hover:bg-tertiary/10 transition-colors cursor-pointer"
                            title="Verifikasi Transaksi (Verify & Auto-Issue Ticket)"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-on-surface-variant/50 px-2 py-1 font-mono">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
