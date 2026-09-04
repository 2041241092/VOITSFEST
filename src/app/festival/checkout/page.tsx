"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CustomHeading from "@/components/ui/CustomHeading";
import GatewayGuard from "@/components/gateway/GatewayGuard";
import { createClient } from "@/lib/supabase/client";
import { 
  Lock, 
  UploadCloud, 
  CheckCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  Info, 
  QrCode, 
  CreditCard,
  Ticket,
  Loader2,
  AlertCircle
} from "lucide-react";
import { fetchPricingTiers, EventPricing, DEFAULT_PRICING_TIERS } from "@/lib/pricing";
import imageCompression from "browser-image-compression";

export default function FestivalCheckoutPage() {
  const router = useRouter();

  // Stable Client Initialization: memoized to prevent re-instantiation across renders
  const supabase = useMemo(() => createClient(), []);

  // Auth & Session State (keep loading === true until setUserData completes)
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<{ fullName: string; phone: string; email: string }>({
    fullName: "",
    phone: "",
    email: "",
  });

  // Form State
  const [metodeBayar, setMetodeBayar] = useState<"bni" | "qris">("bni");
  const [namaPemilikRekening, setNamaPemilikRekening] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [persetujuanAturan, setPersetujuanAturan] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Pricing from cms_settings
  const [cmsPricing, setCmsPricing] = useState<EventPricing>(DEFAULT_PRICING_TIERS.festival);

  useEffect(() => {
    async function loadPricing() {
      const tiers = await fetchPricingTiers();
      if (tiers.festival) {
        setCmsPricing(tiers.festival);
      }
    }
    loadPricing();
  }, []);

  const totalAmount = cmsPricing.price;

  // 1. Client-Side Auth Guard with getUser() & 3-Second Fallback Timeout
  useEffect(() => {
    let isMounted = true;
    let authResolved = false;

    // Safety Fallback Timeout: ensures setLoading(false) is reached within 3 seconds
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !authResolved) {
        console.warn("Auth check exceeded 3s timeout. Triggering safety fallback.");
        setLoading(false);
        // If no user was resolved by timeout, redirect to login
        router.replace("/login?redirect=/festival/checkout");
      }
    }, 3000);

    async function checkAuth() {
      try {
        // Use getUser() instead of getSession() to avoid hanging promise locks
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (userError || !authUser) {
          authResolved = true;
          clearTimeout(fallbackTimer);
          setLoading(false);
          router.replace("/login?redirect=/festival/checkout");
          return;
        }

        authResolved = true;
        setUser(authUser);

        // Fetch user profile from profiles table by id === authUser.id
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        console.log('--- DEBUG PROFILE FETCH ---', { rawUser: authUser, profileData: profile });

        if (!isMounted) return;

        const profileData = profile as any;
        const meta = authUser?.user_metadata as any;

        // Fallback Resolution:
        const fullName =
          profileData?.full_name ||
          meta?.full_name ||
          authUser?.email?.split("@")[0] ||
          "Nama belum diatur";

        const resolvedPhone = 
          profileData?.phone || 
          profileData?.phone_number || 
          profileData?.whatsapp || 
          profileData?.whatsapp_number || 
          profileData?.no_wa || 
          meta?.phone || 
          meta?.phone_number || 
          meta?.whatsapp || 
          meta?.whatsapp_number || 
          authUser?.phone || 
          'Nomor belum diatur';

        const email =
          profileData?.email ||
          authUser?.email ||
          "Email tidak ditemukan";

        // Update dedicated state
        setUserData({
          fullName,
          phone: resolvedPhone,
          email,
        });

        // Keep loading === true until setUserData has completed, ensuring inputs never mount with empty strings
        setLoading(false);
      } catch (err) {
        console.error("Client auth verification error:", err);
        if (isMounted) {
          router.replace("/login?redirect=/festival/checkout");
        }
      } finally {
        if (isMounted) {
          clearTimeout(fallbackTimer);
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [router, supabase]);

  // Handle File Change with Image Compression (maxSizeMB: 0.2, maxWidthOrHeight: 1024)
  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setError(null);

    try {
      let processedFile = file;
      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        };
        const compressedBlob = await imageCompression(file, options);
        processedFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type || file.type,
          lastModified: Date.now(),
        });
      }

      setPaymentProofFile(processedFile);
      const objectUrl = URL.createObjectURL(processedFile);
      setPaymentProofPreview(objectUrl);
    } catch (err: any) {
      console.warn("Kompresi gambar gagal, menggunakan file asli:", err);
      setPaymentProofFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPaymentProofPreview(objectUrl);
    }
  };

  // Copy BNI Account Number
  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText("1433025776");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Comprehensive Form Validation Check
  const isFormValid = useMemo(() => {
    if (loading || !user) return false;
    if (metodeBayar !== "bni") return false;
    if (!paymentProofFile) return false;
    if (!namaPemilikRekening.trim()) return false;
    if (!persetujuanAturan) return false;
    return true;
  }, [loading, user, metodeBayar, paymentProofFile, namaPemilikRekening, persetujuanAturan]);

  // Form Submission strictly into festival_registrations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;
    setError(null);

    // Retrieve authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setError("Sesi pengguna telah berakhir. Silakan login kembali.");
      router.replace("/login?redirect=/festival/checkout");
      return;
    }

    if (!namaPemilikRekening.trim()) {
      setError("Nama pemilik rekening pengirim wajib diisi.");
      return;
    }

    if (!paymentProofFile) {
      setError("Silakan unggah bukti transfer pembayaran.");
      return;
    }

    if (!persetujuanAturan) {
      setError("Anda harus menyetujui tata tertib Festival VOITSFEST 2026.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload compressed payment proof to 'payment_proofs' storage bucket
      const cleanFileName = paymentProofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${authUser.id}/${Date.now()}-${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(filePath, paymentProofFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Gagal mengunggah bukti pembayaran: ${uploadError.message}`);
      }

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl || "";

      // 3. Insert payload strictly into festival_registrations table
      const registrationPayload = {
        user_id: authUser.id,
        nama_lengkap: userData.fullName || authUser.user_metadata?.full_name || "",
        whatsapp: userData.phone || authUser.user_metadata?.phone || "",
        email: userData.email || authUser.email || "",
        rekening_pengirim: namaPemilikRekening.trim(),
        bukti_transfer_url: publicUrl,
        payment_status: "pending",
        amount_paid: totalAmount,
        ticket_phase: cmsPricing.phase,
      };

      const { data: regResult, error: regError } = await supabase
        .from("festival_registrations")
        .insert(registrationPayload)
        .select()
        .maybeSingle();

      if (regError) {
        console.error("Supabase festival_registrations insert error:", regError);
        throw new Error(`Gagal menyimpan data pendaftaran: ${regError.message}`);
      }

      // 4. Also sync into central transactions table for dashboard status
      try {
        await supabase.from("transactions").insert({
          user_id: authUser.id,
          source_type: "festival",
          source_id: regResult?.id || null,
          sub_event_type: "FESTIVAL",
          amount: totalAmount,
          payment_proof_url: publicUrl,
          status: "Pending",
        });
      } catch (syncErr) {
        console.warn("Notice syncing transactions table:", syncErr);
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);

    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Terjadi kesalahan saat memproses pembayaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clean Spinner while verifying session (loading === true)
  if (loading) {
    return (
      <div className="text-on-background font-poppins overflow-x-hidden relative min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center pt-28 pb-16 px-4 relative z-10">
          <div className="glass-card max-w-sm w-full p-8 rounded-2xl text-center border border-white/10 shadow-2xl flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-full border-2 border-secondary/20 border-t-secondary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-secondary animate-pulse" />
              </div>
            </div>
            <h3 className="font-semibold text-lg text-white mb-1">Memeriksa Sesi Akun</h3>
            <p className="text-xs text-on-surface-variant font-medium">
              Memverifikasi otentikasi login Anda...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Success Confirmation Screen
  if (isSuccess) {
    return (
      <div className="text-on-background font-poppins overflow-x-hidden relative min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center pt-28 pb-16 px-4 relative z-10">
          <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center border-t-4 border-t-secondary-fixed shadow-2xl animate-in fade-in duration-300">
            <CheckCircle className="w-20 h-20 text-secondary-fixed mx-auto mb-6 drop-shadow-[0_0_15px_rgba(176,198,255,0.5)]" />
            <CustomHeading as="h1" text="Pembayaran Berhasil Dikirim" className="text-2xl md:text-3xl text-white mb-4" />
            <p className="text-on-surface-variant font-poppins mb-6 leading-relaxed text-sm">
              Bukti pembayaran tiket Festival Anda telah tercatat dengan status{" "}
              <span className="text-secondary font-bold">Pending</span>. Anda akan dialihkan ke Dashboard untuk memantau proses verifikasi tiket.
            </p>
            <div className="bg-surface-container-highest/50 border border-outline-variant/40 rounded-xl p-4 mb-6 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-on-surface-variant">
                <span>Sub-Event</span>
                <span className="text-white font-semibold">FESTIVAL 2026</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Fase Tiket</span>
                <span className="text-white font-semibold uppercase">{cmsPricing.phase}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Total Nominal</span>
                <span className="text-secondary font-bold">Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>
            <Link 
              href="/dashboard" 
              className="inline-block bg-primary-container text-primary hover:bg-primary-container/80 px-8 py-3.5 rounded-full font-medium tracking-wider uppercase transition-colors font-poppins text-xs"
            >
              Lihat di Dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <GatewayGuard event="festival">
      <div className="text-on-background font-poppins overflow-x-hidden relative min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-grow pt-32 pb-24 px-6 md:px-12 lg:px-24 mx-auto w-full max-w-[1280px] relative z-10">
          {/* Header Section */}
          <div className="text-center mb-14">
            <CustomHeading 
              as="h1" 
              text="Festival Registration" 
              className="text-4xl md:text-6xl text-white mb-4 drop-shadow-md tracking-tight text-center" 
            />
            <p className="font-body-lg text-base md:text-lg text-secondary-fixed-dim max-w-2xl mx-auto">
              Secure your spot for the grand finale of VOITSFEST 2026. Lengkapi formulir pembayaran di bawah ini.
            </p>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="mb-8 p-4 bg-error-container/30 border border-error text-error rounded-xl flex items-center gap-3 max-w-4xl mx-auto animate-in fade-in duration-300">
              <Info className="w-6 h-6 flex-shrink-0" />
              <p className="font-poppins text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="space-y-10 max-w-4xl mx-auto">
            
            {/* ======================================================== */}
            {/* SECTION 1: KONFIRMASI DATA PESERTA */}
            {/* ======================================================== */}
            <div className="glass-card rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-xl border border-white/10">
              <div className="mb-6 pb-4 border-b border-white/10">
                <CustomHeading 
                  as="h2" 
                  text="Konfirmasi Data Peserta" 
                  className="text-2xl md:text-3xl text-primary-fixed flex items-center gap-3" 
                />
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  Data ini diambil secara otomatis dari akun profil terdaftar Anda
                </p>
              </div>

              <div className="space-y-6">
                {/* Nama Lengkap */}
                <div className="space-y-2">
                  <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={userData.fullName || ''} 
                      readOnly 
                      className="text-white bg-neutral-800/80 border border-neutral-700 cursor-not-allowed z-10 relative px-4 py-3 w-full rounded-lg outline-none font-poppins pr-10" 
                    />
                    <Lock className="w-4 h-4 text-on-surface-variant absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none" />
                  </div>
                </div>

                {/* WhatsApp & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                      Nomor WhatsApp
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={userData.phone || ''} 
                        readOnly 
                        className="text-white bg-neutral-800/80 border border-neutral-700 cursor-not-allowed z-10 relative px-4 py-3 w-full rounded-lg outline-none font-poppins pr-10" 
                      />
                      <Lock className="w-4 h-4 text-on-surface-variant absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                      Email Aktif
                    </label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={userData.email || ''} 
                        readOnly 
                        className="text-white bg-neutral-800/80 border border-neutral-700 cursor-not-allowed z-10 relative px-4 py-3 w-full rounded-lg outline-none font-poppins pr-10" 
                      />
                      <Lock className="w-4 h-4 text-on-surface-variant absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SECTION 2: PEMBAYARAN */}
            {/* ======================================================== */}
            <div className="glass-card rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-xl border border-white/10">
              <div className="mb-6 pb-4 border-b border-white/10">
                <CustomHeading 
                  as="h2" 
                  text="Pembayaran" 
                  className="text-2xl md:text-3xl text-primary-fixed flex items-center gap-3" 
                />
              </div>

              {/* Total Payment Bar */}
              <div className="p-4 rounded-xl border border-secondary/50 bg-secondary/10 flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-medium text-xs uppercase text-secondary tracking-wider">
                    Total Biaya (Fase: {cmsPricing.phase})
                  </h3>
                  <p className="font-headline-md text-2xl text-white font-bold mt-1">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4 mb-6">
                <label className="font-medium text-sm text-on-surface-variant uppercase tracking-wider block">
                  Metode Pembayaran *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Bank Transfer (BNI) */}
                  <label 
                    className={`cursor-pointer rounded-xl p-4 border flex items-center gap-3.5 transition-all duration-300 ${
                      metodeBayar === "bni" 
                        ? "bg-secondary/20 border-secondary shadow-[0_0_15px_rgba(176,198,255,0.15)]" 
                        : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="metodeBayar" 
                      value="bni" 
                      checked={metodeBayar === "bni"} 
                      onChange={() => setMetodeBayar("bni")} 
                      className="hidden" 
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${metodeBayar === "bni" ? "border-secondary" : "border-neutral-600"}`}>
                      {metodeBayar === "bni" && <div className="w-2.5 h-2.5 rounded-full bg-secondary" />}
                    </div>
                    <CreditCard className="w-5 h-5 text-secondary" />
                    <span className="text-white font-medium text-sm">Bank Transfer (BNI)</span>
                  </label>

                  {/* Option 2: QRIS Digital */}
                  <label 
                    className={`cursor-pointer rounded-xl p-4 border flex items-center justify-between gap-3.5 transition-all duration-300 ${
                      metodeBayar === "qris" 
                        ? "bg-secondary/20 border-secondary shadow-[0_0_15px_rgba(176,198,255,0.15)]" 
                        : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <input 
                        type="radio" 
                        name="metodeBayar" 
                        value="qris" 
                        checked={metodeBayar === "qris"} 
                        onChange={() => setMetodeBayar("qris")} 
                        className="hidden" 
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${metodeBayar === "qris" ? "border-secondary" : "border-neutral-600"}`}>
                        {metodeBayar === "qris" && <div className="w-2.5 h-2.5 rounded-full bg-secondary" />}
                      </div>
                      <QrCode className="w-5 h-5 text-secondary" />
                      <span className="text-white font-medium text-sm">QRIS Digital</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Belum Tersedia
                    </span>
                  </label>
                </div>

                {/* Transfer Destination Details / QRIS Notice */}
                <div className="mt-4 transition-all duration-300">
                  {metodeBayar === "bni" ? (
                    <div className="p-6 rounded-xl border-l-4 border-l-secondary bg-surface-container-highest/50 border border-white/5 animate-in fade-in duration-300">
                      <h4 className="text-secondary mb-2 text-xs uppercase tracking-wider font-semibold">Tujuan Transfer:</h4>
                      <p className="text-white text-base font-medium mb-1">BNI (Bank Negara Indonesia)</p>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-mono text-2xl tracking-wider font-bold">1433025776</span>
                        <button
                          type="button"
                          onClick={handleCopyAccountNumber}
                          className="px-3 py-1 rounded bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors border border-secondary/30"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? "Tersalin" : "Salin"}</span>
                        </button>
                      </div>
                      <p className="text-on-surface-variant text-sm font-medium">a.n Amalia Fitria Damaiyanti</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center rounded-xl bg-amber-500/10 border border-amber-500/30 animate-in fade-in duration-300">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                      </div>
                      <h4 className="text-amber-300 font-semibold text-base mb-1.5">
                        Untuk Saat Ini Layanan QRIS Belum Tersedia
                      </h4>
                      <p className="text-xs text-neutral-300 max-w-md leading-relaxed">
                        Mohon gunakan metode pembayaran <strong className="text-white">Bank Transfer (BNI)</strong> untuk menyelesaikan transaksi Anda.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sender Account Name */}
              <div className="space-y-2 mb-6">
                <label className="font-medium text-sm text-on-surface-variant uppercase tracking-wider block">
                  Nama Pemilik Rekening Pengirim *
                </label>
                <input 
                  required 
                  type="text" 
                  value={namaPemilikRekening} 
                  onChange={e => setNamaPemilikRekening(e.target.value)} 
                  className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-medium" 
                  placeholder="Nama yang tertera pada rekening pengirim" 
                />
              </div>

              {/* Upload Proof */}
              <div className="space-y-2">
                <label className="font-medium text-sm text-on-surface-variant uppercase tracking-wider block">
                  Upload Bukti Transfer *
                </label>
                <div className="relative w-full">
                  <input 
                    required 
                    ref={fileInputRef}
                    accept="image/*" 
                    type="file" 
                    onChange={e => handleFileChange(e.target.files?.[0] || null)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-full border-2 border-dashed border-outline-variant rounded-lg py-8 flex flex-col items-center justify-center bg-surface-container-highest/30 hover:bg-surface-container-highest/60 transition-colors">
                    <UploadCloud className="w-8 h-8 text-on-surface-variant mb-2" />
                    <span className="text-white font-medium">
                      {paymentProofFile ? paymentProofFile.name : "Unggah Bukti Transfer (JPG/PNG/PDF)"}
                    </span>
                  </div>
                </div>
                {paymentProofPreview && (
                  <img 
                    src={paymentProofPreview} 
                    alt="Preview Bukti Transfer" 
                    className="mt-3 w-24 h-24 object-cover rounded-lg border border-white/20 shadow-md" 
                  />
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SECTION 3: PERSETUJUAN & FINALISASI */}
            {/* ======================================================== */}
            <div className="glass-card rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-xl border border-white/10">
              <div className="mb-6 pb-4 border-b border-white/10">
                <CustomHeading 
                  as="h2" 
                  text="Persetujuan &amp; Finalisasi" 
                  className="text-2xl md:text-3xl text-primary-fixed flex items-center gap-3" 
                />
              </div>

              <label className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-highest/30 border border-outline-variant cursor-pointer hover:bg-surface-container-highest/50 transition-colors">
                <div className="flex items-center h-5 mt-0.5">
                  <input 
                    required 
                    type="checkbox" 
                    checked={persetujuanAturan} 
                    onChange={e => setPersetujuanAturan(e.target.checked)} 
                    className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary bg-surface-container-highest" 
                  />
                </div>
                <span className="text-sm font-poppins text-white/90 leading-relaxed">
                  Saya bersedia mematuhi seluruh tata tertib Festival VOITSFEST 2026, termasuk tidak membawa senjata tajam, obat-obatan terlarang, flare, serta barang-barang yang dilarang panitia.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col items-end gap-2 pt-4">
              <button 
                disabled={!isFormValid || isSubmitting} 
                type="submit" 
                className={`bg-primary-container text-primary px-10 py-4 rounded-full font-medium tracking-wider uppercase flex items-center gap-3 transition-all ${
                  !isFormValid || isSubmitting 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-primary-container/80 shadow-[0_0_20px_rgba(176,198,255,0.2)] cursor-pointer"
                }`}
              >
                {isSubmitting ? "Memproses Pembayaran..." : "Kirim Pembayaran"}
                {!isSubmitting && <ArrowRight className="w-5 h-5" />}
              </button>
              {!isFormValid && (
                <p className="text-xs text-on-surface-variant/70 font-poppins">
                  Lengkapi seluruh data wajib &amp; persetujuan di atas untuk dapat mengirim pembayaran.
                </p>
              )}
            </div>
          </form>
        </main>

        <Footer />
      </div>
    </GatewayGuard>
  );
}
