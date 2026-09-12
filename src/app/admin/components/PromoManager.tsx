"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tag, Plus, Trash2, Calendar, Sparkles, X, Loader2, Banknote, Check } from "lucide-react";
import { Promo, DiscountType } from "@/types/database";
import {
  fetchPricingTiers,
  DEFAULT_PRICING_TIERS,
  PricingTiersConfig,
  PricingEvent,
  PRICING_EVENT_NAMES,
  formatRupiah,
} from "@/lib/pricing";

interface PromoManagerProps {
  onToast?: (type: "success" | "error", message: string) => void;
}

export const PROMO_TARGET_EVENTS = [
  "BPC",
  "BCC",
  "Seminar",
  "Tenant",
  "ColorFun Run",
  "Festival",
] as const;

export type PromoTargetEvent = (typeof PROMO_TARGET_EVENTS)[number];

export default function PromoManager({ onToast }: PromoManagerProps) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating a new promo
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_type: "percent" as DiscountType,
    discount_value: "",
    target_event: "ColorFun Run" as PromoTargetEvent,
    kuota_maksimal: "",
    kapasitas: "1",
    kategori_peserta: "Semua",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    is_active: true,
  });

  // State for Manajemen Harga & Fase Pendaftaran (cms_settings: pricing_tiers)
  const [pricingTiers, setPricingTiers] = useState<PricingTiersConfig>(DEFAULT_PRICING_TIERS);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadPricing() {
      setLoadingPricing(true);
      const tiers = await fetchPricingTiers();
      setPricingTiers(tiers);
      setLoadingPricing(false);
    }
    loadPricing();
  }, []);

  const handlePricingChange = (eventKey: PricingEvent, field: "phase" | "price", val: any) => {
    setPricingTiers((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        [field]: field === "price" ? Math.max(0, parseInt(val, 10) || 0) : val,
      },
    }));
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const { error } = await supabase
        .from("cms_settings")
        .upsert({
          key: "pricing_tiers",
          value: pricingTiers,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      onToast?.("success", "Pengaturan harga & fase pendaftaran berhasil disimpan ke cms_settings!");
    } catch (err: any) {
      console.error("Save pricing error:", err);
      onToast?.("error", `Gagal menyimpan harga: ${err.message}`);
    } finally {
      setSavingPricing(false);
    }
  };

  const fetchPromos = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching promos:", error);
        if (!isSilent) onToast?.("error", "Gagal memuat data promo: " + error.message);
      } else {
        setPromos((data as Promo[]) || []);
      }
    } catch (err: any) {
      console.error("Fetch promos error:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [supabase, onToast]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  // Realtime subscription & window event listeners for instantaneous quota counter revalidation
  useEffect(() => {
    const handleRefresh = () => {
      fetchPromos(true);
    };

    window.addEventListener("promo-quota-updated", handleRefresh);
    window.addEventListener("admin-refresh-data", handleRefresh);

    const channel = supabase
      .channel("promo-manager-realtime-quota")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        () => {
          fetchPromos(true);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("promo-quota-updated", handleRefresh);
      window.removeEventListener("admin-refresh-data", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [fetchPromos, supabase]);

  // Handle Toggle Active Status
  const handleToggleActive = async (promo: Promo) => {
    const newStatus = !promo.is_active;
    // Optimistic UI update
    setPromos((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, is_active: newStatus } : p))
    );

    try {
      const { error } = await supabase
        .from("promos")
        .update({ is_active: newStatus })
        .eq("id", promo.id);

      if (error) {
        // Revert
        setPromos((prev) =>
          prev.map((p) => (p.id === promo.id ? { ...p, is_active: promo.is_active } : p))
        );
        onToast?.("error", `Gagal mengubah status: ${error.message}`);
      } else {
        onToast?.(
          "success",
          `Promo "${promo.title}" sekarang ${newStatus ? "Aktif" : "Nonaktif"}.`
        );
      }
    } catch (err: any) {
      onToast?.("error", `Terjadi kesalahan: ${err.message}`);
    }
  };

  // Handle Delete Promo
  const handleDeletePromo = async (id: string, title: string) => {
    if (!confirm(`Hapus promo "${title}" secara permanen?`)) return;

    try {
      const { error } = await supabase.from("promos").delete().eq("id", id);
      if (error) {
        onToast?.("error", `Gagal menghapus promo: ${error.message}`);
      } else {
        setPromos((prev) => prev.filter((p) => p.id !== id));
        onToast?.("success", `Promo "${title}" berhasil dihapus.`);
      }
    } catch (err: any) {
      onToast?.("error", `Gagal menghapus promo: ${err.message}`);
    }
  };

  // Handle Create Promo Form Submit
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.discount_value || !form.kuota_maksimal) {
      onToast?.("error", "Harap isi semua kolom wajib!");
      return;
    }

    const kuotaMax = parseInt(form.kuota_maksimal, 10);
    if (isNaN(kuotaMax) || kuotaMax <= 0) {
      onToast?.("error", "Maksimal kuota harus berupa angka positif lebih dari 0!");
      return;
    }

    setSubmitting(true);
    try {
      const newPromoPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        target_event: form.target_event,
        kuota_maksimal: kuotaMax,
        kuota_terpakai: 0,
        kapasitas: parseInt(form.kapasitas, 10) || 1,
        kategori_peserta: form.kategori_peserta || "Semua",
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: form.is_active,
      };

      let { data, error } = await supabase
        .from("promos")
        .insert(newPromoPayload)
        .select()
        .single();

      // Graceful fallback if target_event, kuota, kapasitas, or kategori_peserta columns have not yet been migrated in Supabase table
      if (error && (error.message?.includes("target_event") || error.message?.includes("kuota") || error.message?.includes("kapasitas") || error.message?.includes("kategori_peserta") || error.code === "PGRST204")) {
        console.warn("Retrying promo insert with basic schema fallback:", error.message);
        const { target_event: _te, kuota_maksimal: _km, kuota_terpakai: _kt, kapasitas: _kap, kategori_peserta: _kp, ...fallbackPayload } = newPromoPayload;
        const retry = await supabase.from("promos").insert(fallbackPayload).select().single();
        if (!retry.error) {
          error = null;
          data = retry.data;
        }
      }

      if (error) {
        onToast?.("error", `Gagal membuat promo: ${error.message}`);
      } else {
        onToast?.("success", `Promo "${form.title}" berhasil ditambahkan!`);
        if (data) {
          setPromos((prev) => [data as Promo, ...prev]);
        }
        setModalOpen(false);
        // Reset form
        setForm({
          title: "",
          description: "",
          discount_type: "percent",
          discount_value: "",
          target_event: "ColorFun Run",
          kuota_maksimal: "",
          kapasitas: "1",
          kategori_peserta: "Semua",
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          is_active: true,
        });
      }
    } catch (err: any) {
      onToast?.("error", `Gagal membuat promo: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-surface-container/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 relative shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-secondary" />
            Bundling &amp; Promo Control
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">
              promos table
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Kelola penawaran bundling dan diskon promo yang tampil di User Dashboard (Hot Deals)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-tertiary text-primary-container font-bold text-xs uppercase tracking-wider hover:bg-tertiary-fixed transition-all cursor-pointer shadow-lg hover:shadow-tertiary/20"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Promo Baru</span>
        </button>
      </div>

      {/* Promo List */}
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-secondary" />
          Memuat data promo...
        </div>
      ) : promos.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-white/15 text-center text-on-surface-variant text-sm bg-surface-container-low/20">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-40 text-secondary" />
          <p className="font-semibold text-white">Belum Ada Promo Aktif</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">
            Klik tombol &ldquo;Tambah Promo Baru&rdquo; untuk membuat voucher atau bundling diskon tiket.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                promo.is_active
                  ? "bg-surface-container-low/60 border-white/15 shadow-md hover:border-secondary/40"
                  : "bg-surface-container-lowest/30 border-white/5 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
                          promo.discount_type === "percent"
                            ? "bg-secondary/15 text-secondary border-secondary/30"
                            : promo.discount_type === "bundling"
                            ? "bg-tertiary/15 text-tertiary border-tertiary/30"
                            : "bg-[#ffd700]/15 text-[#ffd700] border-[#ffd700]/30"
                        }`}
                      >
                        {promo.discount_type}
                      </span>

                      {/* Event Badge */}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-primary/15 text-primary border-primary/30 inline-flex items-center gap-1">
                        Event: {promo.target_event || "All Events"}
                      </span>

                      {/* Quota Badge */}
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        promo.kuota_maksimal != null && (promo.kuota_terpakai ?? 0) >= promo.kuota_maksimal
                          ? "bg-error/15 text-error border-error/30"
                          : "bg-surface-container-highest text-on-surface-variant border-white/10"
                      }`}>
                        Quota: {promo.kuota_terpakai ?? 0} / {promo.kuota_maksimal != null ? promo.kuota_maksimal : "∞"}
                      </span>

                      {/* Capacity Badge in Admin Central */}
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-secondary/15 text-secondary border-secondary/30 inline-flex items-center gap-1">
                        Kapasitas: {promo.kapasitas || 1} Orang
                      </span>

                      {/* Kategori Peserta Target Badge in Admin Central */}
                      <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded border bg-cyan-500/15 text-cyan-300 border-cyan-500/30 inline-flex items-center gap-1">
                        Target: {promo.kategori_peserta || "Semua"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white">{promo.title}</h3>
                  </div>

                  {/* Active Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={promo.is_active}
                      onChange={() => handleToggleActive(promo)}
                    />
                    <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                <p className="text-xs text-on-surface-variant line-clamp-2 mb-3 font-poppins">
                  {promo.description || "Tidak ada deskripsi"}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(promo.start_date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", month: "short", day: "numeric" })} -{" "}
                    {new Date(promo.end_date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-[#ffd700]">
                    {promo.discount_type === "percent"
                      ? `${promo.discount_value}% OFF`
                      : `Rp ${Number(promo.discount_value).toLocaleString("id-ID")}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeletePromo(promo.id, promo.title)}
                    title="Hapus Promo"
                    className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sub-section: Manajemen Harga & Fase Pendaftaran ── */}
      <div className="mt-10 pt-8 border-t border-white/10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2.5">
              <Banknote className="w-5 h-5 text-[#ffd700]" />
              Manajemen Harga &amp; Fase Pendaftaran
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30 uppercase">
                cms_settings: pricing_tiers
              </span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Atur nama fase aktif (misal: Presale 1, Presale 2, Normal Price) dan nominal biaya pendaftaran (Rp) untuk seluruh 6 sub-event.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSavePricing}
            disabled={savingPricing || loadingPricing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary-container/80 transition-all cursor-pointer shadow-lg hover:shadow-primary-container/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPricing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Harga</span>
              </>
            )}
          </button>
        </div>

        {/* 6 Sub-Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(DEFAULT_PRICING_TIERS) as PricingEvent[]).map((eventKey) => {
            const item = pricingTiers[eventKey] || DEFAULT_PRICING_TIERS[eventKey];
            const eventName = PRICING_EVENT_NAMES[eventKey];

            return (
              <div
                key={eventKey}
                className="p-5 rounded-xl bg-surface-container-low/60 border border-white/10 hover:border-secondary/30 transition-all shadow-md flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="font-semibold text-sm text-white truncate" title={eventName}>
                      {eventName}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-secondary border border-white/10 uppercase">
                      {eventKey}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* a) Nama Fase Aktif */}
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider block mb-1">
                        Nama Fase Aktif
                      </label>
                      <input
                        type="text"
                        value={item.phase}
                        onChange={(e) => handlePricingChange(eventKey, "phase", e.target.value)}
                        placeholder="e.g. Presale 1, Normal Price"
                        className="w-full bg-[#0b1026]/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-secondary focus:outline-none transition-colors"
                      />
                    </div>

                    {/* b) Total Biaya Pendaftaran */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider block">
                          Total Biaya (Rp)
                        </label>
                        <span className="text-xs font-mono font-bold text-[#ffd700]">
                          {formatRupiah(item.price)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={item.price}
                        onChange={(e) => handlePricingChange(eventKey, "price", e.target.value)}
                        className="w-full bg-[#0b1026]/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-secondary focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Status:</span>
                  <span className="text-secondary font-medium">
                    {item.phase} &bull; {formatRupiah(item.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Promo Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0B1026] border border-white/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-tertiary" />
                Buat Promo / Bundling Baru
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePromo} className="flex flex-col gap-4 text-xs font-poppins">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Judul Promo *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. EARLY BIRD COSMIC PASS"
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-secondary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Deskripsi Penawaran
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Jelaskan keuntungan bundle atau potongan harga..."
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:border-secondary outline-none transition-all"
                />
              </div>

              {/* Target Event, Kategori Peserta, Maksimal Kuota & Kapasitas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Target Event *
                  </label>
                  <select
                    required
                    value={form.target_event}
                    onChange={(e) => setForm({ ...form, target_event: e.target.value as PromoTargetEvent })}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-secondary outline-none cursor-pointer"
                  >
                    {PROMO_TARGET_EVENTS.map((evt) => (
                      <option key={evt} value={evt} className="bg-[#0b1026]">
                        {evt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Kategori Peserta *
                  </label>
                  <select
                    value={form.kategori_peserta}
                    onChange={(e) => setForm({ ...form, kategori_peserta: e.target.value })}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-secondary outline-none cursor-pointer font-sans"
                  >
                    {["Semua", "Umum", "Mahasiswa ITS"].map((kat) => (
                      <option key={kat} value={kat} className="bg-[#0b1026]">
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Maksimal Kuota *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.kuota_maksimal}
                    onChange={(e) => setForm({ ...form, kuota_maksimal: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-secondary outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Kapasitas *
                  </label>
                  <select
                    value={form.kapasitas}
                    onChange={(e) => setForm({ ...form, kapasitas: e.target.value })}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-secondary outline-none cursor-pointer font-mono"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num} className="bg-[#0b1026]">
                        {num} Orang
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Tipe Diskon
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:border-secondary outline-none cursor-pointer"
                  >
                    <option value="percent" className="bg-[#0b1026]">Persentase (%)</option>
                    <option value="nominal" className="bg-[#0b1026]">Nominal Potongan (Rp)</option>
                    <option value="bundling" className="bg-[#0b1026]">Harga Paket Bundling (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Nilai Diskon / Harga Paket *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === "percent" ? "e.g. 20 (untuk 20%)" : "e.g. 120000"}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-secondary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-secondary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                    Tanggal Berakhir
                  </label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="promo_is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-white/20 bg-surface-container-high text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="promo_is_active" className="text-xs text-white cursor-pointer font-medium">
                  Langsung aktifkan promo ini di User Dashboard
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-tertiary text-primary-container font-bold text-xs uppercase tracking-wider hover:bg-tertiary-fixed transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan Promo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
