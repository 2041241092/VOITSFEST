import { createClient } from "@/lib/supabase/client";
import { fetchPricingTiers, PricingEvent, DEFAULT_PRICING_TIERS } from "@/lib/pricing";
import { Promo } from "@/types/database";

export interface QuotaStatus {
  maxQuota: number;
  usedQuota: number;
  remainingQuota: number;
  pendingCount: number;
  approvedCount: number;
  isFull: boolean;
}

export type SubEventQuotaMap = Record<PricingEvent, QuotaStatus>;

export interface PromoQuotaStatus {
  promo: Promo;
  maxQuota: number | null;
  isUnlimited: boolean;
  usedQuota: number;
  remainingQuota: number | null;
  pendingCount: number;
  approvedCount: number;
  isFull: boolean;
  isDateStarted: boolean;
  isDateEnded: boolean;
  isAvailable: boolean;
}

/**
 * Normalizes payment / registration status into standard lowercase string.
 */
export function normalizeStatus(status: unknown): string {
  if (typeof status !== "string") return "pending";
  return status.trim().toLowerCase();
}

/**
 * Checks if a status counts towards Used Quota:
 * Count all registrations where status IN ('pending', 'approved', 'verified') (or status != 'rejected').
 */
export function isStatusUsed(status: unknown): boolean {
  const s = normalizeStatus(status);
  return s !== "rejected" && s !== "";
}

/**
 * Checks if a status is approved / verified.
 */
export function isStatusApproved(status: unknown): boolean {
  const s = normalizeStatus(status);
  return s === "approved" || s === "verified";
}

/**
 * Checks if a status is pending.
 */
export function isStatusPending(status: unknown): boolean {
  const s = normalizeStatus(status);
  return s === "pending";
}

/**
 * Fetches real-time quota calculations for all 6 sub-events.
 * Strictly adheres to the formula:
 * - Used Quota: status IN ('pending', 'approved') (or status != 'rejected')
 * - Remaining Quota: Math.max(0, Max Quota - Used Quota)
 */
export async function fetchAllSubEventQuotas(): Promise<SubEventQuotaMap> {
  const supabase = createClient();
  const pricingTiers = await fetchPricingTiers();

  try {
    const [festRes, cfrRes, bpcRes, bccRes, semRes, tenRes, txRes] = await Promise.all([
      supabase.from("festival_registrations").select("id, payment_status"),
      supabase.from("colorfun_registrations").select("id, payment_status"),
      supabase.from("bpc_registrations").select("id, status"),
      supabase.from("bcc_registrations").select("id, status"),
      supabase.from("seminar_registrations").select("id"),
      supabase.from("tenant_registrations").select("id, status"),
      supabase.from("transactions").select("source_id, status, sub_event_type"),
    ]);

    // 1. Festival Quota
    const festRows = festRes.data || [];
    let festPending = 0;
    let festApproved = 0;
    for (const r of festRows) {
      if (isStatusPending(r.payment_status)) festPending++;
      else if (isStatusApproved(r.payment_status)) festApproved++;
    }
    const festUsed = festPending + festApproved;
    const festMax = pricingTiers.festival.max_quota;

    // 2. ColorFun Run Quota
    const cfrRows = cfrRes.data || [];
    let cfrPending = 0;
    let cfrApproved = 0;
    for (const r of cfrRows) {
      if (isStatusPending(r.payment_status)) cfrPending++;
      else if (isStatusApproved(r.payment_status)) cfrApproved++;
    }
    const cfrUsed = cfrPending + cfrApproved;
    const cfrMax = pricingTiers.colorfun.max_quota;

    // Map transactions by source_id for sub-events that track payments in transactions
    const txMap = new Map<string, { status: string; subEvent: string }>();
    (txRes.data || []).forEach((t: any) => {
      if (t.source_id) {
        const sub = (t.sub_event_type || t.source_type || "").toUpperCase();
        txMap.set(t.source_id, { status: normalizeStatus(t.status), subEvent: sub });
      }
    });

    // 3. BPC Quota
    const bpcRows = bpcRes.data || [];
    let bpcPending = 0;
    let bpcApproved = 0;
    for (const r of bpcRows) {
      const txInfo = txMap.get(r.id);
      const effectiveStatus = (txInfo && txInfo.subEvent.includes("BPC")) ? txInfo.status : normalizeStatus(r.status);
      if (effectiveStatus === "rejected") {
        continue; // Released
      } else if (isStatusApproved(effectiveStatus)) {
        bpcApproved++;
      } else {
        bpcPending++;
      }
    }
    const bpcUsed = bpcPending + bpcApproved;
    const bpcMax = pricingTiers.bpc.max_quota;

    // 4. BCC Quota
    const bccRows = bccRes.data || [];
    let bccPending = 0;
    let bccApproved = 0;
    for (const r of bccRows) {
      const txInfo = txMap.get(r.id);
      const effectiveStatus = (txInfo && txInfo.subEvent.includes("BCC")) ? txInfo.status : normalizeStatus(r.status);
      if (effectiveStatus === "rejected") {
        continue; // Released
      } else if (isStatusApproved(effectiveStatus)) {
        bccApproved++;
      } else {
        bccPending++;
      }
    }
    const bccUsed = bccPending + bccApproved;
    const bccMax = pricingTiers.bcc.max_quota;

    // 5. Tenant Quota
    const tenRows = tenRes.data || [];
    let tenPending = 0;
    let tenApproved = 0;
    for (const r of tenRows) {
      const txInfo = txMap.get(r.id);
      const effectiveStatus = (txInfo && txInfo.subEvent.includes("TENANT")) ? txInfo.status : normalizeStatus(r.status);
      if (effectiveStatus === "rejected") {
        continue; // Released
      } else if (isStatusApproved(effectiveStatus)) {
        tenApproved++;
      } else {
        tenPending++;
      }
    }
    const tenUsed = tenPending + tenApproved;
    const tenMax = pricingTiers.tenant.max_quota;

    // 6. Seminar Quota
    // Seminar registrations map to transactions for paid registrants or direct entries
    const semRows = semRes.data || [];
    const semTxMap = new Map<string, string>();
    (txRes.data || [])
      .filter((t) => t.sub_event_type === "SEMINAR" && t.source_id)
      .forEach((t) => {
        semTxMap.set(t.source_id!, normalizeStatus(t.status));
      });

    let semPending = 0;
    let semApproved = 0;
    for (const r of semRows) {
      const txStatus = semTxMap.get(r.id);
      if (txStatus === "rejected") {
        continue; // Rejected transaction -> slot released
      } else if (txStatus === "verified" || txStatus === "approved") {
        semApproved++;
      } else {
        // Unpaid or pending transaction -> pending slot held
        semPending++;
      }
    }
    const semUsed = semPending + semApproved;
    const semMax = pricingTiers.seminar.max_quota;

    return {
      festival: {
        maxQuota: festMax,
        usedQuota: festUsed,
        remainingQuota: Math.max(0, festMax - festUsed),
        pendingCount: festPending,
        approvedCount: festApproved,
        isFull: festUsed >= festMax,
      },
      colorfun: {
        maxQuota: cfrMax,
        usedQuota: cfrUsed,
        remainingQuota: Math.max(0, cfrMax - cfrUsed),
        pendingCount: cfrPending,
        approvedCount: cfrApproved,
        isFull: cfrUsed >= cfrMax,
      },
      bpc: {
        maxQuota: bpcMax,
        usedQuota: bpcUsed,
        remainingQuota: Math.max(0, bpcMax - bpcUsed),
        pendingCount: bpcPending,
        approvedCount: bpcApproved,
        isFull: bpcUsed >= bpcMax,
      },
      bcc: {
        maxQuota: bccMax,
        usedQuota: bccUsed,
        remainingQuota: Math.max(0, bccMax - bccUsed),
        pendingCount: bccPending,
        approvedCount: bccApproved,
        isFull: bccUsed >= bccMax,
      },
      seminar: {
        maxQuota: semMax,
        usedQuota: semUsed,
        remainingQuota: Math.max(0, semMax - semUsed),
        pendingCount: semPending,
        approvedCount: semApproved,
        isFull: semUsed >= semMax,
      },
      tenant: {
        maxQuota: tenMax,
        usedQuota: tenUsed,
        remainingQuota: Math.max(0, tenMax - tenUsed),
        pendingCount: tenPending,
        approvedCount: tenApproved,
        isFull: tenUsed >= tenMax,
      },
    };
  } catch (err) {
    console.error("Error fetching sub-event quotas:", err);
    return {
      festival: createFallbackQuota(pricingTiers.festival.max_quota),
      colorfun: createFallbackQuota(pricingTiers.colorfun.max_quota),
      bpc: createFallbackQuota(pricingTiers.bpc.max_quota),
      bcc: createFallbackQuota(pricingTiers.bcc.max_quota),
      seminar: createFallbackQuota(pricingTiers.seminar.max_quota),
      tenant: createFallbackQuota(pricingTiers.tenant.max_quota),
    };
  }
}

function createFallbackQuota(max: number): QuotaStatus {
  return {
    maxQuota: max,
    usedQuota: 0,
    remainingQuota: max,
    pendingCount: 0,
    approvedCount: 0,
    isFull: false,
  };
}

/**
 * Fetches real-time quota calculations for all active Promos & Bundles.
 * Cross-references both `promos.kuota_terpakai` and actual non-rejected registrations.
 */
export async function fetchPromoQuotas(): Promise<PromoQuotaStatus[]> {
  const supabase = createClient();
  try {
    const { data: promos, error: promoErr } = await supabase
      .from("promos")
      .select("*")
      .order("created_at", { ascending: false });

    if (promoErr || !promos) {
      console.error("Error fetching promos for quota:", promoErr);
      return [];
    }

    // Query registrations with promo_id to get exact pending & approved breakdown
    const [cfrRes, festRes] = await Promise.all([
      supabase.from("colorfun_registrations").select("promo_id, payment_status"),
      supabase.from("festival_registrations").select("promo_id, payment_status"),
    ]);

    const promoPendingMap = new Map<string, number>();
    const promoApprovedMap = new Map<string, number>();

    const allRegs = [...(cfrRes.data || []), ...(festRes.data || [])];
    for (const reg of allRegs) {
      if (!reg.promo_id) continue;
      const pId = reg.promo_id;
      if (isStatusPending(reg.payment_status)) {
        promoPendingMap.set(pId, (promoPendingMap.get(pId) || 0) + 1);
      } else if (isStatusApproved(reg.payment_status)) {
        promoApprovedMap.set(pId, (promoApprovedMap.get(pId) || 0) + 1);
      }
    }

    const now = new Date();
    return (promos as Promo[]).map((promo) => {
      const pendingFromRegs = promoPendingMap.get(promo.id) || 0;
      const approvedFromRegs = promoApprovedMap.get(promo.id) || 0;
      const liveUsedFromRegs = pendingFromRegs + approvedFromRegs;

      // Used quota is the greater of live registrations or stored kuota_terpakai counter
      const usedQuota = Math.max(promo.kuota_terpakai ?? 0, liveUsedFromRegs);
      const isUnlimited = promo.kuota_maksimal == null;
      const maxQuota = isUnlimited ? null : (promo.kuota_maksimal as number);
      const remainingQuota = isUnlimited ? null : Math.max(0, (maxQuota as number) - usedQuota);
      const isFull = !isUnlimited && usedQuota >= (maxQuota as number);

      const nowMs = Date.now();
      const isDateStarted = !promo.start_date || new Date(promo.start_date).getTime() <= nowMs;
      const isDateEnded = Boolean(promo.end_date && !(new Date(promo.end_date).getTime() >= nowMs));
      const isAvailable = promo.is_active && isDateStarted && !isDateEnded && !isFull;

      return {
        promo,
        maxQuota,
        isUnlimited,
        usedQuota,
        remainingQuota,
        pendingCount: pendingFromRegs,
        approvedCount: approvedFromRegs > 0 ? approvedFromRegs : Math.max(0, usedQuota - pendingFromRegs),
        isFull,
        isDateStarted,
        isDateEnded,
        isAvailable,
      };
    });
  } catch (err) {
    console.error("Exception fetching promo quotas:", err);
    return [];
  }
}

/**
 * Validates whether sufficient quota exists before allowing a user to submit checkout.
 * Checks both sub-event capacity and (if applicable) promo/bundle capacity and date validity.
 *
 * Conditions:
 * - Condition 1: If max_quota is NOT null and used_quota >= max_quota, block submission (Sold Out).
 * - Condition 2: If max_quota is null (Unlimited), bypass quota limit check completely.
 * - Condition 3: If current time is outside [start_date, end_date], block submission (Periode Berakhir).
 */
export async function checkQuotaAvailability(
  event: PricingEvent,
  requestedQuantity: number = 1,
  promoId?: string | null
): Promise<{
  available: boolean;
  error?: string;
  remainingSubEventQuota: number;
  remainingPromoQuota?: number | null;
}> {
  const subEventQuotas = await fetchAllSubEventQuotas();
  const eventStatus = subEventQuotas[event] || createFallbackQuota(DEFAULT_PRICING_TIERS[event].max_quota);

  if (eventStatus.remainingQuota < requestedQuantity) {
    return {
      available: false,
      error: `Maaf, sisa kuota tiket untuk ${event.toUpperCase()} tidak mencukupi (Tersisa: ${eventStatus.remainingQuota} tiket). Pendaftaran sementara tidak dapat diproses.`,
      remainingSubEventQuota: eventStatus.remainingQuota,
    };
  }

  if (promoId) {
    const promoQuotas = await fetchPromoQuotas();
    const targetPromo = promoQuotas.find((p) => p.promo.id === promoId);

    if (targetPromo) {
      const now = new Date();

      // Condition 3: Date Range Check
      const nowMs = Date.now();
      if (targetPromo.promo.start_date && new Date(targetPromo.promo.start_date).getTime() > nowMs) {
        return {
          available: false,
          error: `Periode promo/bundling "${targetPromo.promo.title}" belum dimulai.`,
          remainingSubEventQuota: eventStatus.remainingQuota,
          remainingPromoQuota: targetPromo.remainingQuota,
        };
      }

      if (targetPromo.promo.end_date && !(new Date(targetPromo.promo.end_date).getTime() >= nowMs)) {
        return {
          available: false,
          error: `Periode promo/bundling "${targetPromo.promo.title}" telah berakhir.`,
          remainingSubEventQuota: eventStatus.remainingQuota,
          remainingPromoQuota: targetPromo.remainingQuota,
        };
      }

      // Condition 1: Quota Check for limited bundles (max_quota is NOT null)
      if (!targetPromo.isUnlimited && targetPromo.maxQuota != null) {
        if (targetPromo.usedQuota >= targetPromo.maxQuota) {
          return {
            available: false,
            error: `Maaf, kuota untuk promo/bundling "${targetPromo.promo.title}" sudah habis (Sold Out).`,
            remainingSubEventQuota: eventStatus.remainingQuota,
            remainingPromoQuota: 0,
          };
        }

        if ((targetPromo.remainingQuota ?? 0) < requestedQuantity) {
          return {
            available: false,
            error: `Maaf, sisa kuota untuk promo/bundling "${targetPromo.promo.title}" tidak mencukupi (Tersisa: ${targetPromo.remainingQuota}).`,
            remainingSubEventQuota: eventStatus.remainingQuota,
            remainingPromoQuota: targetPromo.remainingQuota,
          };
        }
      }

      // Condition 2: Unlimited Quota (max_quota is null) -> completely bypass promo quota check
      return {
        available: true,
        remainingSubEventQuota: eventStatus.remainingQuota,
        remainingPromoQuota: targetPromo.remainingQuota,
      };
    }
  }

  return {
    available: true,
    remainingSubEventQuota: eventStatus.remainingQuota,
  };
}

/**
 * Dispatches cross-window and component event to re-evaluate quota and refresh all dashboard tables.
 */
export function dispatchQuotaRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("promo-quota-updated"));
    window.dispatchEvent(new CustomEvent("admin-refresh-data"));
  }
}

/**
 * Listens to quota updates dispatched across components and returns an unsubscribe cleanup function.
 */
export function listenToQuotaRefresh(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("promo-quota-updated", handler);
  window.addEventListener("admin-refresh-data", handler);
  return () => {
    window.removeEventListener("promo-quota-updated", handler);
    window.removeEventListener("admin-refresh-data", handler);
  };
}
