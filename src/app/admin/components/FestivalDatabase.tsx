"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { 
  Search, 
  RotateCw, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  Copy, 
  Check, 
  Filter,
  AlertCircle,
  Clock,
  X,
  Download
} from "lucide-react";
import { formatBIB, formatBIBCSV, downloadCSV } from "@/lib/bib";
import { decrementPromoQuota, rollbackPromoQuotaOnReject } from "@/lib/promo";
import { formatDisplayWIB } from "@/lib/timeUtils";

export type FestivalRegistration = {
  id: string;
  nomor_bib?: number | null;
  group_id?: string | null;
  is_primary?: boolean | null;
  user_id: string | null;
  nama_lengkap: string;
  whatsapp: string;
  email: string;
  kategori_peserta?: string | null;
  departemen?: string | null;
  nrp?: string | null;
  ktm_url?: string | null;
  rekening_pengirim?: string | null;
  bukti_transfer_url?: string | null;
  payment_status: string;
  amount_paid?: number | null;
  ticket_phase?: string | null;
  promo_id?: string | null;
  ticket_qr_code?: string | null;
  scan_count?: number | null;
  last_scanned_at?: string | null;
  created_at: string;
};

export default function FestivalDatabase() {
  const [registrations, setRegistrations] = useState<FestivalRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrModalRecord, setQrModalRecord] = useState<FestivalRegistration | null>(null);

  const supabase = createClient();

  // 1. Fetch records ordered by created_at descending
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("festival_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching festival_registrations:", error);
        setErrorMessage("Gagal memuat data Festival: " + error.message);
        setRegistrations([]);
      } else {
        setRegistrations(data || []);
      }
    } catch (err: any) {
      console.error("Unexpected error in fetchRegistrations:", err);
      setErrorMessage("Terjadi kesalahan jaringan saat mengambil data.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel("festival-database-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_registrations" },
        (payload) => {
          fetchRegistrations();
          if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
            setQrModalRecord(prev => (prev && prev.id === (payload.new as any).id ? (payload.new as FestivalRegistration) : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRegistrations, supabase]);

  // Listen for admin-refresh-data event
  useEffect(() => {
    const handleAdminRefresh = () => {
      fetchRegistrations();
    };
    window.addEventListener("admin-refresh-data", handleAdminRefresh);
    return () => {
      window.removeEventListener("admin-refresh-data", handleAdminRefresh);
    };
  }, [fetchRegistrations]);

  // Verify Action
  const handleVerify = async (record: FestivalRegistration) => {
    const recordId = record.id;
    if (actionInProgress) return;
    setActionInProgress(recordId);

    try {
      // 1. Supabase Update Call: if group_id exists, verify all members simultaneously with sequential BIBs & QR codes
      if (record.group_id) {
        const { data: members } = await supabase
          .from("festival_registrations")
          .select("id, ticket_qr_code, nomor_bib, is_primary")
          .eq("group_id", record.group_id)
          .order("is_primary", { ascending: false });

        const groupList = members || [];
        const neededCount = groupList.filter((m) => m.nomor_bib == null).length;
        let newBibs: number[] = [];
        if (neededCount > 0) {
          const { data: rows } = await supabase
            .from("festival_registrations")
            .select("nomor_bib")
            .not("nomor_bib", "is", null)
            .order("nomor_bib", { ascending: false, nullsFirst: false })
            .limit(10);

          let currentMax = 0;
          if (rows && rows.length > 0) {
            for (const r of rows) {
              const val = Number(r.nomor_bib);
              if (!isNaN(val) && val > currentMax) {
                currentMax = val;
              }
            }
          }

          const startBib = currentMax + 1;
          for (let i = 0; i < neededCount; i++) {
            newBibs.push(startBib + i);
          }
        }
        let bibIdx = 0;

        await Promise.all(
          groupList.map((m) => {
            const bib = m.nomor_bib != null ? m.nomor_bib : newBibs[bibIdx++];
            const qr = m.ticket_qr_code || ("FEST-2026-" + Math.random().toString(36).substring(2, 8).toUpperCase());
            return supabase
              .from("festival_registrations")
              .update({ payment_status: "verified", ticket_qr_code: qr, nomor_bib: bib })
              .eq("id", m.id);
          })
        );
      } else {
        let bib = record.nomor_bib;
        if (bib == null) {
          const { data: rows } = await supabase
            .from("festival_registrations")
            .select("nomor_bib")
            .not("nomor_bib", "is", null)
            .order("nomor_bib", { ascending: false, nullsFirst: false })
            .limit(10);

          let currentMax = 0;
          if (rows && rows.length > 0) {
            for (const r of rows) {
              const val = Number(r.nomor_bib);
              if (!isNaN(val) && val > currentMax) {
                currentMax = val;
              }
            }
          }

          bib = currentMax + 1;
        }

        const generatedQR = record.ticket_qr_code || ("FEST-2026-" + Math.random().toString(36).substring(2, 8).toUpperCase());
        const { error } = await supabase
          .from("festival_registrations")
          .update({ payment_status: "verified", ticket_qr_code: generatedQR, nomor_bib: bib })
          .eq("id", recordId);

        if (error) {
          console.error("Update failed:", error);
          alert(`Update failed: ${error.message || "Gagal memverifikasi pendaftaran"}`);
          return;
        }
      }

      // Also update central transactions if matching row exists
      try {
        await supabase
          .from("transactions")
          .update({ status: "Verified", verified_at: new Date().toISOString() })
          .or(`source_id.eq.${recordId},user_id.eq.${record.user_id}`)
          .in("sub_event_type", ["FESTIVAL", "festival"]);
      } catch (txErr) {
        console.warn("Notice syncing transactions:", txErr);
      }

      // Retrieve the promo_id associated with that group_id
      let promoId = record.promo_id || null;
      let capacityCount = 1;
      if (record.group_id) {
        const { data: gData } = await supabase
          .from("festival_registrations")
          .select("promo_id, ticket_phase")
          .eq("group_id", record.group_id);
        if (gData && gData.length > 0) {
          capacityCount = gData.length;
          const matchPromo = gData.find((r: any) => r.promo_id);
          if (matchPromo) promoId = matchPromo.promo_id;
        }
      }

      if (!promoId && record.ticket_phase) {
        const match = record.ticket_phase.match(/\[PROMO:([^:\]]+)(?::(\d+))?\]/);
        if (match) {
          promoId = match[1];
          const cap = parseInt(match[2] || "1", 10);
          if (capacityCount <= 1 && cap > 1) capacityCount = cap;
        }
      }

      // Lifecycle Rule: Quota is already held at initial submission (pending).
      // Only re-increment if the registration was previously marked as "rejected".
      if (record.payment_status?.toLowerCase() === "rejected" && promoId) {
        const { error: rpcError } = await supabase.rpc("increment_promo_quota", {
          p_promo_id: promoId,
          p_amount: capacityCount,
        });
        if (rpcError) console.error("increment_promo_quota error:", rpcError);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("promo-quota-updated", { detail: { promoId, amount: capacityCount } }));
        window.dispatchEvent(new CustomEvent("admin-refresh-data"));
      }

      await fetchRegistrations();
    } catch (err: any) {
      console.error("Update failed:", err);
      alert(`Update failed: ${err?.message || "Terjadi kesalahan tidak terduga"}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject Action
  const handleReject = async (record: FestivalRegistration) => {
    const recordId = record.id;
    if (actionInProgress) return;
    if (!confirm(`Apakah Anda yakin ingin menolak pembayaran atas nama ${record.nama_lengkap}?`)) {
      return;
    }
    setActionInProgress(recordId);

    try {
      // Any non-rejected record (pending or verified) holds quota and must be released immediately upon rejection
      const wasHoldingQuota = (record.payment_status || "").toLowerCase() !== "rejected";
      let error;
      if (record.group_id) {
        const res = await supabase
          .from("festival_registrations")
          .update({ payment_status: "rejected" })
          .eq("group_id", record.group_id);
        error = res.error;
      } else {
        const res = await supabase
          .from("festival_registrations")
          .update({ payment_status: "rejected" })
          .eq("id", recordId);
        error = res.error;
      }

      if (error) {
        console.error("Reject failed:", error);
        alert(`Gagal menolak pendaftaran: ${error.message || "Terjadi kesalahan"}`);
        return;
      }

      // Also update central transactions table
      try {
        await supabase
          .from("transactions")
          .update({ status: "Rejected" })
          .or(`source_id.eq.${recordId},user_id.eq.${record.user_id}`)
          .in("sub_event_type", ["FESTIVAL", "festival"]);
      } catch (txErr) {
        console.warn("Notice syncing transactions rejection:", txErr);
      }

      // Lifecycle Rule: Release held quota immediately on admin rejection so slot becomes available again
      if (wasHoldingQuota) {
        let promoId = record.promo_id || null;
        let capacityCount = 1;
        if (record.group_id) {
          const { data: gData } = await supabase
            .from("festival_registrations")
            .select("promo_id, ticket_phase")
            .eq("group_id", record.group_id);
          if (gData && gData.length > 0) {
            capacityCount = gData.length;
            const matchPromo = gData.find((r: any) => r.promo_id);
            if (matchPromo) promoId = matchPromo.promo_id;
          }
        }
        if (!promoId && record.ticket_phase) {
          const match = record.ticket_phase.match(/\[PROMO:([^:\]]+)(?::(\d+))?\]/);
          if (match) {
            promoId = match[1];
            const cap = parseInt(match[2] || "1", 10);
            if (capacityCount <= 1 && cap > 1) capacityCount = cap;
          }
        }
        if (promoId) {
          const { error: rpcError } = await supabase.rpc("decrement_promo_quota", {
            p_promo_id: promoId,
            p_amount: capacityCount,
          });
          if (rpcError) console.error("decrement_promo_quota error:", rpcError);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("promo-quota-updated"));
        window.dispatchEvent(new CustomEvent("admin-refresh-data"));
      }

      await fetchRegistrations();
    } catch (err: any) {
      console.error("Gagal menolak pendaftaran:", err);
      alert("Gagal menolak pendaftaran: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setActionInProgress(null);
    }
  };

  // Copy Ticket Code helper
  const handleCopyTicket = (ticket: string, id: string) => {
    navigator.clipboard.writeText(ticket);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Counts for tabs
  const counts = useMemo(() => {
    let pending = 0;
    let verified = 0;
    let rejected = 0;
    for (const r of registrations) {
      const s = (r.payment_status || "").toLowerCase();
      if (s === "pending") pending++;
      else if (s === "verified") verified++;
      else if (s === "rejected") rejected++;
    }
    return {
      all: registrations.length,
      pending,
      verified,
      rejected,
    };
  }, [registrations]);

  // Filter & Search
  const filteredData = useMemo(() => {
    return registrations.filter(r => {
      // Filter tab
      if (filter !== "all") {
        const s = (r.payment_status || "").toLowerCase();
        if (s !== filter) return false;
      }
      // Search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.nama_lengkap || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.whatsapp || "").toLowerCase().includes(q) ||
        (r.rekening_pengirim || "").toLowerCase().includes(q) ||
        (r.ticket_qr_code || "").toLowerCase().includes(q) ||
        formatBIB(r.nomor_bib).toLowerCase().includes(q) ||
        String(r.nomor_bib || "").toLowerCase().includes(q)
      );
    });
  }, [registrations, filter, search]);

  // Excel-safe CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Nomor BIB",
      "Nama Lengkap",
      "Email",
      "WhatsApp",
      "Rekening Pengirim",
      "Kategori",
      "Departemen",
      "NRP",
      "Status Pembayaran",
      "Nominal (IDR)",
      "Fase Tiket",
      "Tiket QR Code",
      "Jumlah Scan",
      "Group ID",
      "Tipe Peserta",
      "Waktu Daftar",
    ];

    const rows = filteredData.map(r => [
      formatBIBCSV(r.nomor_bib),
      r.nama_lengkap || "-",
      r.email || "-",
      r.whatsapp || "-",
      r.rekening_pengirim || "-",
      r.kategori_peserta || "-",
      r.departemen || "-",
      r.nrp || "-",
      r.payment_status || "-",
      r.amount_paid || 0,
      r.ticket_phase || "-",
      r.ticket_qr_code || "-",
      r.scan_count || 0,
      r.group_id || "-",
      r.is_primary === false ? "Anggota Group" : "Utama",
      formatDisplayWIB(r.created_at),
    ]);

    downloadCSV(`festival_registrations_${new Date().toISOString().split("T")[0]}`, headers, rows);
  };

  return (
    <section className="bg-surface/50 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col overflow-hidden relative shadow-2xl">
      {/* Top Header Controls */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-surface/60">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
            Festival Database &amp; Verification Center
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Live Supabase
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Data registrasi langsung dari tabel <code className="font-mono text-secondary">festival_registrations</code>
          </p>
        </div>

        {/* Action controls: Refresh & Search */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchRegistrations}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 text-secondary ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV / Excel Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-secondary/15 hover:bg-secondary/25 border border-secondary/30 rounded-xl text-xs font-semibold text-secondary transition-all cursor-pointer disabled:opacity-50"
            title="Download CSV / Excel (Preserves 4-digit BIB)"
          >
            <Download className="w-3.5 h-3.5 text-secondary" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, WhatsApp, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-xl text-xs text-on-surface focus:border-secondary outline-none transition-all w-full sm:w-64 font-poppins"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b border-white/10 bg-surface/30 flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-on-surface-variant mr-1" />
          {(["all", "pending", "verified", "rejected"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer capitalize ${
                filter === tab
                  ? "bg-secondary text-on-secondary font-semibold shadow-[0_0_12px_rgba(240,192,77,0.3)]"
                  : "bg-surface-container/50 text-on-surface-variant hover:text-white hover:bg-surface-container"
              }`}
            >
              <span>{tab === "all" ? "Semua" : tab}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filter === tab ? "bg-black/20 text-black font-bold" : "bg-white/10 text-white"
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-on-surface-variant font-mono whitespace-nowrap">
          Menampilkan {filteredData.length} data
        </span>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="m-4 p-3 bg-error-container/40 border border-error/50 rounded-xl text-error text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap font-poppins">
          <thead>
            <tr className="bg-surface-container-low/60 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-white/10">
              <th className="p-4 py-3 font-semibold">Nomor BIB</th>
              <th className="p-4 py-3 font-semibold">Nama Lengkap &amp; Email</th>
              <th className="p-4 py-3 font-semibold">Nomor WhatsApp</th>
              <th className="p-4 py-3 font-semibold">Rekening Pengirim</th>
              <th className="p-4 py-3 font-semibold">Nominal &amp; Fase</th>
              <th className="p-4 py-3 font-semibold">Bukti Transfer</th>
              <th className="p-4 py-3 font-semibold">Status</th>
              <th className="p-4 py-3 font-semibold">Tiket QR Code</th>
              <th className="p-4 py-3 font-semibold">Waktu Daftar</th>
              <th className="p-4 py-3 font-semibold text-right sticky right-0 bg-surface-container-low/95 backdrop-blur-md">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {loading && registrations.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RotateCw className="w-6 h-6 text-secondary animate-spin" />
                    <span className="text-xs">Memuat database festival...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-medium text-white">Tidak ada data pendaftaran ditemukan</p>
                    <p className="text-xs text-on-surface-variant/70">
                      {search ? "Coba ubah kata kunci pencarian Anda." : "Belum ada pendaftaran di tabel festival_registrations."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map(row => {
                const s = (row.payment_status || "").toLowerCase();
                const isPending = s === "pending";
                const isVerified = s === "verified";
                const isRejected = s === "rejected";

                return (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-surface-variant/30 transition-colors">
                    
                    {/* 0. Nomor BIB (Global 4-digit zero padding) */}
                    <td className="p-4 py-3">
                      <div className="flex flex-col gap-1">
                        {row.nomor_bib != null ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-secondary bg-secondary/10 border border-secondary/25 px-2.5 py-1 rounded w-fit">
                            #{formatBIB(row.nomor_bib)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-on-surface-variant/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded w-fit">
                            -
                          </span>
                        )}
                        {row.is_primary === false && (
                          <span className="text-[10px] font-sans font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded w-fit">
                            Anggota
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 1. Nama Lengkap & Email */}
                    <td className="p-4 py-3 font-medium text-white">
                      <div>
                        <span className="block text-sm">{row.nama_lengkap || "-"}</span>
                        <span className="block text-[11px] text-on-surface-variant/70 font-mono">
                          {row.email || "-"}
                        </span>
                      </div>
                    </td>

                    {/* 2. WhatsApp */}
                    <td className="p-4 py-3 text-xs font-mono text-on-surface-variant">
                      {row.whatsapp ? (
                        <a
                          href={`https://wa.me/${row.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-secondary hover:underline transition-colors"
                          title="Hubungi via WhatsApp"
                        >
                          {row.whatsapp}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* 3. Rekening Pengirim */}
                    <td className="p-4 py-3 text-xs font-mono text-on-surface">
                      {row.rekening_pengirim ? (
                        <span className="truncate max-w-[180px] block" title={row.rekening_pengirim}>
                          a.n {row.rekening_pengirim}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/50">-</span>
                      )}
                    </td>

                    {/* 3b. Nominal & Fase */}
                    <td className="p-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-semibold text-[#ffd700]">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(row.amount_paid || 0)}
                        </span>
                        {row.ticket_phase && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30 w-fit">
                            {row.ticket_phase.replace(/\s*\[PROMO:.*\]/, "")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Bukti Transfer */}
                    <td className="p-4 py-3">
                      {row.bukti_transfer_url ? (
                        <a
                          href={row.bukti_transfer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-highest/60 hover:bg-secondary/20 text-on-surface hover:text-secondary border border-white/10 hover:border-secondary/40 text-xs font-medium transition-all w-fit"
                          title="Buka Bukti Transfer di Tab Baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Lihat Bukti</span>
                        </a>
                      ) : (
                        <span className="text-on-surface-variant/50 text-xs">-</span>
                      )}
                    </td>

                    {/* 5. Status */}
                    <td className="p-4 py-3">
                      {isVerified && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/15 text-tertiary border border-tertiary/30">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Pending</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error/15 text-error border border-error/30">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {!isVerified && !isPending && !isRejected && (
                        <span className="text-xs text-on-surface-variant font-mono">
                          {row.payment_status || "-"}
                        </span>
                      )}
                    </td>

                    {/* 6. Tiket QR Code (if verified) */}
                    <td className="p-4 py-3">
                      {row.ticket_qr_code ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQrModalRecord(row)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-secondary bg-secondary/15 hover:bg-secondary/25 border border-secondary/30 hover:border-secondary px-2.5 py-1 rounded-md transition-all cursor-pointer group"
                            title="Klik untuk melihat Visual QR Code & Status Scan"
                          >
                            <QrCode className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span>{row.ticket_qr_code}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyTicket(row.ticket_qr_code!, row.id)}
                            className="p-1 text-on-surface-variant hover:text-white transition-colors cursor-pointer rounded"
                            title="Salin Kode Tiket"
                          >
                            {copiedId === row.id ? (
                              <Check className="w-3.5 h-3.5 text-tertiary" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/50 text-xs">-</span>
                      )}
                    </td>

                    {/* 7. Waktu Daftar */}
                    <td className="p-4 py-3 text-xs text-on-surface-variant font-mono">
                      {formatDisplayWIB(row.created_at)}
                    </td>

                    {/* 8. Aksi (Verify / Reject for Pending) */}
                    <td className="p-4 py-3 text-right sticky right-0 bg-surface/90 backdrop-blur-md border-l border-white/5">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          {/* Approve (Verify) Button */}
                          <button
                            type="button"
                            disabled={actionInProgress === row.id}
                            onClick={() => handleVerify(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tertiary/20 hover:bg-tertiary text-tertiary hover:text-tertiary-container text-xs font-semibold transition-all border border-tertiary/30 cursor-pointer disabled:opacity-50"
                            title="Verifikasi Pembayaran & Terbitkan Tiket"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </button>

                          {/* Reject Button */}
                          <button
                            type="button"
                            disabled={actionInProgress === row.id}
                            onClick={() => handleReject(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/15 hover:bg-error text-error hover:text-white text-xs font-semibold transition-all border border-error/30 cursor-pointer disabled:opacity-50"
                            title="Tolak Pembayaran"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant/40 font-mono">
                          Tervalidasi
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADMIN MODAL: VISUAL QR CODE & SCAN TRACKING ── */}
      {qrModalRecord && qrModalRecord.ticket_qr_code && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setQrModalRecord(null)}
        >
          <div 
            className="bg-[#0c1024]/95 border border-white/20 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setQrModalRecord(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
                E-Tiket Festival VOITSFEST 2026
              </span>
              <span className="font-mono text-xs font-bold text-secondary bg-secondary/10 border border-secondary/30 px-2.5 py-0.5 rounded-full">
                BIB: {qrModalRecord.nomor_bib != null ? `#${formatBIB(qrModalRecord.nomor_bib)}` : "Menunggu Verifikasi"}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-0.5">
              {qrModalRecord.nama_lengkap}
            </h3>
            <p className="text-xs text-on-surface-variant mb-2 font-mono">
              {qrModalRecord.email} • {qrModalRecord.whatsapp}
            </p>

            {/* Dynamic Amount & Phase Badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="font-mono text-sm font-semibold text-[#ffd700]">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(qrModalRecord.amount_paid || 0)}
              </span>
              {qrModalRecord.ticket_phase && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
                  {qrModalRecord.ticket_phase}
                </span>
              )}
            </div>

            {/* Visual QR Code Container */}
            <div className="bg-white p-3.5 rounded-2xl shadow-2xl border border-white/30 mb-4 flex items-center justify-center">
              <QRCodeSVG 
                value={qrModalRecord.ticket_qr_code} 
                size={180} 
                level="H" 
                includeMargin={true} 
              />
            </div>

            {/* String Code Beneath QR Code */}
            <div className="flex items-center gap-2 bg-surface-container-highest/60 border border-white/15 px-3.5 py-1.5 rounded-lg mb-4">
              <span className="font-mono text-sm font-bold text-secondary tracking-wider">
                {qrModalRecord.ticket_qr_code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyTicket(qrModalRecord.ticket_qr_code!, "modal")}
                className="p-1 text-on-surface-variant hover:text-white transition-colors cursor-pointer rounded"
                title="Salin Kode Tiket"
              >
                {copiedId === "modal" ? (
                  <Check className="w-3.5 h-3.5 text-tertiary" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Scan Status Badge (scan_count) */}
            <div className="w-full flex flex-col items-center gap-2 pt-3 border-t border-white/10">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Status Pemindaian Keamanan Gate
              </span>
              {(qrModalRecord.scan_count ?? 0) === 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Belum Di-scan (0)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Sudah Di-scan {qrModalRecord.scan_count}x</span>
                </div>
              )}

              {qrModalRecord.last_scanned_at && (
                <p className="text-[11px] font-mono text-on-surface-variant/80 mt-1">
                  Terakhir: {formatDisplayWIB(qrModalRecord.last_scanned_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
