"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Save, Calendar, Clock, MapPin, X, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { parseEventDetails } from "@/lib/cms";
import { toLocalISOString, wibDatetimeLocalToIso, formatWIB } from "@/lib/date";
import PromoManager from "./PromoManager";
import SponsorManager from "./SponsorManager";

export default function CMSManager() {
  const [loading, setLoading] = useState(true);
  const [savingGateways, setSavingGateways] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Floating Toast feedback state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 1. Gateways Toggles
  const [gateways, setGateways] = useState<Record<string, boolean>>({
    bpc: true,
    bcc: true,
    seminar: true,
    tenant: true,
    cfr: true,
    festival: true,
  });

  // 2. Event Details Control (key: 'event_details')
  const [eventDetailsActive, setEventDetailsActive] = useState(true);
  const [festivalDetails, setFestivalDetails] = useState({
    date: "2026-10-24",
    time: "15:00",
    location: "Graha Sepuluh Nopember, Surabaya",
  });
  const [cfrDetails, setCfrDetails] = useState({
    date: "2026-10-25",
    time: "06:00",
    location: "Lapangan Rektorat ITS, Surabaya",
  });

  // 3. Countdown Integration (key: 'countdown', key: 'countdown_target')
  const [countdownActive, setCountdownActive] = useState(true);
  const [countdownTarget, setCountdownTarget] = useState("2026-10-24T09:00");
  const [countdownDesc, setCountdownDesc] = useState("Early Bird Ticket Sales Closing Soon");

  const supabase = createClient();

  // Fetch all CMS settings from Supabase cms_settings table
  const fetchCMS = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("cms_settings").select("*");

      if (data && !error) {
        // Gateways
        const gatewaysRecord = data.find((item) => item.key === "gateways");
        if (gatewaysRecord && typeof gatewaysRecord.value === "object" && gatewaysRecord.value !== null) {
          const gVal = gatewaysRecord.value as Record<string, unknown>;
          setGateways({
            bpc: gVal.bpc !== undefined ? Boolean(gVal.bpc) : true,
            bcc: gVal.bcc !== undefined ? Boolean(gVal.bcc) : true,
            seminar: gVal.seminar !== undefined ? Boolean(gVal.seminar) : true,
            tenant: gVal.tenant !== undefined ? Boolean(gVal.tenant) : true,
            cfr: gVal.cfr !== undefined ? Boolean(gVal.cfr) : true,
            festival: gVal.festival !== undefined ? Boolean(gVal.festival) : true,
          });
        }

        // Event Details (key: 'event_details')
        const eventDetailsRecord = data.find((item) => item.key === "event_details");
        if (eventDetailsRecord) {
          setEventDetailsActive(parseEventDetails(eventDetailsRecord.value));
          if (typeof eventDetailsRecord.value === "object" && eventDetailsRecord.value !== null) {
            const ev = eventDetailsRecord.value as any;
            if (ev.festival) setFestivalDetails((prev) => ({ ...prev, ...ev.festival }));
            if (ev.cfr) setCfrDetails((prev) => ({ ...prev, ...ev.cfr }));
          }
        }

        // Countdown toggle & description (key: 'countdown')
        const countdownRecord = data.find((item) => item.key === "countdown");
        if (countdownRecord) {
          if (typeof countdownRecord.value === "object" && countdownRecord.value !== null) {
            const cd = countdownRecord.value as any;
            if (cd.active !== undefined) setCountdownActive(Boolean(cd.active));
            if (cd.description) setCountdownDesc(cd.description);
            if (cd.date) setCountdownTarget(toLocalISOString(cd.date));
          } else {
            setCountdownActive(Boolean(countdownRecord.value));
          }
        }

        // Countdown target DateTime picker (key: 'countdown_target')
        const targetRecord = data.find((item) => item.key === "countdown_target");
        if (targetRecord && targetRecord.value) {
          const rawTarget = typeof targetRecord.value === "string" 
            ? targetRecord.value 
            : JSON.stringify(targetRecord.value).replace(/"/g, "");
          if (rawTarget) setCountdownTarget(toLocalISOString(rawTarget));
        }

        // Countdown label (key: 'countdown_label')
        const labelRecord = data.find((item) => item.key === "countdown_label");
        if (labelRecord && labelRecord.value) {
          const rawLabel = typeof labelRecord.value === "string"
            ? labelRecord.value
            : JSON.stringify(labelRecord.value).replace(/"/g, "");
          if (rawLabel) setCountdownDesc(rawLabel);
        }

        // Legacy individual details fallback
        const festLegacy = data.find((item) => item.key === "festival_details");
        if (festLegacy && festLegacy.value) {
          setFestivalDetails((prev) => ({ ...prev, ...festLegacy.value }));
        }
        const cfrLegacy = data.find((item) => item.key === "cfr_details");
        if (cfrLegacy && cfrLegacy.value) {
          setCfrDetails((prev) => ({ ...prev, ...cfrLegacy.value }));
        }
      } else if (error) {
        showToast("error", `Gagal memuat cms_settings: ${error.message}`);
      }
    } catch (err: any) {
      console.error("fetchCMS error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    fetchCMS();
  }, [fetchCMS]);

  // Save Registration Status (Gateways)
  const handleSaveToggles = async () => {
    setSavingGateways(true);
    try {
      const now = new Date().toISOString();
      const updates = [
        {
          key: "gateways",
          value: gateways,
          updated_at: now,
        },
        { key: "registration_open_bpc", value: gateways.bpc, updated_at: now },
        { key: "registration_open_bcc", value: gateways.bcc, updated_at: now },
        { key: "registration_open_seminar", value: gateways.seminar, updated_at: now },
        { key: "registration_open_tenant", value: gateways.tenant, updated_at: now },
        { key: "registration_open_cfr", value: gateways.cfr, updated_at: now },
        { key: "registration_open_festival", value: gateways.festival, updated_at: now },
      ];

      const { error } = await supabase.from("cms_settings").upsert(updates);

      if (error) {
        showToast("error", `Gagal menyimpan gateways: ${error.message}`);
      } else {
        showToast("success", "Status Gateway Pendaftaran berhasil disimpan!");
      }
    } catch (err: any) {
      showToast("error", `Error: ${err.message}`);
    } finally {
      setSavingGateways(false);
    }
  };

  // Immediate toggle for Event Details (updates cms_settings immediately and shows toast notification)
  const handleToggleEventDetails = async (checked: boolean) => {
    setEventDetailsActive(checked);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("cms_settings").upsert({
        key: "event_details",
        value: checked,
        updated_at: now,
      });

      if (error) {
        showToast("error", `Gagal memperbarui status Event Details: ${error.message}`);
        setEventDetailsActive(!checked);
      } else {
        showToast(
          "success",
          `Status Event Details berhasil diperbarui menjadi ${checked ? "AKTIF" : "NONAKTIF"}!`
        );
      }
    } catch (err: any) {
      showToast("error", `Error: ${err.message}`);
      setEventDetailsActive(!checked);
    }
  };

  // Save Event Details & Countdown Settings (key: 'event_details', key: 'countdown', key: 'countdown_target')
  const handleSaveEventAndCountdown = async () => {
    setSavingDetails(true);
    try {
      const now = new Date().toISOString();
      const updates = [
        {
          key: "event_details",
          value: eventDetailsActive,
          updated_at: now,
        },
        {
          key: "countdown",
          value: {
            active: countdownActive,
            description: countdownDesc,
            date: wibDatetimeLocalToIso(countdownTarget) || countdownTarget,
          },
          updated_at: now,
        },
        {
          key: "countdown_target",
          value: wibDatetimeLocalToIso(countdownTarget) || countdownTarget,
          updated_at: now,
        },
        {
          key: "countdown_label",
          value: countdownDesc,
          updated_at: now,
        },
        {
          key: "festival_details",
          value: festivalDetails,
          updated_at: now,
        },
        {
          key: "cfr_details",
          value: cfrDetails,
          updated_at: now,
        },
      ];

      const { error } = await supabase.from("cms_settings").upsert(updates);

      if (error) {
        showToast("error", `Gagal menyimpan pengaturan: ${error.message}`);
      } else {
        showToast("success", "Pengaturan Event Details & Countdown berhasil disimpan ke cms_settings!");
      }
    } catch (err: any) {
      showToast("error", `Error: ${err.message}`);
    } finally {
      setSavingDetails(false);
    }
  };

  const gatewayItems = [
    { key: "bpc", label: "BPC", sub: "Business Plan Competition" },
    { key: "bcc", label: "BCC", sub: "Business Case Competition" },
    { key: "seminar", label: "Seminar", sub: "Cosmic Seminar Kewirausahaan" },
    { key: "tenant", label: "Tenant", sub: "Tenant & Expo Bazaar" },
    { key: "cfr", label: "CFR", sub: "ColorFun Run" },
    { key: "festival", label: "Festival", sub: "VOITS Music Festival" },
  ];

  if (loading) {
    return (
      <div className="p-12 text-center text-on-surface-variant font-poppins text-sm flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-secondary border-t-transparent animate-spin"></div>
        <span>Memuat CMS Controls &amp; Settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 relative">
      {/* Floating Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-24 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              : "bg-red-950/90 border-red-500/40 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold font-poppins">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Registration Toggles (Gateways) */}
      <section id="cms-gateways" className="bg-surface-container/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 relative scroll-mt-28 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-secondary" />
              Registration Status (Gateways)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">
                cms_settings: gateways
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Mengontrol akses pendaftaran publik. Jika ditutup (Off), pengunjung otomatis dialihkan ke <code className="text-secondary font-mono">/registration-closed</code>.
            </p>
          </div>
          <button
            onClick={handleSaveToggles}
            disabled={savingGateways}
            className="bg-secondary text-on-secondary px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-secondary/20 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {savingGateways ? "Menyimpan..." : "Save Toggles"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gatewayItems.map((item) => {
            const isOpen = gateways[item.key] ?? false;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isOpen
                    ? "bg-surface-container-low/60 border-white/15 shadow-[0_0_15px_rgba(46,78,143,0.15)]"
                    : "bg-surface-container-lowest/30 border-white/5 opacity-60"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        isOpen
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                      }`}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant mt-0.5">
                    {item.sub}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isOpen}
                    onChange={(e) => setGateways({ ...gateways, [item.key]: e.target.checked })}
                  />
                  <div className="w-10 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Event Details & Countdown Controller */}
      <section className="bg-surface-container/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 relative shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-secondary" />
              CMS: Event Details &amp; Countdown
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tertiary/15 text-tertiary border border-tertiary/30 uppercase">
                event_details &bull; countdown &bull; countdown_target
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Atur status visibility komponen event, target waktu countdown timer, dan jadwal pelaksanaan acara.
            </p>
          </div>

          <button
            onClick={handleSaveEventAndCountdown}
            disabled={savingDetails}
            className="bg-secondary text-on-secondary px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-secondary/20 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {savingDetails ? "Menyimpan..." : "Save Event Details & Countdown"}
          </button>
        </div>

        {/* Master Toggles Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-surface-container-low/40 border border-white/10">
          {/* Toggle: Event Details */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">Event Details Section</p>
              <p className="text-[11px] text-on-surface-variant">Tampilkan rincian tanggal, waktu, dan lokasi acara</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={eventDetailsActive}
                onChange={(e) => handleToggleEventDetails(e.target.checked)}
              />
              <div className="w-10 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>

          {/* Toggle: Countdown */}
          <div className="flex items-center justify-between border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">Countdown Landing Page</p>
              <p className="text-[11px] text-on-surface-variant">Tampilkan live timer hitung mundur di banner utama</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={countdownActive}
                onChange={(e) => setCountdownActive(e.target.checked)}
              />
              <div className="w-10 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tertiary"></div>
            </label>
          </div>
        </div>

        {/* Countdown Target Date/Time Picker Card */}
        <div className={`p-5 rounded-xl border mb-6 transition-all ${
          countdownActive ? "bg-surface-container-low/50 border-white/15" : "bg-surface-container-lowest/20 border-white/5 opacity-60"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-tertiary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Target Countdown Timer (key: &lsquo;countdown_target&rsquo;)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Target Date &amp; Time Picker *
              </label>
              <input
                type="datetime-local"
                value={countdownTarget}
                onChange={(e) => setCountdownTarget(e.target.value)}
                className="w-full bg-surface-container border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-secondary outline-none transition-all font-mono"
              />
              {countdownTarget && (
                <p className="text-[11px] text-secondary font-mono mt-1">
                  Target WIB: {formatWIB(wibDatetimeLocalToIso(countdownTarget))}
                </p>
              )}
              <p className="text-[11px] text-on-surface-variant/70 mt-1">
                Waktu batas hitung mundur yang akan dihitung langsung oleh timer di halaman depan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Deskripsi / Label Countdown
              </label>
              <input
                type="text"
                value={countdownDesc}
                onChange={(e) => setCountdownDesc(e.target.value)}
                placeholder="e.g. Early Bird Ticket Closes In..."
                className="w-full bg-surface-container border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-secondary outline-none transition-all"
              />
              <p className="text-[11px] text-on-surface-variant/70 mt-1">
                Teks konteks yang muncul di atas atau dekat kotak timer hitung mundur.
              </p>
            </div>
          </div>
        </div>

        {/* Event Schedule Details (Festival & CFR) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all ${
          eventDetailsActive ? "" : "opacity-50 pointer-events-none"
        }`}>
          {/* Festival Card */}
          <div className="border border-white/15 rounded-xl p-5 bg-surface-container-low/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Sparkles className="w-4 h-4 text-secondary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Festival Details</h3>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={festivalDetails.date}
                onChange={(e) => setFestivalDetails({ ...festivalDetails, date: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Waktu Acara
              </label>
              <input
                type="time"
                value={festivalDetails.time}
                onChange={(e) => setFestivalDetails({ ...festivalDetails, time: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Lokasi Venue
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={festivalDetails.location}
                  onChange={(e) => setFestivalDetails({ ...festivalDetails, location: e.target.value })}
                  placeholder="e.g. Graha Sepuluh Nopember"
                  className="w-full bg-surface border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:border-secondary outline-none"
                />
              </div>
            </div>
          </div>

          {/* ColorFun Run Card */}
          <div className="border border-white/15 rounded-xl p-5 bg-surface-container-low/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Sparkles className="w-4 h-4 text-tertiary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">ColorFun Run Details</h3>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={cfrDetails.date}
                onChange={(e) => setCfrDetails({ ...cfrDetails, date: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Waktu Acara
              </label>
              <input
                type="time"
                value={cfrDetails.time}
                onChange={(e) => setCfrDetails({ ...cfrDetails, time: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Lokasi Venue
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cfrDetails.location}
                  onChange={(e) => setCfrDetails({ ...cfrDetails, location: e.target.value })}
                  placeholder="e.g. Lapangan Rektorat ITS"
                  className="w-full bg-surface border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:border-secondary outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bundling & Promo Control (promos table) */}
      <PromoManager onToast={showToast} />

      {/* 4. Sponsors & Media Partner Controller (sponsors table) */}
      <SponsorManager onToast={showToast} />
    </div>
  );
}
