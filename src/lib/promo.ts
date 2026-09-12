import { Promo } from "@/types/database";

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promo?: Promo;
  discountAmount?: number;
  finalPrice?: number;
}

/**
 * Calculates promo pricing according to strict VOITSFEST rules:
 * - Tipe A (percent): Final Price = (Base Phase Price * Kapasitas) * (1 - Nilai Diskon / 100)
 * - Tipe B (nominal): Final Price = (Base Phase Price * Kapasitas) - Nilai Diskon
 * - Tipe C (bundling): Final Price = Nilai Diskon (Direct override to entered package price)
 */
export function calculatePromoPrice(
  promo: Promo | null | undefined,
  basePhasePrice: number,
  customKapasitas?: number
): { finalPrice: number; discountAmount: number; totalBasePrice: number } {
  const cap = customKapasitas && customKapasitas >= 1
    ? customKapasitas
    : (promo?.kapasitas && promo.kapasitas >= 1 ? promo.kapasitas : 1);
  const totalBasePrice = basePhasePrice * cap;

  if (!promo) {
    return { finalPrice: totalBasePrice, discountAmount: 0, totalBasePrice };
  }

  const discountVal = Number(promo.discount_value) || 0;
  let finalPrice = totalBasePrice;

  if (promo.discount_type === "percent") {
    finalPrice = Math.round(totalBasePrice * (1 - discountVal / 100));
  } else if (promo.discount_type === "nominal") {
    finalPrice = totalBasePrice - discountVal;
  } else if (promo.discount_type === "bundling") {
    finalPrice = discountVal;
  }

  finalPrice = Math.max(0, Math.round(finalPrice));
  const discountAmount = Math.max(0, totalBasePrice - finalPrice);

  return { finalPrice, discountAmount, totalBasePrice };
}

/**
 * Validates a promo code strictly according to VOITSFEST rules:
 * 1. Exists & active
 * 2. Date-based validity (start_date <= now <= end_date)
 * 3. Event Target match (promo.target_event === currentEventContext)
 * 4. Quota check (promo.kuota_terpakai < promo.kuota_maksimal)
 */
export function validatePromoForEvent(
  promo: Promo | null | undefined,
  currentEventContext: string,
  basePrice: number,
  customKapasitas?: number
): PromoValidationResult {
  if (!promo) {
    return { valid: false, error: "Kode promo tidak ditemukan." };
  }

  // 1. Check if active
  if (!promo.is_active) {
    return { valid: false, error: "Kode promo sedang tidak aktif." };
  }

  // 2. Date-based expiration check
  const now = new Date();
  if (promo.start_date && new Date(promo.start_date) > now) {
    return { valid: false, error: "Periode promo belum dimulai." };
  }
  if (promo.end_date && new Date(promo.end_date) < now) {
    return { valid: false, error: "Kode promo telah kedaluwarsa." };
  }

  // 3. Validation Rule 1 (Event Match):
  // Before applying a promo, verify that promo.target_event matches current page's event context.
  if (!promo.target_event || promo.target_event.trim().toLowerCase() !== currentEventContext.trim().toLowerCase()) {
    return { valid: false, error: "Kode promo tidak berlaku untuk event ini." };
  }

  // 4. Validation Rule 2 (Quota Check):
  // Check if (promo.kuota_terpakai >= promo.kuota_maksimal).
  if (
    promo.kuota_maksimal != null &&
    promo.kuota_maksimal > 0 &&
    (promo.kuota_terpakai ?? 0) >= promo.kuota_maksimal
  ) {
    return { valid: false, error: "Maaf, kuota promo ini sudah habis." };
  }

  const { finalPrice, discountAmount } = calculatePromoPrice(promo, basePrice, customKapasitas);

  return {
    valid: true,
    promo,
    discountAmount,
    finalPrice,
  };
}

/**
 * Increments kuota_terpakai for a specific promo in Supabase upon successful checkout.
 * Increments by the bundle capacity (default 1).
 */
export async function incrementPromoQuota(
  supabase: any,
  promoId: string,
  amount: number = 1
): Promise<{ success: boolean; error?: any }> {
  if (!promoId) return { success: false, error: "No promo ID provided" };
  const incrementStep = Math.max(1, amount || 1);

  // 1. Primary: Execute Supabase RPC function increment_promo_quota
  try {
    const { error: rpcError } = await supabase.rpc("increment_promo_quota", {
      p_promo_id: promoId,
      p_amount: incrementStep,
    });
    if (!rpcError) {
      return { success: true };
    }
    console.warn("RPC increment_promo_quota error, trying direct update fallback:", rpcError);
  } catch (rpcErr) {
    console.warn("RPC increment_promo_quota exception, trying direct update fallback:", rpcErr);
  }

  // 2. Fallback: Direct DB query update
  try {
    const { data, error } = await supabase
      .from("promos")
      .select("kuota_terpakai")
      .eq("id", promoId)
      .single();

    if (error) {
      console.warn("Could not fetch current promo quota to increment:", error.message);
      return { success: false, error };
    }

    const currentQuota = data?.kuota_terpakai ?? 0;
    const { error: updateError } = await supabase
      .from("promos")
      .update({ kuota_terpakai: currentQuota + incrementStep })
      .eq("id", promoId);

    if (updateError) {
      console.warn("Could not increment promo kuota_terpakai:", updateError.message);
      return { success: false, error: updateError };
    }
    return { success: true };
  } catch (err) {
    console.warn("Exception incrementing promo quota:", err);
    return { success: false, error: err };
  }
}

/**
 * Decrements kuota_terpakai for a specific promo in Supabase when Admin rejects a payment.
 * Restores quota by the bundle capacity or participant count (ensuring it never drops below 0).
 */
export async function decrementPromoQuota(
  supabase: any,
  promoId: string,
  amount: number = 1
): Promise<{ success: boolean; error?: any }> {
  if (!promoId) return { success: false, error: "No promo ID provided" };
  const decrementStep = Math.max(1, amount || 1);

  // 1. Primary: Execute Supabase RPC function decrement_promo_quota
  try {
    const { error: rpcError } = await supabase.rpc("decrement_promo_quota", {
      p_promo_id: promoId,
      p_amount: decrementStep,
    });
    if (!rpcError) {
      return { success: true };
    }
    console.warn("RPC decrement_promo_quota error, trying direct update fallback:", rpcError);
  } catch (rpcErr) {
    console.warn("RPC decrement_promo_quota exception, trying direct update fallback:", rpcErr);
  }

  // 2. Fallback: Direct DB query update
  try {
    const { data, error } = await supabase
      .from("promos")
      .select("kuota_terpakai")
      .eq("id", promoId)
      .single();

    if (error) {
      console.warn("Could not fetch current promo quota to decrement:", error.message);
      return { success: false, error };
    }

    const currentQuota = data?.kuota_terpakai ?? 0;
    const newQuota = Math.max(0, currentQuota - decrementStep);
    const { error: updateError } = await supabase
      .from("promos")
      .update({ kuota_terpakai: newQuota })
      .eq("id", promoId);

    if (updateError) {
      console.warn("Could not decrement promo kuota_terpakai:", updateError.message);
      return { success: false, error: updateError };
    }
    return { success: true };
  } catch (err) {
    console.warn("Exception decrementing promo quota:", err);
    return { success: false, error: err };
  }
}

/**
 * Quota Rollback on Admin Payment Rejection:
 * Checks if rejected registration was associated with a promo_id (or promo metadata in ticket_phase).
 * If yes, calculates the number of participants tied to that rejected group_id (or fallback count)
 * and decrements kuota_terpakai in the promos table (ensuring it never drops below 0).
 */
export async function rollbackPromoQuotaOnReject(
  supabase: any,
  options: {
    ticketPhase?: string | null;
    promoId?: string | null;
    groupId?: string | null;
    tableName?: "colorfun_registrations" | "festival_registrations" | "transactions" | string | null;
    fallbackCount?: number;
  }
): Promise<void> {
  const { ticketPhase, promoId: directPromoId, groupId, tableName, fallbackCount = 1 } = options;

  let promoIdToRevert = directPromoId || null;
  let countToRevert = fallbackCount;

  // 1. If groupId and tableName are available, count the actual participants tied to that group_id
  if (groupId && tableName && tableName !== "transactions") {
    try {
      const { count } = await supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (count && count > 0) {
        countToRevert = count;
      }
    } catch (countErr) {
      console.warn("Could not count group participants for promo rollback:", countErr);
    }
  }

  // 2. If no direct promoId provided, extract from ticketPhase
  if (!promoIdToRevert && ticketPhase) {
    // Pattern: [PROMO:uuid:capacity]
    const match = ticketPhase.match(/\[PROMO:([^:\]]+)(?::(\d+))?\]/);
    if (match) {
      promoIdToRevert = match[1];
      const encodedCap = parseInt(match[2] || "1", 10);
      if (countToRevert <= 1 && encodedCap > 1) {
        countToRevert = encodedCap;
      }
    } else {
      // Fallback: check promo by title
      try {
        const { data: promoByTitle } = await supabase
          .from("promos")
          .select("id, kapasitas")
          .eq("title", ticketPhase.trim())
          .maybeSingle();

        if (promoByTitle?.id) {
          promoIdToRevert = promoByTitle.id;
          if (countToRevert <= 1 && promoByTitle.kapasitas) {
            countToRevert = promoByTitle.kapasitas;
          }
        }
      } catch (err) {
        console.warn("Could not find promo by title:", err);
      }
    }
  }

  // 3. Decrement promo quota if promoId was found
  if (promoIdToRevert) {
    await decrementPromoQuota(supabase, promoIdToRevert, countToRevert);
  }
}

