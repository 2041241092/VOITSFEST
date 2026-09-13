"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchPricingTiers,
  PricingEvent,
  SubEventTierConfig,
  DEFAULT_PRICING_TIERS,
  PRICING_EVENT_NAMES,
} from "@/lib/pricing";
import {
  fetchAllSubEventQuotas,
  QuotaStatus,
  createFallbackQuota,
  listenToQuotaRefresh,
} from "@/lib/quota";
import { Promo } from "@/types/database";

// Maps PricingEvent to corresponding table name and target_event string for promos
const SUB_EVENT_MAP: Record<
  PricingEvent,
  {
    table: string;
    promoTarget: string;
  }
> = {
  festival: { table: "festival_registrations", promoTarget: "Festival" },
  colorfun: { table: "colorfun_registrations", promoTarget: "ColorFun Run" },
  seminar: { table: "seminar_registrations", promoTarget: "Seminar" },
  bcc: { table: "bcc_registrations", promoTarget: "BCC" },
  bpc: { table: "bpc_registrations", promoTarget: "BPC" },
  tenant: { table: "tenant_registrations", promoTarget: "Tenant" },
};

export interface UseLivePricingAndQuotaResult {
  pricing: SubEventTierConfig;
  quota: QuotaStatus | null;
  activePromos: Promo[];
  loading: boolean;
  isPhaseFull: boolean;
  isEventFull: boolean;
  isAvailable: boolean;
  availabilityReason: QuotaStatus["availabilityReason"] | "loading";
  effectivePrice: number;
  eventName: string;
  refresh: () => Promise<void>;
}

export function useLivePricingAndQuota(
  eventKey: PricingEvent
): UseLivePricingAndQuotaResult {
  const [pricing, setPricing] = useState<SubEventTierConfig>(
    DEFAULT_PRICING_TIERS[eventKey]
  );
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [activePromos, setActivePromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const meta = SUB_EVENT_MAP[eventKey];

  const loadData = useCallback(async () => {
    try {
      const [tiers, allQuotas, promosRes] = await Promise.all([
        fetchPricingTiers(),
        fetchAllSubEventQuotas(),
        supabase
          .from("promos")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (tiers[eventKey]) {
        setPricing(tiers[eventKey]);
      }

      if (allQuotas[eventKey]) {
        setQuota(allQuotas[eventKey]);
      } else if (tiers[eventKey]) {
        setQuota(createFallbackQuota(tiers[eventKey]));
      }

      if (!promosRes.error && promosRes.data) {
        const filtered = (promosRes.data as Promo[]).filter((p) => {
          if (!p.target_event) return true;
          const cleanTarget = p.target_event.trim().toLowerCase();
          const expected = meta.promoTarget.toLowerCase();
          return cleanTarget === expected || cleanTarget === "semua" || cleanTarget === "all";
        });
        setActivePromos(filtered);
      }
    } catch (err) {
      console.warn(`Error loading live pricing and quota for ${eventKey}:`, err);
    } finally {
      setLoading(false);
    }
  }, [eventKey, meta.promoTarget, supabase]);

  useEffect(() => {
    loadData();

    // 1. Cross-window / in-app custom event listeners
    const unsubscribeQuota = listenToQuotaRefresh(() => {
      loadData();
    });

    // 2. Supabase Realtime channel subscription for instant multi-client reactivity
    const channelName = `realtime-pricing-quota-${eventKey}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_settings" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: meta.table },
        () => loadData()
      )
      .subscribe();

    return () => {
      unsubscribeQuota();
      supabase.removeChannel(channel);
    };
  }, [loadData, eventKey, meta.table, supabase]);

  // Derive guard states
  const isPhaseFull = quota ? quota.isPhaseFull : false;
  const isEventFull = quota ? quota.isEventFull : false;
  const isAvailable = quota ? quota.isAvailable : true;
  const availabilityReason = quota ? quota.availabilityReason : (loading ? "loading" : "available");
  const effectivePrice = pricing.price;
  const eventName = PRICING_EVENT_NAMES[eventKey];

  return {
    pricing,
    quota,
    activePromos,
    loading,
    isPhaseFull,
    isEventFull,
    isAvailable,
    availabilityReason,
    effectivePrice,
    eventName,
    refresh: loadData,
  };
}
