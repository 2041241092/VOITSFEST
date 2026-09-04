import { createClient } from "@/lib/supabase/client";

export type PricingEvent = "festival" | "colorfun" | "seminar" | "bcc" | "bpc" | "tenant";

export interface EventPricing {
  phase: string;
  price: number;
}

export interface PricingTiersConfig {
  festival: EventPricing;
  colorfun: EventPricing;
  seminar: EventPricing;
  bcc: EventPricing;
  bpc: EventPricing;
  tenant: EventPricing;
}

export const DEFAULT_PRICING_TIERS: PricingTiersConfig = {
  festival: { phase: "Presale 2", price: 75000 },
  colorfun: { phase: "Normal Price", price: 75000 },
  seminar: { phase: "Normal Price", price: 10000 },
  bcc: { phase: "Batch 1", price: 79000 },
  bpc: { phase: "Batch 1", price: 79000 },
  tenant: { phase: "Regular", price: 10000 },
};

export const PRICING_EVENT_NAMES: Record<PricingEvent, string> = {
  festival: "VOITS Music Festival",
  colorfun: "ColorFun Run 5K",
  seminar: "Cosmic Seminar Kewirausahaan",
  bcc: "Business Case Competition (BCC)",
  bpc: "Business Plan Competition (BPC)",
  tenant: "Tenant & Expo Bazaar",
};

/**
 * Fetches dynamic pricing and phase configuration from Supabase cms_settings (key: 'pricing_tiers').
 * Falls back safely to default values if not yet configured.
 */
export async function fetchPricingTiers(): Promise<PricingTiersConfig> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cms_settings")
      .select("key, value")
      .eq("key", "pricing_tiers")
      .maybeSingle();

    if (error || !data?.value) {
      return { ...DEFAULT_PRICING_TIERS };
    }

    const val = data.value as Partial<PricingTiersConfig>;
    return {
      festival: {
        phase: val.festival?.phase || DEFAULT_PRICING_TIERS.festival.phase,
        price: typeof val.festival?.price === "number" ? val.festival.price : DEFAULT_PRICING_TIERS.festival.price,
      },
      colorfun: {
        phase: val.colorfun?.phase || DEFAULT_PRICING_TIERS.colorfun.phase,
        price: typeof val.colorfun?.price === "number" ? val.colorfun.price : DEFAULT_PRICING_TIERS.colorfun.price,
      },
      seminar: {
        phase: val.seminar?.phase || DEFAULT_PRICING_TIERS.seminar.phase,
        price: typeof val.seminar?.price === "number" ? val.seminar.price : DEFAULT_PRICING_TIERS.seminar.price,
      },
      bcc: {
        phase: val.bcc?.phase || DEFAULT_PRICING_TIERS.bcc.phase,
        price: typeof val.bcc?.price === "number" ? val.bcc.price : DEFAULT_PRICING_TIERS.bcc.price,
      },
      bpc: {
        phase: val.bpc?.phase || DEFAULT_PRICING_TIERS.bpc.phase,
        price: typeof val.bpc?.price === "number" ? val.bpc.price : DEFAULT_PRICING_TIERS.bpc.price,
      },
      tenant: {
        phase: val.tenant?.phase || DEFAULT_PRICING_TIERS.tenant.phase,
        price: typeof val.tenant?.price === "number" ? val.tenant.price : DEFAULT_PRICING_TIERS.tenant.price,
      },
    };
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
