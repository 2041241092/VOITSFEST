import { createClient } from "@/lib/supabase/client";

export type PricingEvent = "festival" | "colorfun" | "seminar" | "bcc" | "bpc" | "tenant";

export interface SubEventTierConfig {
  phase: string;
  price: number;
  phase_quota: number | null; // Total Kuota Fase Pendaftaran (null = unlimited)
  event_quota: number | null; // Total Kuota Slot Peserta Sub-Event (null = unlimited)

  // Backward compatibility & lifecycle fields
  start_date?: string | null;
  end_date?: string | null;
  total_event_quota?: number | null; // Alias for event_quota
  max_quota?: number; // Legacy fallback
}

// Backward compatibility alias for existing code
export type EventPricing = SubEventTierConfig;

export interface PricingTiersConfig {
  festival: SubEventTierConfig;
  colorfun: SubEventTierConfig;
  seminar: SubEventTierConfig;
  bcc: SubEventTierConfig;
  bpc: SubEventTierConfig;
  tenant: SubEventTierConfig;
}

export const DEFAULT_PRICING_TIERS: PricingTiersConfig = {
  festival: {
    phase: "Presale 2",
    price: 75000,
    start_date: null,
    end_date: null,
    phase_quota: 250,
    event_quota: 500,
    total_event_quota: 500,
    max_quota: 500,
  },
  colorfun: {
    phase: "Normal Price",
    price: 75000,
    start_date: null,
    end_date: null,
    phase_quota: 250,
    event_quota: 500,
    total_event_quota: 500,
    max_quota: 500,
  },
  seminar: {
    phase: "Normal Price",
    price: 10000,
    start_date: null,
    end_date: null,
    phase_quota: 150,
    event_quota: 300,
    total_event_quota: 300,
    max_quota: 300,
  },
  bcc: {
    phase: "Batch 1",
    price: 79000,
    start_date: null,
    end_date: null,
    phase_quota: 50,
    event_quota: 100,
    total_event_quota: 100,
    max_quota: 100,
  },
  bpc: {
    phase: "Batch 1",
    price: 79000,
    start_date: null,
    end_date: null,
    phase_quota: 50,
    event_quota: 100,
    total_event_quota: 100,
    max_quota: 100,
  },
  tenant: {
    phase: "Regular",
    price: 10000,
    start_date: null,
    end_date: null,
    phase_quota: 25,
    event_quota: 50,
    total_event_quota: 50,
    max_quota: 50,
  },
};

export const PRICING_EVENT_NAMES: Record<PricingEvent, string> = {
  festival: "VOITS Music Festival",
  colorfun: "ColorFun Run 5K",
  seminar: "Cosmic Seminar Kewirausahaan",
  bcc: "Business Case Competition (BCC)",
  bpc: "Business Plan Competition (BPC)",
  tenant: "Tenant & Expo Bazaar",
};

function parseEventPricing(val: any, def: SubEventTierConfig): SubEventTierConfig {
  // CRITICAL RULE: Maintain backward compatibility if existing records still use max_quota by falling back event_quota = item.event_quota ?? item.max_quota
  let eventQuota: number | null = def.event_quota;
  if (val?.event_quota === null) {
    eventQuota = null;
  } else if (typeof val?.event_quota === "number" && val.event_quota > 0) {
    eventQuota = val.event_quota;
  } else if (val?.total_event_quota === null) {
    eventQuota = null;
  } else if (typeof val?.total_event_quota === "number" && val.total_event_quota > 0) {
    eventQuota = val.total_event_quota;
  } else if (typeof val?.max_quota === "number" && val.max_quota > 0) {
    eventQuota = val.max_quota;
  } else if (val?.event_quota !== undefined) {
    eventQuota = null;
  }

  let phaseQuota: number | null = def.phase_quota;
  if (val?.phase_quota === null) {
    phaseQuota = null;
  } else if (typeof val?.phase_quota === "number" && val.phase_quota > 0) {
    phaseQuota = val.phase_quota;
  } else if (val?.phase_quota !== undefined) {
    phaseQuota = null;
  }

  const effectiveEventQuota = eventQuota;

  return {
    phase: val?.phase || def.phase,
    price: typeof val?.price === "number" ? val.price : def.price,
    start_date: val?.start_date || def.start_date || null,
    end_date: val?.end_date || def.end_date || null,
    phase_quota: phaseQuota,
    event_quota: effectiveEventQuota,
    total_event_quota: effectiveEventQuota,
    max_quota: effectiveEventQuota ?? def.max_quota ?? 500,
  };
}

export function parsePricingTiersConfig(val: any): PricingTiersConfig {
  if (!val) return { ...DEFAULT_PRICING_TIERS };
  return {
    festival: parseEventPricing(val.festival, DEFAULT_PRICING_TIERS.festival),
    colorfun: parseEventPricing(val.colorfun, DEFAULT_PRICING_TIERS.colorfun),
    seminar: parseEventPricing(val.seminar, DEFAULT_PRICING_TIERS.seminar),
    bcc: parseEventPricing(val.bcc, DEFAULT_PRICING_TIERS.bcc),
    bpc: parseEventPricing(val.bpc, DEFAULT_PRICING_TIERS.bpc),
    tenant: parseEventPricing(val.tenant, DEFAULT_PRICING_TIERS.tenant),
  };
}

/**
 * Fetches dynamic pricing and phase configuration from Supabase cms_settings (key: 'pricing_tiers').
 * Falls back safely to default values if not yet configured.
 */
export async function fetchPricingTiers(supabaseClient?: any): Promise<PricingTiersConfig> {
  try {
    const supabase = supabaseClient || createClient();
    const { data, error } = await supabase
      .from("cms_settings")
      .select("key, value")
      .eq("key", "pricing_tiers")
      .maybeSingle();

    if (error || !data?.value) {
      return { ...DEFAULT_PRICING_TIERS };
    }

    return parsePricingTiersConfig(data.value);
  } catch (err) {
    console.warn("Failed to fetch cms_settings pricing_tiers, using defaults:", err);
    return { ...DEFAULT_PRICING_TIERS };
  }
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
