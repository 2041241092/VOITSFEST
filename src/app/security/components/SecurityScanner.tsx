"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { 
  Shield, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  QrCode, 
  History, 
  Camera, 
  CameraOff, 
  RotateCcw, 
  Loader2,
  ArrowRight,
  Clock,
  X,
  Users
} from "lucide-react";
import { 
  verifyTicket, 
  getRecentScans, 
  getTicketMetrics, 
  VerificationResult, 
  RecentScanItem, 
  TicketMetrics 
} from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";
import { formatBIB } from "@/lib/bib";
import { formatDisplayWIB } from "@/lib/timeUtils";
import SecurityHeader from "./SecurityHeader";

interface SecurityScannerProps {
  guardName: string;
  guardEmail: string;
  role: string;
}

const SESSION_SCANS_KEY = "voitsfest_security_recent_scans";

function getStoredScans(): RecentScanItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_SCANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredScans(scans: RecentScanItem[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_SCANS_KEY, JSON.stringify(scans.slice(0, 50)));
  } catch (e) {
    console.error("Error saving scans to session storage:", e);
  }
}

function formatKategoriPeserta(ticket?: VerificationResult["ticket"]): string {
  if (!ticket) return "-";
  const kat = ticket.kategoriPeserta || "Umum";
  const isMhs = kat.toLowerCase().includes("mahasiswa");
  if (isMhs) {
    const details: string[] = [];
    if (ticket.departemen) details.push(ticket.departemen);
    if (ticket.nrp) details.push(`NRP: ${ticket.nrp}`);
    if (details.length > 0) {
      return `${kat} (${details.join(" • ")})`;
    }
    return kat;
  }
  return kat;
}

function formatNilaiTransaksi(amount?: number): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return "-";
  return formatDisplayWIB(isoString);
}

export default function SecurityScanner({
  guardName,
  guardEmail,
  role,
}: SecurityScannerProps) {
  const [activeTab, setActiveTab] = useState<"scanner" | "lookup" | "history">("scanner");
  const [manualToken, setManualToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [metrics, setMetrics] = useState<TicketMetrics>({ total: 0, valid: 0, scanned: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Camera scanner states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const html5QrCodeRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load metrics & recent scans on mount and listen to realtime updates
  useEffect(() => {
    loadRecentScans();
    loadMetrics();

    const channel = supabase
      .channel("security-scanner-live-scans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colorfun_registrations" },
        () => {
          loadRecentScans();
          loadMetrics();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_registrations" },
        () => {
          loadRecentScans();
          loadMetrics();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          loadRecentScans();
          loadMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const loadMetrics = async () => {
    try {
      const m = await getTicketMetrics();
      setMetrics(m);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    }
  };

  const loadRecentScans = async () => {
    try {
      const dbScans = await getRecentScans(40);
      const sessionScans = getStoredScans();

      const map = new Map<string, RecentScanItem>();

      // Load session scans first
      for (const s of sessionScans) {
        const key = (s.token || s.id || "").toLowerCase();
        if (key) map.set(key, s);
      }

      // Merge DB scans
      for (const d of dbScans) {
        const key = (d.token || d.id || "").toLowerCase();
        if (key) {
          const existing = map.get(key);
          if (existing) {
            map.set(key, { ...existing, ...d, status: existing.status || d.status });
          } else {
            map.set(key, d);
          }
        }
      }

      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime());
      setRecentScans(merged);
      saveStoredScans(merged);
    } catch (err) {
      console.error("Failed to load recent scans:", err);
    }
  };

  // Initialize and list cameras
  useEffect(() => {
    let mounted = true;

    async function initCameras() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("belakang") ||
            d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError("Tidak ada kamera yang terdeteksi pada perangkat ini.");
        }
      } catch (err: any) {
        console.error("Error accessing camera list:", err);
        if (mounted) {
          setCameraError("Izin kamera diperlukan untuk memindai tiket.");
        }
      }
    }

    if (activeTab === "scanner") {
      initCameras();
    }

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  // Start / Stop camera scanner
  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      if (activeTab !== "scanner" || !selectedCameraId || result !== null) {
        return;
      }

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        
        // Cleanup existing instance if any
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
          } catch {}
          html5QrCodeRef.current = null;
        }

        const scanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isScanningRef.current && mounted) {
              isScanningRef.current = true;
              handleVerify(decodedText);
            }
          },
          () => {
            // Ignore scan parse errors per frame
          }
        );

        if (mounted) {
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err: any) {
        console.error("Camera start failed:", err);
        if (mounted) {
          setCameraActive(false);
          setCameraError(err?.message || "Gagal menyalakan video feed kamera.");
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {});
        } catch {}
      }
    };
  }, [activeTab, selectedCameraId, result]);

  // Handle Ticket Verification
  const handleVerify = async (tokenToVerify: string) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken || isVerifying) return;

    setIsVerifying(true);

    // Stop current camera scanning frame
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.pause();
      } catch {}
    }

    try {
      const res = await verifyTicket(cleanToken);

      // Handle Unknown QR outside the database:
      // Show standard, subtle toast/alert without modal and without logging into metric/history tables
      if (res.status === "not_found" || res.status === "error") {
        showToast(res.message || "Data tidak ditemukan");
        setManualToken("");
        // Resume camera after a short pause so guard can scan the next attendee
        setTimeout(() => {
          isScanningRef.current = false;
          if (html5QrCodeRef.current && activeTab === "scanner") {
            try {
              html5QrCodeRef.current.resume();
            } catch {}
          }
        }, 1500);
        return;
      }

      // Valid or Scanned (Two primary states): Render persistent modal
      setResult(res);
      setManualToken("");

      // Record this scan in persistent session history
      const now = new Date().toISOString();
      const newScanItem: RecentScanItem = {
        id: res.ticket?.id || `scan-${Date.now()}-${cleanToken}`,
        token: res.ticket?.token || cleanToken,
        eventType: res.ticket?.eventType || "VOITSFEST",
        scanCount: res.ticket?.scanCount ?? 1,
        scannedAt: now,
        firstScannedAt: res.ticket?.firstScannedAt || now,
        participantName: res.ticket?.participantName || "Peserta",
        participantEmail: res.ticket?.participantEmail,
        nomorBib: res.ticket?.nomorBib ?? null,
        kategoriPeserta: res.ticket?.kategoriPeserta ?? null,
        departemen: res.ticket?.departemen ?? null,
        nrp: res.ticket?.nrp ?? null,
        amount: res.ticket?.amount ?? 0,
        ticketPhase: res.ticket?.ticketPhase ?? null,
        status: res.status === "valid" ? "valid" : "scanned",
      };

      setRecentScans((prev) => {
        const filtered = prev.filter(
          (p) => p.token.toLowerCase() !== newScanItem.token.toLowerCase() && p.id !== newScanItem.id
        );
        const updated = [newScanItem, ...filtered];
        saveStoredScans(updated);
        return updated;
      });

      // Background sync from database & refresh metrics
      loadRecentScans();
      loadMetrics();
    } catch (err) {
      console.error("Verification failed:", err);
      showToast("Gagal memverifikasi tiket. Silakan periksa koneksi.");
      setTimeout(() => {
        isScanningRef.current = false;
        if (html5QrCodeRef.current && activeTab === "scanner") {
          try {
            html5QrCodeRef.current.resume();
          } catch {}
        }
      }, 1500);
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset overlay & resume scanner (Strictly manual dismissal)
  const resetForNextScan = (targetTab?: "scanner" | "lookup" | "history") => {
    setResult(null);
    isScanningRef.current = false;

    if (targetTab) {
      setActiveTab(targetTab);
    }

    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.resume();
      } catch {}
    }
  };

  // Interactive History Row Click: Re-open detailed modal
  const handleOpenHistoryDetail = (item: RecentScanItem) => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.pause();
      } catch {}
    }
    isScanningRef.current = true;

    setResult({
      status: item.status,
      message:
        item.status === "valid"
          ? "Check-in Berhasil"
          : "Tiket Sudah Check-in Sebelumnya",
      token: item.token,
      ticket: {
        id: item.id,
        token: item.token,
        eventType: item.eventType,
        participantName: item.participantName,
        participantEmail: item.participantEmail,
        amount: item.amount,
        ticketPhase: item.ticketPhase || "",
        scanCount: item.scanCount,
        scannedAt: item.scannedAt || undefined,
        firstScannedAt: item.firstScannedAt || item.scannedAt || undefined,
        nomorBib: item.nomorBib,
        kategoriPeserta: item.kategoriPeserta,
        departemen: item.departemen,
        nrp: item.nrp,
        isCheckedIn: true,
      },
    });
  };

  // Filtered scans for History tab
  const filteredScans = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return recentScans;
    return recentScans.filter((item) => {
      const bibStr = formatBIB(item.nomorBib).toLowerCase();
      const name = (item.participantName || "").toLowerCase();
      const token = (item.token || "").toLowerCase();
      const kat = (item.kategoriPeserta || "").toLowerCase();
      return bibStr.includes(q) || name.includes(q) || token.includes(q) || kat.includes(q);
    });
  }, [recentScans, historySearch]);

  return (
    <div 
      className="min-h-screen overflow-x-hidden antialiased text-on-surface font-poppins pb-24 flex flex-col relative selection:bg-secondary selection:text-primary-container"
      style={{
        backgroundColor: "#0b1026",
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(46, 78, 143, 0.15) 0%, rgba(11, 16, 38, 1) 70%)",
        backgroundAttachment: "fixed"
      }}
    >
      {/* 3-Section Clean Header strictly mirroring Admin Central */}
      <SecurityHeader
        guardName={guardName}
        guardEmail={guardEmail}
        role={role}
      />

      {/* Subtle Toast / Alert Notification (for Unknown QR outside database) */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="bg-[#0e1530]/95 text-rose-300 border border-rose-500/40 px-4 py-2.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-1 text-on-surface-variant hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Scanner Body */}
      <main className="flex-grow pt-4 pb-24 px-4 max-w-2xl mx-auto w-full flex flex-col items-center justify-start relative">
        
        {/* ── 1. METRIC STAT CARDS SIMPLIFICATION (Strictly 3 Primary Cards) ── */}
        <div className="w-full max-w-md grid grid-cols-3 gap-2.5 mb-5">
          {/* Total */}
          <div className="bg-surface-container-high/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Total
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {metrics.total}
            </span>
            <span className="text-[9px] sm:text-[10px] text-on-surface-variant/70 mt-0.5">
              Tiket Terdaftar
            </span>
          </div>

          {/* Valid (Belum Check-In / Ready for first scan) */}
          <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Valid
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {metrics.valid}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-400/80 mt-0.5">
              Belum Check-in
            </span>
          </div>

          {/* Scanned (Already Checked In) */}
          <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Scanned
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-0.5">
              {metrics.scanned}
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-400/80 mt-0.5">
              Sudah Check-in
            </span>
          </div>
        </div>

        {/* Tab 1: SCANNER */}
        {activeTab === "scanner" && (
          <div className="flex flex-col items-center justify-center w-full">
            
            {/* Outer Viewport Container (Kotak Besar di Luar) */}
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center shadow-[0_0_35px_rgba(0,0,0,0.7)]">
              
              {/* Live HTML5 QR Reader Target / Video Feed */}
              <div 
                id="qr-reader" 
                className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
              />

              {/* Scanning Reticle / Target Area (Kotak Kecil di Dalam) */}
              {!result && !cameraError && (
                <div className="absolute inset-0 m-auto w-64 h-64 border-2 border-emerald-500/80 rounded-xl pointer-events-none overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                  {/* Corner Guide Markers */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm pointer-events-none" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-sm pointer-events-none" />

                  {/* Subtle Laser Scanner Line Animation */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_rgba(52,211,153,0.8)] scanner-line opacity-80 pointer-events-none" />
                </div>
              )}

              {/* Camera Error Message if any */}
              {cameraError && (
                <div className="absolute inset-0 z-10 bg-[#0B1026]/95 p-6 flex flex-col items-center justify-center text-center">
                  <CameraOff className="w-12 h-12 text-error mb-3" />
                  <p className="text-sm text-error font-medium mb-4">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab("lookup")}
                    className="px-4 py-2 rounded-xl bg-secondary text-primary-container text-xs font-bold uppercase tracking-wider hover:bg-secondary/90 transition-all cursor-pointer"
                  >
                    Gunakan Input Manual
                  </button>
                </div>
              )}
            </div>

            {/* Guidance Bubble Box (Di Bagian Bawah Luar Kotak Besar) */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-gray-300 text-xs font-medium shadow-sm">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arahkan QR Code Ticket</span>
            </div>

            {/* Camera Selector (if multiple cameras available) */}
            {cameras.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-on-surface-variant" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="bg-surface-container-high text-on-surface border border-white/15 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${c.id.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Manual Token Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(manualToken);
              }}
              className="w-full max-w-md mt-4"
            >
              <div className="rounded-2xl flex items-center px-4 py-2.5 border border-white/15 bg-surface-container-high/80 backdrop-blur-md focus-within:border-secondary transition-all shadow-lg">
                <Search className="w-5 h-5 text-on-surface-variant mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Ketik Token Manual (e.g. vts-xxxx-xxx)..."
                  className="bg-transparent border-none focus:ring-0 text-white w-full text-sm font-mono placeholder:text-on-surface-variant/60 outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualToken.trim() || isVerifying}
                  className="ml-2 px-3 py-1.5 rounded-xl bg-secondary text-primary-container text-xs font-bold uppercase hover:bg-secondary/90 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Cek"}
                </button>
              </div>
            </form>

            {/* Helper Caption */}
            <p className="text-xs text-on-surface-variant/70 text-center mt-3 font-poppins">
              Sistem otomatis mendeteksi status tiket: VALID (Check-in baru) atau SCANNED (Sudah Check-in).
            </p>
          </div>
        )}

        {/* Tab 2: MANUAL LOOKUP */}
        {activeTab === "lookup" && (
          <div className="w-full max-w-md mt-2 flex flex-col gap-6">
            <div className="bg-surface-container-high/50 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Search className="w-5 h-5 text-secondary" />
                Pemeriksaan Token Manual
              </h2>
              <p className="text-xs text-on-surface-variant mb-6">
                Masukkan token tiket untuk memverifikasi status tiket pengunjung.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify(manualToken);
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">
                    Kode Token Tiket
                  </label>
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Contoh: vts-9x8-11a"
                    autoFocus
                    className="w-full bg-surface-container-lowest border border-white/20 rounded-xl px-4 py-3 text-base font-mono text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualToken.trim() || isVerifying}
                  className="w-full py-3.5 rounded-xl bg-secondary text-primary-container font-bold text-sm uppercase tracking-wider hover:bg-secondary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Database...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Verifikasi Tiket Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: RECENT SCANS / HISTORY */}
        {activeTab === "history" && (
          <div className="w-full max-w-xl mt-1 flex flex-col gap-4">
            {/* Header & Refresh */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-secondary" />
                  Riwayat Pemindaian Gate
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Klik baris riwayat untuk melihat rincian lengkap tiket.
                </p>
              </div>
              <button
                onClick={() => {
                  loadRecentScans();
                  loadMetrics();
                }}
                className="text-xs text-secondary hover:underline flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Segarkan
              </button>
            </div>

            {/* Search Filter Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari berdasarkan Nama, Nomor BIB, atau Token..."
                className="w-full bg-surface-container-high/60 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-on-surface-variant/60 focus:outline-none focus:border-secondary transition-all"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scans List (Contains ONLY Valid or Scanned tickets from Database) */}
            {filteredScans.length === 0 ? (
              <div className="bg-surface-container-high/40 border border-white/10 rounded-2xl p-8 text-center text-on-surface-variant text-sm">
                {historySearch ? "Tidak ada riwayat yang cocok dengan pencarian." : "Belum ada data scan pada sesi ini."}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredScans.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenHistoryDetail(item)}
                    className="group bg-surface-container-high/60 hover:bg-surface-container-high/90 backdrop-blur-md border border-white/10 hover:border-secondary/50 rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01]"
                    title="Klik untuk membuka detail tiket"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.status === "valid"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}>
                        {item.status === "valid" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>

                      {/* Info Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white leading-tight truncate">
                            {item.participantName}
                          </p>
                          {item.nomorBib && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-[#ffd700] border border-yellow-500/30">
                              BIB {formatBIB(item.nomorBib)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-on-surface-variant truncate max-w-[130px] sm:max-w-[200px]">
                            {item.token}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            item.status === "valid"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {item.status === "valid" ? "Valid" : "Scanned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side Event & Timestamp */}
                    <div className="text-right flex flex-col items-end flex-shrink-0 ml-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                        {item.eventType}
                      </span>
                      <p className="text-[10px] text-on-surface-variant mt-1 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-on-surface-variant/70" />
                        {formatDisplayWIB(item.scannedAt)}
                      </p>
                      <span className="text-[10px] text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mt-0.5">
                        Detail <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 2. SCANNER STATUS LOGIC & MODAL BADGING (Two Primary States) ── */}
        {result && (result.status === "valid" || result.status === "scanned") && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div 
              className={`relative w-full max-w-lg bg-[#0E1530] border rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col text-left animate-in zoom-in-95 duration-200 ${
                result.status === "valid"
                  ? "border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.25)]"
                  : "border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.25)]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Manual close X icon */}
              <button
                type="button"
                onClick={() => resetForNextScan()}
                className="absolute top-4 right-4 p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Banner with Primary State Badging */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 border-2 ${
                  result.status === "valid"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                    : "bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                }`}>
                  {result.status === "valid" ? (
                    <CheckCircle2 className="w-9 h-9" />
                  ) : (
                    <AlertTriangle className="w-9 h-9" />
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                  {result.status === "valid"
                    ? "VALID - AKSES DITERIMA"
                    : "TIKET SUDAH CHECK-IN"}
                </h2>

                {result.status === "valid" ? (
                  <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                    Check-in Pertama Berhasil • Akses Diberikan
                  </p>
                ) : (
                  <p className="text-xs text-amber-400 font-medium mt-0.5">
                    Tiket Pernah Digunakan Sebelumnya
                  </p>
                )}

                {/* Show timestamp of prior scan if already checked in */}
                {result.status === "scanned" && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Waktu Check-in Sebelumnya: {formatTimestamp(result.ticket?.firstScannedAt)}</span>
                  </div>
                )}
              </div>

              {/* Strictly Display Data: 7 Required Fields */}
              <div className="w-full bg-[#141C3B]/90 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10 my-2 text-xs sm:text-sm shadow-inner">
                
                {/* 1. Status Tiket (Prominent Valid / Already Checked In Badge) */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02]">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status Tiket</span>
                  <div>
                    {result.status === "valid" ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        VALID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        SCANNED / ALREADY CHECKED IN
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Nomor BIB */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nomor BIB</span>
                  <span className="font-mono text-base sm:text-lg font-black text-[#ffd700] tracking-widest">
                    {formatBIB(result.ticket?.nomorBib)}
                  </span>
                </div>

                {/* 3. Nama Lengkap */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nama Lengkap</span>
                  <span className="text-sm font-bold text-white text-right">
                    {result.ticket?.participantName || "Peserta"}
                  </span>
                </div>

                {/* 4. Event / Kategori */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Event / Kategori</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 text-right">
                    {result.ticket?.eventType || "VOITSFEST"}
                  </span>
                </div>

                {/* 5. Kategori Peserta */}
                <div className="flex items-start justify-between px-4 py-3 gap-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex-shrink-0">Kategori Peserta</span>
                  <span className="text-xs font-medium text-white text-right leading-relaxed">
                    {formatKategoriPeserta(result.ticket)}
                  </span>
                </div>

                {/* 6. Token Tiket */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Token Tiket</span>
                  <span className="font-mono text-xs font-bold text-white/90 bg-black/40 px-2 py-1 rounded border border-white/10 select-all text-right break-all">
                    {result.ticket?.token || result.token || "-"}
                  </span>
                </div>

                {/* 7. Nilai Transaksi */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nilai Transaksi</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                    {formatNilaiTransaksi(result.ticket?.amount)}
                  </span>
                </div>
              </div>

              {/* Manual Dismissal Buttons (Persistent Modal, NO Auto-Close) */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => resetForNextScan()}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/20 text-center"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => resetForNextScan("scanner")}
                  className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg text-center flex items-center justify-center gap-2 ${
                    result.status === "valid"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                  }`}
                >
                  <span>Scan Tiket Berikutnya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-30 flex justify-around items-center px-4 pb-4 pt-2.5 bg-[#0B1026]/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_25px_rgba(0,0,0,0.5)] rounded-t-2xl">
        {/* SCANNER */}
        <button
          type="button"
          onClick={() => setActiveTab("scanner")}
          className={`flex flex-col items-center justify-center px-5 py-1.5 rounded-full transition-all cursor-pointer ${
            activeTab === "scanner"
              ? "bg-secondary-container text-on-secondary-container shadow-[0_0_15px_rgba(176,198,255,0.3)] scale-105"
              : "text-on-surface-variant hover:text-white"
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider">SCANNER</span>
        </button>

        {/* MANUAL LOOKUP */}
        <button
          type="button"
          onClick={() => setActiveTab("lookup")}
          className={`flex flex-col items-center justify-center px-5 py-1.5 rounded-full transition-all cursor-pointer ${
            activeTab === "lookup"
              ? "bg-secondary-container text-on-secondary-container shadow-[0_0_15px_rgba(176,198,255,0.3)] scale-105"
              : "text-on-surface-variant hover:text-white"
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider">LOOKUP</span>
        </button>

        {/* HISTORY */}
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center px-5 py-1.5 rounded-full transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-secondary-container text-on-secondary-container shadow-[0_0_15px_rgba(176,198,255,0.3)] scale-105"
              : "text-on-surface-variant hover:text-white"
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider">RIWAYAT</span>
        </button>
      </nav>
    </div>
  );
}
