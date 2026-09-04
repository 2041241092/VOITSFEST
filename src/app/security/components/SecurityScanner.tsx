"use client";

import { useEffect, useRef, useState } from "react";
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
  LogOut, 
  Loader2,
  ArrowRight,
  User,
  Clock,
  Sparkles
} from "lucide-react";
import { verifyTicket, getRecentScans, VerificationResult } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";

interface SecurityScannerProps {
  guardName: string;
  guardEmail: string;
  role: string;
}

type RecentScanItem = {
  id: string;
  token: string;
  eventType: string;
  scanCount: number;
  scannedAt: string | null;
  participantName: string;
};

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
  const [countdown, setCountdown] = useState<number | null>(null);

  // Camera scanner states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const html5QrCodeRef = useRef<any>(null);
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef(false);

  const supabase = createClient();

  // Load recent scans on mount and listen to realtime updates
  useEffect(() => {
    loadRecentScans();

    const channel = supabase
      .channel("security-scanner-live-scans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colorfun_registrations" },
        () => {
          loadRecentScans();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_registrations" },
        () => {
          loadRecentScans();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          loadRecentScans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const loadRecentScans = async () => {
    try {
      const data = await getRecentScans(15);
      setRecentScans(data);
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
      setResult(res);
      setManualToken("");
      loadRecentScans();

      // Setup 3-second auto-reset for valid scan
      if (res.status === "valid") {
        setCountdown(3);
        let currentSeconds = 3;

        countdownIntervalRef.current = setInterval(() => {
          currentSeconds -= 1;
          setCountdown(currentSeconds);
          if (currentSeconds <= 0) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            resetForNextScan();
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setResult({
        status: "error",
        message: "Gagal memverifikasi tiket. Silakan periksa koneksi server.",
        token: cleanToken,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset overlay & resume scanner
  const resetForNextScan = () => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setCountdown(null);
    setResult(null);
    isScanningRef.current = false;

    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.resume();
      } catch {}
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1026] text-on-surface flex flex-col relative overflow-x-hidden font-poppins selection:bg-secondary selection:text-primary-container">
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-40 flex justify-between items-center px-4 md:px-8 h-18 bg-[#0B1026]/85 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary shadow-[0_0_15px_rgba(176,198,255,0.25)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
              VOITSFEST <span className="text-secondary font-mono text-xs px-2 py-0.5 rounded bg-secondary/15 border border-secondary/30">GATE SCANNER</span>
            </h1>
            <p className="text-[11px] text-on-surface-variant hidden sm:block">Fakultas Vokasi ITS • Security Checkpoint</p>
          </div>
        </div>

        {/* Officer info and working logout */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{guardName}</p>
            <p className="text-[10px] text-secondary uppercase tracking-widest">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar / Logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error/10 hover:bg-error/20 border border-error/30 text-error text-xs font-medium transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Scanner Body */}
      <main className="flex-grow pt-4 pb-24 px-4 max-w-2xl mx-auto w-full flex flex-col items-center justify-start relative">
        
        {/* Tab 1: SCANNER */}
        {activeTab === "scanner" && (
          <div className="w-full flex flex-col items-center">
            
            {/* Camera Viewport Container */}
            <div className="relative w-full max-w-sm aspect-square border-2 border-white/20 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center mt-2 bg-surface-container-lowest">
              
              {/* HTML5 QR Reader Target */}
              <div 
                id="qr-reader" 
                className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
              />

              {/* Scanning Reticle Overlay (Visual Targeting) */}
              {!result && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Outer Targeting Frame */}
                  <div className="relative w-56 h-56 border-2 border-white/25 rounded-2xl">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-secondary rounded-tl-xl"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-secondary rounded-tr-xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-secondary rounded-bl-xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-secondary rounded-br-xl"></div>

                    {/* Laser Scanner Line */}
                    <div className="absolute inset-0 w-full h-[3px] scanner-line opacity-80"></div>
                  </div>

                  <p className="mt-4 text-[12px] font-mono tracking-widest text-on-surface-variant uppercase bg-black/60 px-3 py-1 rounded-full border border-white/10">
                    Arahkan QR Code Tiket
                  </p>
                </div>
              )}

              {/* Camera Error Message if any */}
              {cameraError && (
                <div className="absolute inset-0 bg-[#0B1026]/90 p-6 flex flex-col items-center justify-center text-center">
                  <CameraOff className="w-12 h-12 text-error mb-3" />
                  <p className="text-sm text-error font-medium mb-4">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab("lookup")}
                    className="px-4 py-2 rounded-xl bg-secondary text-primary-container text-xs font-bold uppercase tracking-wider hover:bg-secondary/90 transition-all"
                  >
                    Gunakan Input Manual
                  </button>
                </div>
              )}
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
              className="w-full max-w-sm mt-6"
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

            {/* Instructions */}
            <p className="text-xs text-on-surface-variant/70 text-center mt-3 font-poppins">
              Sistem Anti-Scan Ganda otomatis memvalidasi keaslian &amp; status scan tiket.
            </p>
          </div>
        )}

        {/* Tab 2: MANUAL LOOKUP */}
        {activeTab === "lookup" && (
          <div className="w-full max-w-md mt-4 flex flex-col gap-6">
            <div className="bg-surface-container-high/50 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Search className="w-5 h-5 text-secondary" />
                Pemeriksaan Token Manual
              </h2>
              <p className="text-xs text-on-surface-variant mb-6">
                Gunakan fitur ini jika kamera perangkat tidak tersedia atau barcode pengunjung rusak.
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
          <div className="w-full max-w-md mt-4 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-secondary" />
                Riwayat Pemindaian Gate
              </h2>
              <button
                onClick={loadRecentScans}
                className="text-xs text-secondary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Segarkan
              </button>
            </div>

            {recentScans.length === 0 ? (
              <div className="bg-surface-container-high/40 border border-white/10 rounded-2xl p-8 text-center text-on-surface-variant text-sm">
                Belum ada data scan pada sesi ini.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentScans.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface-container-high/60 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex items-center justify-between transition-all hover:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.scanCount === 1 ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40" : "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                      }`}>
                        {item.scanCount === 1 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{item.participantName}</p>
                        <p className="text-xs font-mono text-on-surface-variant mt-0.5">{item.token}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                        {item.eventType}
                      </span>
                      <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
                        {item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODALS / OVERLAYS FOR SCAN RESULTS ── */}

        {/* Case 1: VALID - First Scan (scan_count == 0 -> now 1) GREEN SCREEN */}
        {result?.status === "valid" && (
          <div className="fixed inset-4 md:inset-auto md:top-24 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-2xl overlay-success flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-[#4ADE80]/20 flex items-center justify-center mb-4 border-2 border-[#4ADE80] shadow-[0_0_30px_rgba(74,222,128,0.5)] animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-[#4ADE80]" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-[#4ADE80] tracking-wider uppercase mb-1">
              Valid Ticket - Access Granted
            </h2>
            <p className="text-xs text-[#4ADE80]/80 font-mono uppercase tracking-widest mb-4">
              Scan Pertama Berhasil • Akses Diterima
            </p>

            <div className="w-full bg-[#0B1026]/90 border border-[#4ADE80]/30 rounded-xl p-4 my-2 text-left flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Nama Pemilik:</span>
                <span className="text-sm font-bold text-white">{result.ticket?.participantName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Event / Kategori:</span>
                <span className="text-xs font-bold text-secondary px-2 py-0.5 rounded bg-secondary/15">
                  {(result.ticket?.eventType || "").toUpperCase().includes("FESTIVAL") ? "VOITSFEST MAIN FESTIVAL" : "COLORFUN RUN (5K)"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Token Tiket:</span>
                <span className="text-xs font-mono font-bold text-white">{result.ticket?.token}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-on-surface-variant">Nilai Transaksi:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#ffd700]">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(result.ticket?.amount || 0)}
                  </span>
                  {result.ticket?.ticketPhase && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30 uppercase">
                      {result.ticket.ticketPhase}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Auto reset status */}
            <div className="mt-4 text-xs font-mono text-on-surface-variant flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Otomatis siap dalam {countdown ?? 3} detik...</span>
            </div>

            <button
              type="button"
              onClick={resetForNextScan}
              className="mt-5 w-full py-3.5 rounded-xl bg-[#4ADE80] text-primary-container font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_25px_rgba(74,222,128,0.6)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Scan Tiket Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Case 2: DUPLICATE SCAN (scan_count >= 1) RED / YELLOW SCREEN */}
        {result?.status === "duplicate" && (
          <div className="fixed inset-4 md:inset-auto md:top-24 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-2xl overlay-warning flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-[#F59E0B]/20 flex items-center justify-center mb-4 border-2 border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              <AlertTriangle className="w-12 h-12 text-[#F59E0B]" />
            </div>

            <h2 className="text-xl md:text-2xl font-black text-[#F59E0B] tracking-wider uppercase mb-1">
              {result.message || `Warning: Ticket Already Scanned ${result.ticket?.scanCount ?? 1} Times`}
            </h2>
            <p className="text-xs text-[#F59E0B]/90 font-bold uppercase tracking-wider mb-4">
              PERINGATAN: Tiket Pernah Digunakan Sebelumnya
            </p>

            <div className="w-full bg-[#0B1026]/90 border border-[#F59E0B]/30 rounded-xl p-4 my-2 text-left flex flex-col gap-2.5">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Pemilik Terdaftar:</span>
                <span className="text-sm font-bold text-white">{result.ticket?.participantName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Token Tiket:</span>
                <span className="text-xs font-mono font-bold text-white">{result.ticket?.token}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Percobaan Scan Ke:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-error/20 text-error border border-error/30">
                  Scan ke-{(result.ticket?.scanCount ?? 1) + 1}
                </span>
              </div>
              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Waktu Scan Pertama:</span>
                <span className="text-xs font-mono text-white text-right">
                  {result.ticket?.firstScannedAt 
                    ? new Date(result.ticket.firstScannedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })
                    : "Waktu tidak tercatat"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-on-surface-variant">Nilai Transaksi:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#ffd700]">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(result.ticket?.amount || 0)}
                  </span>
                  {result.ticket?.ticketPhase && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30 uppercase">
                      {result.ticket.ticketPhase}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-on-surface-variant">Petugas Verifikator:</span>
                <span className="text-xs font-semibold text-secondary">
                  {result.ticket?.scannedByName || "Petugas Gate"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-3 w-full">
              <button
                type="button"
                onClick={resetForNextScan}
                className="flex-1 py-3.5 rounded-xl bg-transparent border-2 border-white/30 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer"
              >
                Tutup / Dismiss
              </button>
              <button
                type="button"
                onClick={resetForNextScan}
                className="flex-1 py-3.5 rounded-xl bg-[#F59E0B] text-primary-container font-bold text-xs uppercase tracking-wider hover:bg-[#F59E0B]/90 transition-all cursor-pointer"
              >
                Scan Selanjutnya
              </button>
            </div>
          </div>
        )}

        {/* Case 3: INVALID TOKEN RED SCREEN */}
        {result?.status === "invalid" && (
          <div className="fixed inset-4 md:inset-auto md:top-24 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-2xl overlay-error flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-[#F43F5E]/20 flex items-center justify-center mb-4 border-2 border-[#F43F5E] shadow-[0_0_30px_rgba(244,63,94,0.5)]">
              <XCircle className="w-12 h-12 text-[#F43F5E]" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-[#F43F5E] tracking-wider uppercase mb-1">
              {result.message || "Invalid Ticket"}
            </h2>
            <p className="text-xs text-[#F43F5E]/90 font-bold uppercase tracking-wider mb-4">
              Tiket Tidak Ditemukan di Sistem VOITSFEST
            </p>

            <div className="w-full bg-[#0B1026]/90 border border-[#F43F5E]/30 rounded-xl p-4 my-2 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Token yang Dipindai:</p>
              <p className="text-base font-mono font-bold text-[#F43F5E] break-all">{result.token || manualToken || "Unknown"}</p>
            </div>

            <p className="text-xs text-on-surface-variant mt-3 mb-5 max-w-xs">
              Pastikan pengunjung memperlihatkan QR Code resmi dari User Dashboard VOITSFEST 2026.
            </p>

            <button
              type="button"
              onClick={resetForNextScan}
              className="w-full py-3.5 rounded-xl bg-[#F43F5E] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#F43F5E]/90 transition-all cursor-pointer shadow-lg"
            >
              Coba Pindai Ulang
            </button>
          </div>
        )}

        {/* System Error Modal */}
        {result?.status === "error" && (
          <div className="fixed inset-4 md:inset-auto md:top-24 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-2xl overlay-error flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <XCircle className="w-16 h-16 text-error mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
            <p className="text-xs text-on-surface-variant mb-6">{result.message}</p>
            <button
              type="button"
              onClick={resetForNextScan}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Kembali
            </button>
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
