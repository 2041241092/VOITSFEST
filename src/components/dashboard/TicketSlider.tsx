"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { Ticket } from "@/types/database";
import { Check, Copy, QrCode, X, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

type TicketSliderProps = {
  tickets: Ticket[];
};

export default function TicketSlider({ tickets }: TicketSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [ticketList, setTicketList] = useState<Ticket[]>(tickets);
  const [modalTicket, setModalTicket] = useState<Ticket | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    setTicketList(tickets);
  }, [tickets]);

  // Real-time synchronization for status updates and scan counts
  useEffect(() => {
    const supabase = createClient();

    const handlePayloadUpdate = (table: string, payload: any) => {
      const updated = payload.new as any;
      if (!updated || !updated.id) return;

      const updatedQR = updated.ticket_qr_code || updated.token || null;
      const updatedStatus = (updated.payment_status || (updated.token ? "verified" : "pending")).toLowerCase();
      const updatedScanCount = updated.scan_count ?? 0;
      const updatedScannedAt = updated.last_scanned_at || updated.scanned_at || null;

      const updatedAmount = updated.amount_paid != null ? Number(updated.amount_paid) : undefined;
      const updatedPhase = updated.ticket_phase || undefined;

      setTicketList(prev => {
        const index = prev.findIndex(t => t.id === updated.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = {
            ...next[index],
            token: updatedQR || next[index].token,
            payment_status: updatedStatus,
            amount_paid: updatedAmount !== undefined ? updatedAmount : next[index].amount_paid,
            ticket_phase: updatedPhase !== undefined ? updatedPhase : next[index].ticket_phase,
            scan_count: updatedScanCount,
            scanned_at: updatedScannedAt,
          };
          return next;
        }
        return prev;
      });

      setModalTicket(prev =>
        prev && prev.id === updated.id
          ? {
              ...prev,
              token: updatedQR || prev.token,
              payment_status: updatedStatus,
              amount_paid: updatedAmount !== undefined ? updatedAmount : prev.amount_paid,
              ticket_phase: updatedPhase !== undefined ? updatedPhase : prev.ticket_phase,
              scan_count: updatedScanCount,
              scanned_at: updatedScannedAt,
            }
          : prev
      );
    };

    const channel = supabase
      .channel("user-ticket-live-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colorfun_registrations" },
        (payload) => handlePayloadUpdate("colorfun_registrations", payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_registrations" },
        (payload) => handlePayloadUpdate("festival_registrations", payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        (payload) => handlePayloadUpdate("tickets", payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (ticketList.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant border-dashed border-white/20 border-2">
        You don't have any active tickets yet. Get yours from the Hot Deals below!
      </div>
    );
  }

  return (
    <div className="relative group/slider">
      {ticketList.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface-container-highest/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-secondary hover:text-primary-container transition-all opacity-0 group-hover/slider:opacity-100 shadow-lg cursor-pointer"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface-container-highest/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-secondary hover:text-primary-container transition-all opacity-0 group-hover/slider:opacity-100 shadow-lg cursor-pointer"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      )}

      <div
        ref={sliderRef}
        className="slider-track flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ticketList.map((ticket) => {
          const status = (ticket.payment_status || "pending").toLowerCase();
          const isVerified = status === "verified";
          const isPending = status === "pending";
          const isRejected = status === "rejected";

          return (
            <div
              key={ticket.id}
              className="glass-card rounded-xl overflow-hidden relative group min-w-full md:min-w-[calc(100%-24px)] snap-center flex-shrink-0"
            >
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#0d1228] rounded-full -translate-y-1/2 border-r border-white/20"></div>
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#0d1228] rounded-full -translate-y-1/2 border-l border-white/20"></div>
              <div className="p-0 flex flex-col md:flex-row">
                {/* Left Card Details */}
                <div className="p-6 flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 border-dashed">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {/* Dynamic Status Indicator */}
                    {isVerified && (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-label-md text-xs rounded-full border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified / Tiket Aktif
                      </span>
                    )}
                    {isPending && (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-label-md text-xs rounded-full border border-amber-500/30 flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending / Menunggu Verifikasi
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-400 font-label-md text-xs rounded-full border border-rose-500/30 flex items-center gap-1.5 font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Ditolak / Pembayaran Tidak Valid
                      </span>
                    )}

                    {/* Event Category Badge */}
                    <span className="px-3 py-1 bg-[#87CEEB]/20 text-[#87CEEB] font-label-md text-xs rounded-full border border-[#87CEEB]/30 font-medium">
                      {ticket.event_type === "FESTIVAL" ? "Festival" : "ColorFun Run"}
                    </span>
                  </div>

                  <h4 className="font-headline-sm text-2xl font-bold mb-1">
                    {ticket.event_type === "FESTIVAL" ? "VOITSFEST Main Festival" : "ColorFun Run (5K)"}
                  </h4>
                  <p className="text-on-surface-variant font-body-md text-sm mb-3">
                    {ticket.event_type === "FESTIVAL" ? "Sat, 24 Oct 2026" : "Sun, 25 Oct 2026"}
                  </p>

                  {/* Dynamic Amount & Phase Badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="font-mono text-sm font-bold text-[#ffd700]">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(ticket.amount_paid || 0)}
                    </span>
                    {ticket.ticket_phase && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
                        {ticket.ticket_phase}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto">
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest">TICKET ID</p>
                    <p className="font-mono text-sm tracking-widest">{ticket.id.split('-')[0].toUpperCase()}</p>
                  </div>
                </div>

                {/* Right QR Code & Scan Status Section */}
                <div className="p-6 md:w-72 flex flex-col items-center justify-center bg-surface-bright/10 backdrop-blur-md">
                  {/* State 1: VERIFIED - Render Active Visual QR Code */}
                  {isVerified && ticket.token ? (
                    <>
                      <div className="bg-white p-3 rounded-xl mb-3 flex items-center justify-center shadow-xl border border-white/20">
                        <QRCodeSVG 
                          value={ticket.token} 
                          size={180} 
                          level="H" 
                          includeMargin={true} 
                        />
                      </div>

                      {/* String Code Beneath QR Code alongside Live Scan Count */}
                      <div className="w-full flex flex-col items-center gap-2 mb-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white bg-surface-container-highest/60 border border-white/10 px-2.5 py-1 rounded-md">
                          <span>{ticket.token}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(ticket.token!)}
                            className="p-1 text-on-surface-variant hover:text-white transition-colors cursor-pointer rounded"
                            title="Salin Kode Tiket"
                          >
                            {copiedToken === ticket.token ? (
                              <Check className="w-3.5 h-3.5 text-tertiary" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Live Scan Count & Metadata */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Sudah di-scan: {ticket.scan_count || 0} kali
                          </span>
                          {ticket.scanned_at && (
                            <span className="text-[10px] font-mono text-on-surface-variant/80">
                              Terakhir: {new Date(ticket.scanned_at).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2 bg-transparent border border-white/20 text-on-surface hover:bg-white/10 transition-colors rounded font-label-md text-sm flex justify-center items-center gap-2 cursor-pointer"
                        onClick={() => setModalTicket(ticket)}
                      >
                        <QrCode className="w-4 h-4" /> Show Full QR
                      </button>
                    </>
                  ) : null}

                  {/* State 2: PENDING - Notice (Do not show QR) */}
                  {isPending && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center flex flex-col items-center justify-center gap-2.5 w-full my-auto animate-in fade-in duration-300">
                      <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <h5 className="text-sm font-bold text-amber-300">Menunggu Verifikasi</h5>
                      <p className="text-xs text-neutral-300 leading-relaxed max-w-[210px]">
                        Tiket QR sedang diproses dan diverifikasi oleh tim panitia VOITSFEST. QR Code aktif akan otomatis muncul di sini.
                      </p>
                    </div>
                  )}

                  {/* State 3: REJECTED - Notice with Re-upload button (Do not show QR) */}
                  {isRejected && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center flex flex-col items-center justify-center gap-2.5 w-full my-auto animate-in fade-in duration-300">
                      <div className="w-11 h-11 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <h5 className="text-sm font-bold text-rose-400">Pembayaran Ditolak</h5>
                      <p className="text-xs text-neutral-300 leading-relaxed max-w-[210px]">
                        Bukti pembayaran tidak valid atau belum sesuai. Silakan lakukan pemesanan atau upload ulang melalui checkout.
                      </p>
                      <Link
                        href={ticket.event_type === "FESTIVAL" ? "/festival/checkout" : "/colorfun/checkout"}
                        className="mt-1 px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition-colors uppercase tracking-wider"
                      >
                        Upload Ulang
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── USER FULL VIEW QR MODAL ── */}
      {modalTicket && modalTicket.token && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setModalTicket(null)}
        >
          <div 
            className="bg-[#0b1026]/95 border border-white/20 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_60px_rgba(0,0,0,0.9)] relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalTicket(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30 mb-2">
              {modalTicket.event_type === "FESTIVAL" ? "VOITSFEST 2026 FESTIVAL" : "COLORFUN RUN (5K)"}
            </span>
            <h3 className="text-xl font-bold text-white mb-1">
              {modalTicket.event_type === "FESTIVAL" ? "Official Festival Pass" : "ColorFun Run E-Ticket"}
            </h3>
            <p className="text-xs text-on-surface-variant mb-2">
              Tunjukkan QR Code ini kepada Petugas Security di Gate Masuk.
            </p>

            {/* Dynamic Amount & Phase Badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="font-mono text-sm font-bold text-[#ffd700]">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(modalTicket.amount_paid || 0)}
              </span>
              {modalTicket.ticket_phase && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/30">
                  {modalTicket.ticket_phase}
                </span>
              )}
            </div>

            {/* High-res Visual QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-2xl border border-white/30 mb-4 flex items-center justify-center">
              <QRCodeSVG 
                value={modalTicket.token} 
                size={220} 
                level="H" 
                includeMargin={true} 
              />
            </div>

            {/* String Code Beneath QR Code */}
            <div className="flex items-center gap-2 bg-surface-container-highest/60 border border-white/15 px-3.5 py-1.5 rounded-lg mb-4">
              <span className="font-mono text-sm font-bold text-secondary tracking-wider">
                {modalTicket.token}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(modalTicket.token!)}
                className="p-1 text-on-surface-variant hover:text-white transition-colors cursor-pointer rounded"
                title="Salin Kode Tiket"
              >
                {copiedToken === modalTicket.token ? (
                  <Check className="w-3.5 h-3.5 text-tertiary" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Scan Status Badge (scan_count) */}
            <div className="w-full flex flex-col items-center gap-2 pt-3 border-t border-white/10">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Status Pemindaian Tiket
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sudah di-scan: {modalTicket.scan_count || 0} kali
              </span>

              {modalTicket.scanned_at && (
                <p className="text-[11px] font-mono text-on-surface-variant/80 mt-1">
                  Waktu Scan Terakhir: {new Date(modalTicket.scanned_at).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
