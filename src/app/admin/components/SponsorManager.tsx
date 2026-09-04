"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Handshake, Radio, Plus, Trash2, UploadCloud, X, Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Sponsor } from "@/types/database";

interface SponsorManagerProps {
  onToast?: (type: "success" | "error", message: string) => void;
}

export default function SponsorManager({ onToast }: SponsorManagerProps) {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sponsor" | "media_partner">("sponsor");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [type, setType] = useState<"Sponsor" | "Media Partner">("Sponsor");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching sponsors:", error);
        onToast?.("error", `Gagal memuat partner: ${error.message}`);
      } else {
        setItems((data as Sponsor[]) || []);
      }
    } catch (err: any) {
      console.error("Fetch sponsors error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, onToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Handle Logo File Upload (Upload to 'sponsors_list' bucket)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const { error } = await supabase.storage
        .from("sponsors_list")
        .upload(fileName, file, { upsert: true });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("sponsors_list")
        .getPublicUrl(fileName);

      setLogoUrl(publicUrlData.publicUrl);
      onToast?.("success", "Logo berhasil diunggah!");
    } catch (err: any) {
      console.error("Upload error:", err);
      onToast?.("error", `Gagal mengunggah logo: ${err.message}. Anda dapat memasukkan URL langsung.`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Toggle is_active
  const handleToggleActive = async (item: Sponsor) => {
    const newStatus = !item.is_active;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active: newStatus } : i))
    );

    try {
      const { error } = await supabase
        .from("sponsors")
        .update({ is_active: newStatus })
        .eq("id", item.id);

      if (error) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: item.is_active } : i))
        );
        onToast?.("error", `Gagal memperbarui status: ${error.message}`);
      } else {
        onToast?.(
          "success",
          `Logo "${item.name}" sekarang ${newStatus ? "Ditampilkan" : "Disembunyikan"}.`
        );
      }
    } catch (err: any) {
      onToast?.("error", `Terjadi kesalahan: ${err.message}`);
    }
  };

  // Delete Sponsor / Media Partner
  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Hapus logo "${itemName}"?`)) return;

    try {
      const { error } = await supabase.from("sponsors").delete().eq("id", id);
      if (error) {
        onToast?.("error", `Gagal menghapus: ${error.message}`);
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
        onToast?.("success", `"${itemName}" berhasil dihapus.`);
      }
    } catch (err: any) {
      onToast?.("error", `Gagal menghapus: ${err.message}`);
    }
  };

  // Create new Sponsor / Media Partner
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !logoUrl.trim()) {
      onToast?.("error", "Nama dan Logo wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        logo_url: logoUrl.trim(),
        website_url: websiteUrl.trim() || null,
        type: type,
        category: type === "Media Partner" ? "media_partner" : "sponsor",
        order: Number(order) || 0,
        is_active: isActive,
      };

      const { data, error } = await supabase
        .from("sponsors")
        .insert(payload)
        .select()
        .single();

      if (error) {
        // In case category column doesn't exist on legacy table, retry with type
        if (error.message?.includes("category")) {
          const { data: retryData, error: retryError } = await supabase
            .from("sponsors")
            .insert({
              name: name.trim(),
              logo_url: logoUrl.trim(),
              website_url: websiteUrl.trim() || null,
              type: type,
              order: Number(order) || 0,
              is_active: isActive,
            })
            .select()
            .single();

          if (retryError) throw retryError;
          setItems((prev) => [...prev, retryData as Sponsor]);
        } else {
          throw error;
        }
      } else if (data) {
        setItems((prev) => [...prev, data as Sponsor]);
      }

      onToast?.("success", `"${name}" berhasil ditambahkan ke ${type === "Sponsor" ? "Sponsors" : "Media Partners"}!`);
      setModalOpen(false);

      // Reset
      setName("");
      setLogoUrl("");
      setWebsiteUrl("");
      setType("Sponsor");
      setOrder(0);
      setIsActive(true);
    } catch (err: any) {
      console.error("Create sponsor error:", err);
      onToast?.("error", `Gagal menambahkan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items by type or category
  const filteredItems = items.filter((item) => {
    const itemType = (item.type || item.category || "Sponsor").toString().toLowerCase();
    const isMedPart = itemType.includes("media");
    return activeTab === "media_partner" ? isMedPart : !isMedPart;
  });

  return (
    <section className="bg-surface-container/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 relative shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
            <Handshake className="w-5 h-5 text-secondary" />
            CMS: Sponsors &amp; Media Partner Controller
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">
              sponsors table
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Kelola logo sponsor dan media partner yang tampil di Landing Page utama VOITSFEST
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setType(activeTab === "media_partner" ? "Media Partner" : "Sponsor");
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wider hover:bg-secondary-fixed transition-all cursor-pointer shadow-lg hover:shadow-secondary/20"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Logo Baru</span>
        </button>
      </div>

      {/* Tabs: Sponsors vs Media Partners */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-lowest/60 border border-white/10 rounded-xl mb-6 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("sponsor")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "sponsor"
              ? "bg-secondary text-on-secondary shadow-md"
              : "text-on-surface-variant hover:text-white"
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>Sponsors ({items.filter((i) => !((i.type || i.category || "").toLowerCase().includes("media"))).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("media_partner")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "media_partner"
              ? "bg-secondary text-on-secondary shadow-md"
              : "text-on-surface-variant hover:text-white"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Media Partners ({items.filter((i) => ((i.type || i.category || "").toLowerCase().includes("media"))).length})</span>
        </button>
      </div>

      {/* Grid of Logos */}
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-secondary" />
          Memuat daftar logo...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-white/15 text-center text-on-surface-variant text-sm bg-surface-container-low/20">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-secondary" />
          <p className="font-semibold text-white">
            Belum ada {activeTab === "sponsor" ? "Sponsor" : "Media Partner"} terdaftar
          </p>
          <p className="text-xs text-on-surface-variant/70 mt-1">
            Klik &ldquo;Tambah Logo Baru&rdquo; untuk mengunggah logo ke landing page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${
                item.is_active
                  ? "bg-surface-container-low/50 border-white/15 hover:border-secondary/40 shadow-sm"
                  : "bg-surface-container-lowest/30 border-white/5 opacity-50"
              }`}
            >
              {/* Logo Preview Container */}
              <div className="h-24 bg-white/5 rounded-lg flex items-center justify-center p-3 relative overflow-hidden mb-3 border border-white/5">
                {item.logo_url ? (
                  <img
                    src={item.logo_url}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      // Fallback if image URL fails to load
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/150x80?text=" + encodeURIComponent(item.name);
                    }}
                  />
                ) : (
                  <span className="text-xs text-on-surface-variant italic">No Logo</span>
                )}
                
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono text-white/80">
                  #{item.order}
                </span>
              </div>

              {/* Title & Controls */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <h4 className="font-semibold text-xs text-white truncate" title={item.name}>
                    {item.name}
                  </h4>
                  {item.website_url && (
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary/70 hover:text-secondary shrink-0 p-0.5 transition-colors"
                      title={`Website: ${item.website_url}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  {/* Visibility Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0" title="Toggle Tampilkan/Sembunyikan">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={item.is_active}
                      onChange={() => handleToggleActive(item)}
                    />
                    <div className="w-8 h-4 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    title="Hapus Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0B1026] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-secondary" />
                Tambah {type}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4 text-xs font-poppins">
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Kategori Mitra *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "Sponsor" | "Media Partner")}
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:border-secondary outline-none transition-all cursor-pointer font-sans"
                >
                  <option value="Sponsor" className="bg-[#0b1026] text-white">Sponsor</option>
                  <option value="Media Partner" className="bg-[#0b1026] text-white">Media Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Nama Brand / Partner *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bank Mandiri / RRI Surabaya"
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:border-secondary outline-none transition-all"
                />
              </div>

              {/* Logo Upload or Direct URL */}
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Logo (Upload file atau masukkan URL) *
                </label>

                {/* Upload Button */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-secondary/50 bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengunggah file...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Pilih Gambar dari Perangkat</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct URL input */}
                <input
                  type="url"
                  required
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... (URL logo)"
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:border-secondary outline-none transition-all font-mono"
                />

                {/* Preview if logoUrl is present */}
                {logoUrl && (
                  <div className="mt-2 h-14 bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-center">
                    <img src={logoUrl} alt="Preview" className="max-h-full object-contain" />
                  </div>
                )}
              </div>

              {/* Website URL (Optional) */}
              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Link Tujuan / Website Resmi (Opsional)
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:border-secondary outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-semibold mb-1 uppercase tracking-wider">
                  Urutan Tampilan (Order)
                </label>
                <input
                  type="number"
                  min="0"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface-container-high border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:border-secondary outline-none transition-all font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="sponsor_is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-white/20 bg-surface-container-high text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="sponsor_is_active" className="text-xs text-white cursor-pointer font-medium">
                  Aktifkan &amp; tampilkan di Landing Page
                </label>
              </div>

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
                  className="px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-xs uppercase tracking-wider hover:bg-secondary-fixed transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan Logo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
