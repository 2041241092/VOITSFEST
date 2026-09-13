// Verification script for Dual Quota Tracking & Guard Separation

function isRegularRegistration(record) {
  if (record.promo_id && String(record.promo_id).trim() !== "") return false;
  if (record.ticket_phase && record.ticket_phase.includes("[PROMO:")) return false;
  return true;
}

function simulateQuotaTracking(records, tierConfig) {
  let phaseUsed = 0;
  let totalEventUsed = 0;

  for (const r of records) {
    const status = (r.payment_status || "").toLowerCase();
    if (status !== "rejected" && status !== "") {
      totalEventUsed++; // Counts ALL participants across all phases, regular tickets, and bundling purchases
      if (isRegularRegistration(r)) {
        phaseUsed++; // Counts strictly regular ticket registrations
      }
    }
  }

  return { phaseUsed, totalEventUsed };
}

function simulatePreCheckoutGuard({
  eventKey,
  requestedQuantity,
  promoId,
  phaseUsed,
  totalEventUsed,
  phaseQuota,
  eventQuota,
  promo
}) {
  // Guard 4: Sub-Event Total Capacity Guard (event_quota)
  if (eventQuota !== null && totalEventUsed + requestedQuantity > eventQuota) {
    return {
      valid: false,
      error: `Sold Out / Kapasitas Penuh. Total kuota pendaftaran telah mencapai kapasitas maksimal (${eventQuota} slot).`,
      guardTriggered: "event_capacity_full",
    };
  }

  // Guard 5: Phase Quota Guard (phase_quota)
  // Bypassed if purchasing via promo / bundle
  if (!promoId && phaseQuota !== null && phaseUsed + requestedQuantity > phaseQuota) {
    return {
      valid: false,
      error: `Kuota Fase Penuh. Kuota pendaftaran untuk fase sudah habis terjual (${phaseQuota} slot).`,
      guardTriggered: "phase_quota_full",
    };
  }

  // Guard 6: Promo Guard
  if (promoId && promo) {
    if (promo.kuota_maksimal !== null && (promo.kuota_terpakai + requestedQuantity > promo.kuota_maksimal)) {
      return {
        valid: false,
        error: "Kode promo sudah melewati periode aktif atau kuota telah habis",
        guardTriggered: "promo_quota_full",
      };
    }
  }

  return { valid: true };
}

console.log("=== TEST 1: isRegularRegistration ===");
const reg1 = { promo_id: null, ticket_phase: "Early Bird", payment_status: "approved" };
const reg2 = { promo_id: "550e8400-e29b-41d4-a716-446655440000", ticket_phase: "Early Bird [PROMO: BUNDLE3]", payment_status: "approved" };
const reg3 = { promo_id: "", ticket_phase: "Presale 1", payment_status: "pending" };
const reg4 = { promo_id: undefined, ticket_phase: "[PROMO: COMBO]", payment_status: "approved" };

console.log("reg1 (Regular):", isRegularRegistration(reg1) === true ? "PASS" : "FAIL");
console.log("reg2 (Bundle):", isRegularRegistration(reg2) === false ? "PASS" : "FAIL");
console.log("reg3 (Regular):", isRegularRegistration(reg3) === true ? "PASS" : "FAIL");
console.log("reg4 (Promo phase):", isRegularRegistration(reg4) === false ? "PASS" : "FAIL");

console.log("\n=== TEST 2: Dual Quota Tracking ===");
const sampleRecords = [
  { id: 1, promo_id: null, ticket_phase: "Early Bird", payment_status: "approved" },
  { id: 2, promo_id: null, ticket_phase: "Early Bird", payment_status: "pending" },
  { id: 3, promo_id: "promo-bundle-1", ticket_phase: "Early Bird [PROMO: DUO]", payment_status: "approved" },
  { id: 4, promo_id: "promo-bundle-1", ticket_phase: "Early Bird [PROMO: DUO]", payment_status: "approved" },
  { id: 5, promo_id: null, ticket_phase: "Early Bird", payment_status: "rejected" }, // Released
];

const counts = simulateQuotaTracking(sampleRecords);
console.log("Phase Used (Regular only, non-rejected):", counts.phaseUsed, counts.phaseUsed === 2 ? "PASS (expected 2)" : "FAIL");
console.log("Total Event Used (Cumulative non-rejected):", counts.totalEventUsed, counts.totalEventUsed === 4 ? "PASS (expected 4)" : "FAIL");

console.log("\n=== TEST 3: Guard When Phase Quota is FULL but Event Capacity Available ===");
// Phase quota: 2, Event quota: 10
// Currently phaseUsed = 2 (FULL), totalEventUsed = 4 (AVAILABLE)
const regularAttempt = simulatePreCheckoutGuard({
  eventKey: "festival",
  requestedQuantity: 1,
  promoId: null,
  phaseUsed: 2,
  totalEventUsed: 4,
  phaseQuota: 2,
  eventQuota: 10,
});
console.log("Regular Ticket Checkout should be BLOCKED by phase_quota_full:",
  !regularAttempt.valid && regularAttempt.guardTriggered === "phase_quota_full" ? "PASS" : "FAIL"
);

const bundleAttempt = simulatePreCheckoutGuard({
  eventKey: "festival",
  requestedQuantity: 2,
  promoId: "promo-bundle-1",
  phaseUsed: 2,
  totalEventUsed: 4,
  phaseQuota: 2,
  eventQuota: 10,
  promo: { kuota_maksimal: 50, kuota_terpakai: 10 }
});
console.log("Bundle Purchase Checkout should PASS (bypasses phase quota):",
  bundleAttempt.valid === true ? "PASS" : "FAIL"
);

console.log("\n=== TEST 4: Guard When Overall Event Capacity is FULL ===");
// totalEventUsed = 10, eventQuota = 10
const bundleAttemptFullEvent = simulatePreCheckoutGuard({
  eventKey: "festival",
  requestedQuantity: 1,
  promoId: "promo-bundle-1",
  phaseUsed: 2,
  totalEventUsed: 10,
  phaseQuota: 50,
  eventQuota: 10,
  promo: { kuota_maksimal: 50, kuota_terpakai: 10 }
});
console.log("Bundle Purchase should be BLOCKED by event_capacity_full when venue is full:",
  !bundleAttemptFullEvent.valid && bundleAttemptFullEvent.guardTriggered === "event_capacity_full" ? "PASS" : "FAIL"
);

console.log("\nAll simulation checks finished.");
