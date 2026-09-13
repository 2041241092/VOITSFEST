"use client";

import React, { useState } from "react";
import { Promo } from "@/types/database";
import { validatePromoForEvent, calculatePromoPrice } from "@/lib/promo";
import { formatRupiah } from "@/lib/pricing";
import { Tag, Check, X, AlertCircle, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getEventTimeStatus } from "@/lib/timeUtils";

interface PromoVoucherInputProps {
  activePromos: Promo[];
  targetEventContext: string;
  basePrice: number;
  appliedPromo: Promo | null;
  onApplyPromo: (promo: Promo, discountAmount: number, finalPrice: number) => void;
  onRemovePromo: () => void;
  disabled?: boolean;
}

export default function PromoVoucherInput({
  activePromos,
  targetEventContext,
  basePrice,
  appliedPromo,
  onApplyPromo,
  onRemovePromo,
  disabled = false,
}: PromoVoucherInputProps) {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleApply = async () => {
    setErrorMessage(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMessage("Masukkan kode promo terlebih dahulu.");
      return;
    }

    setIsValidating(true);
    try {
      // 1. Look in activePromos first
      let targetPromo = activePromos.find(
        (p) =>
          p.title.trim().toLowerCase() === trimmed.toLowerCase() ||
          p.id.toLowerCase() === trimmed.toLowerCase()
      );

      // 2. If not found in active list, query database to detect expired/exhausted codes
      if (!targetPromo) {
        const supabase = createClient();
        const { data: dbPromo } = await supabase
          .from("promos")
          .select("*")
          .ilike("title", trimmed)
          .maybeSingle();

        if (!dbPromo) {
          setErrorMessage(`Kode promo "${trimmed}" tidak ditemukan.`);
          return;
        }

        const p = dbPromo as Promo;
        const { isActive } = getEventTimeStatus(p.start_date, p.end_date);
        const isQuotaFull = p.kuota_maksimal !== null && p.kuota_maksimal !== undefined && (p.kuota_terpakai ?? 0) >= p.kuota_maksimal;

        if (!p.is_active || !isActive || isQuotaFull) {
          setErrorMessage("Kode promo sudah melewati periode aktif atau kuota telah habis");
          return;
        }

        targetPromo = p;
      }

      const validation = validatePromoForEvent(targetPromo, targetEventContext, basePrice);
      if (!validation.valid || !validation.promo) {
        if (validation.isExpired || validation.isSoldOut) {
          setErrorMessage("Kode promo sudah melewati periode aktif atau kuota telah habis");
        } else {
          setErrorMessage(validation.error || "Kode promo tidak dapat digunakan.");
        }
        return;
      }

      const { finalPrice, discountAmount } = calculatePromoPrice(validation.promo, basePrice, 1);
      onApplyPromo(validation.promo, discountAmount, finalPrice);
      setCode("");
    } catch (err: any) {
      setErrorMessage("Terjadi kesalahan saat memvalidasi kode promo.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  if (appliedPromo) {
    const { discountAmount, finalPrice } = calculatePromoPrice(appliedPromo, basePrice, 1);
    return (
      <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 space-y-2 animate-in fade-in duration-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>{appliedPromo.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30">
                  {appliedPromo.discount_type === "percent"
                    ? `Diskon ${appliedPromo.discount_value}%`
                    : appliedPromo.discount_type === "nominal"
                    ? `Potongan ${formatRupiah(appliedPromo.discount_value)}`
                    : "Paket Bundling"}
                </span>
              </p>
              <p className="text-[11px] text-slate-300">
                Hemat <strong className="text-secondary font-mono">{formatRupiah(discountAmount)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onRemovePromo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Hapus Promo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="font-semibold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-secondary" />
        Punya Kode Promo / Voucher?
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          disabled={disabled}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Masukkan kode promo..."
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-mono uppercase disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !code.trim() || isValidating}
          onClick={handleApply}
          className="px-5 py-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/40 font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
          {isValidating ? "Memeriksa..." : "Terapkan"}
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-error font-medium animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
