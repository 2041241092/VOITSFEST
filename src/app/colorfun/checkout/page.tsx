"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  Activity,
  Loader2,
  FileText,
  AlertCircle
} from "lucide-react";
import { fetchPricingTiers, EventPricing, DEFAULT_PRICING_TIERS } from "@/lib/pricing";
import imageCompression from "browser-image-compression";

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  try {
    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Kompresi gambar gagal, menggunakan file asli:", err);
    return file;
  }
}

export default function ColorFunCheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname || "/colorfun/checkout";

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

  // Form State - Kategori Peserta (Section 1)
  const [kategoriPeserta, setKategoriPeserta] = useState<"Umum" | "Mahasiswa ITS">("Umum");
  const [nrp, setNrp] = useState("");
  const [ktmFile, setKtmFile] = useState<File | null>(null);

  // Form State - Emergency & Health
  const [kontakDarurat, setKontakDarurat] = useState("");
  const [nomorWADarurat, setNomorWADarurat] = useState("");
  const [hubunganDarurat, setHubunganDarurat] = useState("");
  const [riwayatPenyakit, setRiwayatPenyakit] = useState("");
  const [riwayatAlergi, setRiwayatAlergi] = useState("");

  // Form State - Payment
  const [metodeBayar, setMetodeBayar] = useState<"bni" | "qris">("bni");
  const [rekeningPengirim, setRekeningPengirim] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [persetujuanSehat, setPersetujuanSehat] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string>("Mengompresi gambar...");
  const [isCompressingKtm, setIsCompressingKtm] = useState(false);
  const [isCompressingProof, setIsCompressingProof] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ktmInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Pricing from cms_settings
  const [cmsPricing, setCmsPricing] = useState<EventPricing>(DEFAULT_PRICING_TIERS.colorfun);

  useEffect(() => {
    async function loadPricing() {
      const tiers = await fetchPricingTiers();
      if (tiers.colorfun) {
        setCmsPricing(tiers.colorfun);
      }
    }
    loadPricing();
  }, []);

  const CFR_TICKET_PRICE = cmsPricing.price;

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
        router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
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
          router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
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
          router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
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
  }, [currentPath, router, supabase]);

  // Handle Kategori Peserta Change
  const handleKategoriChange = (newCategory: "Umum" | "Mahasiswa ITS") => {
    setKategoriPeserta(newCategory);
    if (newCategory === "Umum") {
      setNrp("");
      setKtmFile(null);
      if (ktmInputRef.current) {
        ktmInputRef.current.value = "";
      }
    }
  };

  // Handle KTM File Change with client-side image compression
  const handleKtmFileChange = async (file: File | null) => {
    if (!file) {
      setKtmFile(null);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      setError("File Scan Kartu Pelajar / KTM harus berformat Gambar (JPG/PNG) atau PDF (.pdf).");
      setKtmFile(null);
      if (ktmInputRef.current) {
        ktmInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Ukuran file KTM maksimal 15MB sebelum kompresi.");
      setKtmFile(null);
      if (ktmInputRef.current) {
        ktmInputRef.current.value = "";
      }
      return;
    }

    setError(null);
    if (isImage) {
      setIsCompressingKtm(true);
      try {
        const compressed = await compressImage(file);
        setKtmFile(compressed);
      } catch (err) {
        console.error("Gagal kompresi file KTM:", err);
        setKtmFile(file);
      } finally {
        setIsCompressingKtm(false);
      }
    } else {
      setKtmFile(file);
    }
  };

  // Handle Payment Proof File Change with client-side image compression
  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setPaymentProofFile(null);
      setPaymentProofPreview(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Ukuran file bukti transfer maksimal 15MB sebelum kompresi.");
      return;
    }

    setError(null);
    setIsCompressingProof(true);
    try {
      const compressed = await compressImage(file);
      setPaymentProofFile(compressed);
      const objectUrl = URL.createObjectURL(compressed);
      setPaymentProofPreview(objectUrl);
    } catch (err) {
      console.error("Gagal kompresi bukti transfer:", err);
      setPaymentProofFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPaymentProofPreview(objectUrl);
    } finally {
      setIsCompressingProof(false);
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
    if (loading || !user || isCompressingKtm || isCompressingProof) return false;

    // 0. Payment method must be BNI
    if (metodeBayar !== "bni") return false;

    // 1. Payment proof file selected
    if (!paymentProofFile) return false;

    // 2. Personal & Emergency details
    if (!kontakDarurat.trim()) return false;
    if (!nomorWADarurat.trim()) return false;
    if (!hubunganDarurat) return false;

    // 3. Sender account name
    if (!rekeningPengirim.trim()) return false;

    // 4. Terms / Waiver agreement
    if (!persetujuanSehat) return false;

    // 5. Category-specific validation: Mahasiswa ITS requires NRP & KTM
    if (kategoriPeserta === "Mahasiswa ITS") {
      if (!nrp.trim()) return false;
      if (!ktmFile) return false;
    }

    return true;
  }, [
    loading,
    user,
    isCompressingKtm,
    isCompressingProof,
    metodeBayar,
    paymentProofFile,
    kontakDarurat,
    nomorWADarurat,
    hubunganDarurat,
    rekeningPengirim,
    persetujuanSehat,
    kategoriPeserta,
    nrp,
    ktmFile,
  ]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;
    setError(null);

    if (!user) {
      setError("Sesi pengguna telah berakhir. Silakan login kembali.");
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (kategoriPeserta === "Mahasiswa ITS") {
      if (!nrp.trim()) {
        setError("NRP (Nomor Pokok Mahasiswa) wajib diisi untuk Mahasiswa ITS.");
        return;
      }
      if (!ktmFile) {
        setError("Scan Kartu Pelajar / KTM wajib diunggah untuk Mahasiswa ITS.");
        return;
      }
    }

    if (!kontakDarurat.trim()) {
      setError("Nama kontak darurat wajib diisi.");
      return;
    }

    if (!nomorWADarurat.trim()) {
      setError("Nomor WhatsApp kontak darurat wajib diisi.");
      return;
    }

    if (!hubunganDarurat) {
      setError("Silakan pilih hubungan dengan kontak darurat.");
      return;
    }

    if (!rekeningPengirim.trim()) {
      setError("Nama pemilik rekening pengirim wajib diisi.");
      return;
    }

    if (!paymentProofFile) {
      setError("Silakan unggah bukti transfer pembayaran.");
      return;
    }

    if (!persetujuanSehat) {
      setError("Anda harus menyetujui pernyataan kondisi fisik dan pelepasan tanggung jawab.");
      return;
    }

    setIsSubmitting(true);
    setSubmittingStep("Mengompresi gambar...");

    try {
      // 1. Client-Side Image Compression check & preparation (maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true)
      setSubmittingStep("Mengompresi gambar...");
      const compressedProof = await compressImage(paymentProofFile);

      // 2. Upload KTM if category is Mahasiswa ITS to 'colorfun_ktm' bucket
      let ktmUrl: string | null = null;
      if (kategoriPeserta === "Mahasiswa ITS" && ktmFile) {
        setSubmittingStep("Mengompresi gambar...");
        const compressedKtm = await compressImage(ktmFile);
        const cleanKtmName = compressedKtm.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const ktmPath = `${user.id}/${Date.now()}-${cleanKtmName}`;

        setSubmittingStep("Mengunggah berkas...");
        const { error: ktmUploadError } = await supabase.storage
          .from("colorfun_ktm")
          .upload(ktmPath, compressedKtm, {
            cacheControl: "3600",
            upsert: false,
          });

        if (ktmUploadError) {
          throw new Error(`Gagal mengunggah Scan Kartu Pelajar / KTM: ${ktmUploadError.message}`);
        }

        const { data: ktmPublicData } = supabase.storage
          .from("colorfun_ktm")
          .getPublicUrl(ktmPath);

        ktmUrl = ktmPublicData?.publicUrl || null;
      }

      // 3. Upload payment proof to 'payment_proofs' bucket
      setSubmittingStep("Mengunggah berkas...");
      const cleanProofName = compressedProof.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const proofPath = `${user.id}/${Date.now()}-${cleanProofName}`;

      const { error: proofUploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(proofPath, compressedProof, {
          cacheControl: "3600",
          upsert: false,
        });

      if (proofUploadError) {
        throw new Error(`Gagal mengunggah bukti pembayaran: ${proofUploadError.message}`);
      }

      // 4. Retrieve Public URL for Payment Proof
      const { data: proofPublicData } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(proofPath);

      const paymentProofUrl = proofPublicData?.publicUrl || "";

      // 5. Construct payload & Insert into 'colorfun_registrations' table
      setSubmittingStep("Memproses pendaftaran...");
      const registrationPayload = {
        user_id: user.id,
        nama_lengkap: userData.fullName || user.user_metadata?.full_name || "",
        email: userData.email || user.email || "",
        whatsapp: userData.phone || user.user_metadata?.phone || "",
        kategori_peserta: kategoriPeserta,
        nrp: kategoriPeserta === "Mahasiswa ITS" ? nrp.trim() : null,
        ktm_url: ktmUrl,
        darurat_nama: kontakDarurat.trim(),
        darurat_wa: nomorWADarurat.trim(),
        darurat_hubungan: hubunganDarurat,
        riwayat_penyakit: riwayatPenyakit.trim() || null,
        riwayat_alergi: riwayatAlergi.trim() || null,
        rekening_pengirim: rekeningPengirim.trim(),
        bukti_transfer_url: paymentProofUrl,
        payment_status: "Pending",
        amount_paid: CFR_TICKET_PRICE,
        ticket_phase: cmsPricing.phase,
      };

      const { data: regResult, error: regError } = await supabase
        .from("colorfun_registrations")
        .insert(registrationPayload)
        .select()
        .maybeSingle();

      if (regError) {
        console.error("Supabase colorfun_registrations insert error:", regError);
        throw new Error(`Gagal menyimpan data pendaftaran: ${regError.message}`);
      }

      // 6. Also sync to 'transactions' table so user dashboard and admin verification show the record
      try {
        await supabase.from("transactions").insert({
          user_id: user.id,
          source_type: "cfr",
          source_id: regResult?.id || null,
          sub_event_type: "CFR",
          amount: CFR_TICKET_PRICE,
          payment_proof_url: paymentProofUrl,
          status: "Pending",
          participant_category: kategoriPeserta,
          student_id_number: kategoriPeserta === "Mahasiswa ITS" ? nrp.trim() : null,
          student_card_url: ktmUrl,
        });
      } catch (txErr) {
        console.warn("Transactions record sync notice:", txErr);
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);

    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Terjadi kesalahan saat memproses pendaftaran.");
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
            <CustomHeading as="h1" text="Pendaftaran Berhasil Dikirim" className="text-2xl md:text-3xl text-white mb-4" />
            <p className="text-on-surface-variant font-poppins mb-6 leading-relaxed text-sm">
              Bukti pembayaran pendaftaran ColorFun Run Anda telah tercatat dengan status{" "}
              <span className="text-secondary font-bold">Pending</span>. Anda akan dialihkan ke Dashboard untuk memantau proses verifikasi tiket race Anda.
            </p>
            <div className="bg-surface-container-highest/50 border border-outline-variant/40 rounded-xl p-4 mb-6 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-on-surface-variant">
                <span>Sub-Event</span>
                <span className="text-white font-semibold">COLORFUN RUN (CFR)</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Kategori</span>
                <span className="text-white font-semibold">5K Fun Run</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Total Biaya</span>
                <span className="text-secondary font-bold">Rp {CFR_TICKET_PRICE.toLocaleString("id-ID")}</span>
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
    <GatewayGuard event="cfr">
      <div className="text-on-background font-poppins overflow-x-hidden relative min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-grow pt-32 pb-24 px-6 md:px-12 lg:px-24 mx-auto w-full max-w-[1280px] relative z-10">
          {/* Header Section */}
          <div className="text-center mb-14">
            <CustomHeading 
              as="h1" 
              text="ColorFun Run Registration" 
              className="text-4xl md:text-6xl text-white mb-4 drop-shadow-md tracking-tight text-center" 
            />
            <p className="font-body-lg text-base md:text-lg text-secondary-fixed-dim max-w-2xl mx-auto">
              Confirm your details for the cosmic 5K race. Lengkapi formulir pendaftaran dan pembayaran di bawah ini.
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
                      Email
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

                {/* Kategori Peserta */}
                <div className="space-y-2 pt-2">
                  <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                    Kategori Peserta *
                  </label>
                  <select
                    value={kategoriPeserta}
                    onChange={(e) => handleKategoriChange(e.target.value as "Umum" | "Mahasiswa ITS")}
                    className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins cursor-pointer"
                  >
                    <option value="Umum" className="bg-[#101415] text-white">Umum</option>
                    <option value="Mahasiswa ITS" className="bg-[#101415] text-white">Mahasiswa ITS</option>
                  </select>
                </div>

                {/* Conditional Fields for Mahasiswa ITS */}
                {kategoriPeserta === "Mahasiswa ITS" && (
                  <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* NRP */}
                    <div className="space-y-2">
                      <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                        NRP (Nomor Pokok Mahasiswa) *
                      </label>
                      <input
                        required
                        type="text"
                        value={nrp}
                        onChange={(e) => setNrp(e.target.value)}
                        placeholder="e.g. 5001211001"
                        className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins placeholder:text-on-surface-variant/50"
                      />
                    </div>

                    {/* Scan Kartu Pelajar / KTM (Gambar/PDF) */}
                    <div className="space-y-2">
                      <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                        Scan Kartu Pelajar / KTM (JPG/PNG/PDF) *
                      </label>
                      <div className="relative w-full">
                        <input
                          ref={ktmInputRef}
                          required
                          accept="image/*,application/pdf,.pdf"
                          type="file"
                          onChange={(e) => handleKtmFileChange(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div
                          className={`w-full border-2 border-dashed rounded-lg py-6 px-4 flex flex-col items-center justify-center transition-colors ${
                            ktmFile
                              ? "border-secondary bg-secondary/10"
                              : "border-outline-variant bg-surface-container-highest/30 hover:bg-surface-container-highest/60"
                          }`}
                        >
                          {ktmFile ? (
                            <div className="flex items-center gap-3 text-secondary">
                              <FileText className="w-8 h-8 flex-shrink-0" />
                              <div className="text-left">
                                <p className="font-medium text-sm text-white truncate max-w-xs">{ktmFile.name}</p>
                                <p className="text-xs text-secondary-fixed-dim">
                                  {isCompressingKtm ? "Mengompresi..." : `${(ktmFile.size / 1024).toFixed(1)} KB - File Terunggah`}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="w-8 h-8 mb-2 text-on-surface-variant" />
                              <span className="text-white font-medium text-sm text-center">
                                {isCompressingKtm ? "Mengompresi file KTM..." : "Unggah Scan Kartu Pelajar / KTM (JPG/PNG/PDF)"}
                              </span>
                              <span className="text-xs text-on-surface-variant/70 mt-1">Klik atau seret file ke sini</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SECTION 2: DETAIL PERLENGKAPAN & KESELAMATAN */}
            {/* ======================================================== */}
            <div className="glass-card rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-xl border border-white/10">
              <div className="mb-6 pb-4 border-b border-white/10">
                <CustomHeading 
                  as="h2" 
                  text="Detail Perlengkapan &amp; Keselamatan" 
                  className="text-2xl md:text-3xl text-primary-fixed flex items-center gap-3" 
                />
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  Informasi medis dan kontak darurat untuk kenyamanan serta keselamatan Anda selama 5K Race
                </p>
              </div>

              <div className="space-y-6">
                {/* Emergency Contact Name */}
                <div className="space-y-2">
                  <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                    Nama Kontak Darurat (Emergency Contact) *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={kontakDarurat} 
                    onChange={e => setKontakDarurat(e.target.value)} 
                    className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins placeholder:text-on-surface-variant/50" 
                    placeholder="Masukkan nama kontak darurat yang dapat dihubungi" 
                  />
                </div>

                {/* Emergency WA & Relationship */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                      Nomor WA Kontak Darurat *
                    </label>
                    <input 
                      required 
                      type="tel" 
                      value={nomorWADarurat} 
                      onChange={e => setNomorWADarurat(e.target.value)} 
                      className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins placeholder:text-on-surface-variant/50" 
                      placeholder="Contoh: 081234567890" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                      Hubungan dengan Kontak Darurat *
                    </label>
                    <select 
                      required 
                      value={hubunganDarurat} 
                      onChange={e => setHubunganDarurat(e.target.value)} 
                      className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins"
                    >
                      <option value="" disabled className="bg-[#101415] text-on-surface-variant">Pilih Hubungan</option>
                      <option value="orangTua" className="bg-[#101415] text-white">Orang Tua</option>
                      <option value="saudara" className="bg-[#101415] text-white">Saudara</option>
                      <option value="pasangan" className="bg-[#101415] text-white">Pasangan</option>
                      <option value="teman" className="bg-[#101415] text-white">Teman</option>
                    </select>
                  </div>
                </div>

                {/* Medical History & Allergies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                      Riwayat Penyakit (Opsional)
                    </label>
                    <input 
                      type="text" 
                      value={riwayatPenyakit} 
                      onChange={e => setRiwayatPenyakit(e.target.value)} 
                      className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins placeholder:text-on-surface-variant/50" 
                      placeholder="Contoh: Asma, Jantung, atau tulis 'Tidak Ada'" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-poppins font-medium text-sm text-primary-fixed-dim uppercase tracking-wider block">
                      Riwayat Alergi (Opsional)
                    </label>
                    <input 
                      type="text" 
                      value={riwayatAlergi} 
                      onChange={e => setRiwayatAlergi(e.target.value)} 
                      className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-poppins placeholder:text-on-surface-variant/50" 
                      placeholder="Contoh: Obat-obatan, Makanan, atau tulis 'Tidak Ada'" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SECTION 3: PEMBAYARAN & FINALISASI */}
            {/* ======================================================== */}
            <div className="glass-card rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-xl border border-white/10">
              <div className="mb-6 pb-4 border-b border-white/10">
                <CustomHeading 
                  as="h2" 
                  text="Pembayaran &amp; Finalisasi" 
                  className="text-2xl md:text-3xl text-primary-fixed flex items-center gap-3" 
                />
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  Biaya registrasi sudah mencakup Race Kit, Glow Powder Zone Access, &amp; Finisher Medal
                </p>
              </div>

              {/* Total Payment Bar */}
              <div className="p-4 rounded-xl border border-secondary/50 bg-secondary/10 flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-medium text-xs uppercase text-secondary tracking-wider">
                    Total Biaya (Fase: {cmsPricing.phase})
                  </h3>
                  <p className="font-headline-md text-2xl text-white font-bold mt-1">
                    Rp {CFR_TICKET_PRICE.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4 mb-6">
                <label className="font-medium text-sm text-on-surface-variant uppercase tracking-wider block">
                  Pilih Metode Pembayaran *
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
                  value={rekeningPengirim} 
                  onChange={(e) => setRekeningPengirim(e.target.value)} 
                  className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg px-4 py-3 text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-medium" 
                  placeholder="Nama yang tertera pada rekening pengirim" 
                />
              </div>

              {/* Upload Proof */}
              <div className="space-y-2 mb-6">
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
                      {isCompressingProof
                        ? "Mengompresi gambar..."
                        : paymentProofFile
                        ? paymentProofFile.name
                        : "Unggah Bukti Transfer (JPG/PNG)"}
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

              {/* Waiver Checkbox */}
              <label className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-highest/30 border border-outline-variant cursor-pointer hover:bg-surface-container-highest/50 transition-colors">
                <div className="flex items-center h-5 mt-0.5">
                  <input 
                    required 
                    type="checkbox" 
                    checked={persetujuanSehat} 
                    onChange={e => setPersetujuanSehat(e.target.checked)} 
                    className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary bg-surface-container-highest" 
                  />
                </div>
                <span className="text-sm font-poppins text-white/90 leading-relaxed">
                  Saya menyatakan dalam kondisi fisik yang sehat, siap mengikuti seluruh rangkaian ColorFun Run 5K, dan membebaskan panitia dari segala bentuk tuntutan atas cedera fisik yang terjadi di luar kendali pihak penyelenggara.
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{submittingStep || "Mengompresi gambar..."}</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Pembayaran</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
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
