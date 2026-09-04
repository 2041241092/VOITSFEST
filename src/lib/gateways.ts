import { createClient } from "@/lib/supabase/client";

export type GatewayEvent = "bpc" | "bcc" | "seminar" | "tenant" | "cfr" | "festival";

export interface GatewaysConfig {
  bpc: boolean;
  bcc: boolean;
  seminar: boolean;
  tenant: boolean;
  cfr: boolean;
  festival: boolean;
}

export const DEFAULT_GATEWAYS: GatewaysConfig = {
  bpc: true,
  bcc: true,
  seminar: true,
  tenant: true,
  cfr: true,
  festival: true,
};

export const EVENT_NAMES: Record<GatewayEvent, string> = {
  bpc: "Business Plan Competition (BPC)",
  bcc: "Business Case Competition (BCC)",
  seminar: "Cosmic Seminar Kewirausahaan",
  tenant: "Tenant & Expo Bazaar",
  cfr: "ColorFun Run (CFR)",
  festival: "VOITS Music Festival",
};

/**
 * Fetches the gateways configuration from Supabase cms_settings.
 * Prioritizes the 'gateways' JSON object row, with graceful fallback
 * to legacy individual registration_open_<event> rows if needed.
 */
export async function fetchGateways(): Promise<GatewaysConfig> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cms_settings")
      .select("key, value");

    if (error || !data) {
      console.warn("Failed to fetch cms_settings gateways, using defaults:", error?.message);
      return { ...DEFAULT_GATEWAYS };
    }

    const gatewaysRow = data.find((row) => row.key === "gateways");

    if (gatewaysRow && typeof gatewaysRow.value === "object" && gatewaysRow.value !== null) {
      const val = gatewaysRow.value as Record<string, unknown>;
      return {
        bpc: val.bpc !== undefined ? Boolean(val.bpc) : DEFAULT_GATEWAYS.bpc,
        bcc: val.bcc !== undefined ? Boolean(val.bcc) : DEFAULT_GATEWAYS.bcc,
        seminar: val.seminar !== undefined ? Boolean(val.seminar) : DEFAULT_GATEWAYS.seminar,
        tenant: val.tenant !== undefined ? Boolean(val.tenant) : DEFAULT_GATEWAYS.tenant,
        cfr: val.cfr !== undefined ? Boolean(val.cfr) : DEFAULT_GATEWAYS.cfr,
        festival: val.festival !== undefined ? Boolean(val.festival) : DEFAULT_GATEWAYS.festival,
      };
    }

    // Fallback: check legacy individual keys
    const fallback: GatewaysConfig = { ...DEFAULT_GATEWAYS };
    data.forEach((row) => {
      if (row.key === "registration_open_bpc") fallback.bpc = Boolean(row.value);
      if (row.key === "registration_open_bcc") fallback.bcc = Boolean(row.value);
      if (row.key === "registration_open_seminar") fallback.seminar = Boolean(row.value);
      if (row.key === "registration_open_tenant") fallback.tenant = Boolean(row.value);
      if (row.key === "registration_open_cfr") fallback.cfr = Boolean(row.value);
      if (row.key === "registration_open_festival") fallback.festival = Boolean(row.value);
    });

    return fallback;
  } catch (err) {
    console.error("Exception fetching gateways config:", err);
    return { ...DEFAULT_GATEWAYS };
  }
}

/**
 * Checks if a specific event gateway registration is currently open.
 */
export async function isGatewayOpen(event: GatewayEvent): Promise<boolean> {
  const config = await fetchGateways();
  return Boolean(config[event]);
}
