// Self-contained verification script for gate loophole fixes

function parseWibDate(dateStr) {
  if (!dateStr) return null;
  let normalized = dateStr.trim().replace(" ", "T");
  if (!normalized.includes("T")) normalized += "T00:00:00";
  if (!normalized.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += "+07:00";
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function getEventTimeStatus(startDateStr, endDateStr) {
  const now = Date.now();
  const startObj = parseWibDate(startDateStr);
  const endObj = parseWibDate(endDateStr);

  const isStarted = !startObj || now >= startObj.getTime();
  const isEnded = Boolean(endObj && now > endObj.getTime());
  const isActive = isStarted && !isEnded;

  return { isStarted, isEnded, isActive };
}

console.log("=== VERIFYING GATE LOOPHOLE PROTECTION LOGIC ===");

// 1. Time Status logic
const expiredTier = { start_date: "2026-08-01 00:00:00", end_date: "2026-09-01 23:59:00" };
const expiredStatus = getEventTimeStatus(expiredTier.start_date, expiredTier.end_date);
console.log("Expired sub-event tier:", { isStarted: expiredStatus.isStarted, isEnded: expiredStatus.isEnded });
if (!expiredStatus.isEnded) {
  throw new Error("Expired tier should report isEnded = true");
}

const activeTier = { start_date: "2026-09-10 00:00:00", end_date: "2026-09-30 23:59:00" };
const activeStatus = getEventTimeStatus(activeTier.start_date, activeTier.end_date);
console.log("Active sub-event tier:", { isStarted: activeStatus.isStarted, isEnded: activeStatus.isEnded });
if (!activeStatus.isStarted || activeStatus.isEnded) {
  throw new Error("Active tier should be started and not ended");
}

const futureTier = { start_date: "2026-10-01 00:00:00", end_date: "2026-10-31 23:59:00" };
const futureStatus = getEventTimeStatus(futureTier.start_date, futureTier.end_date);
console.log("Future sub-event tier:", { isStarted: futureStatus.isStarted, isEnded: futureStatus.isEnded });
if (futureStatus.isStarted) {
  throw new Error("Future tier should report isStarted = false");
}

// 2. Promo Slider Card Guard Test
function evaluatePromoCardButton({ promo, targetTier, targetGatewayOpen, targetQuota }) {
  const { isActive, isStarted, isEnded } = getEventTimeStatus(promo.start_date, promo.end_date);
  const isQuotaSoldOut = promo.kuota_maksimal != null && (promo.kuota_terpakai ?? 0) >= promo.kuota_maksimal;

  let isSubEventBlocked = false;
  let subEventBlockText = "";

  if (targetGatewayOpen === false) {
    isSubEventBlocked = true;
    subEventBlockText = "Pendaftaran Ditutup";
  }

  if (targetTier) {
    const tierTime = getEventTimeStatus(targetTier.start_date, targetTier.end_date);
    if (!tierTime.isStarted || tierTime.isEnded) {
      isSubEventBlocked = true;
      subEventBlockText = "Pendaftaran Ditutup";
    }
  }

  if (targetQuota && (targetQuota.isEventFull || targetQuota.isPhaseFull)) {
    isSubEventBlocked = true;
    subEventBlockText = "Event Penuh";
  }

  let isUsable = true;
  let statusBadgeText = "Promo Aktif";

  if (!promo.is_active) {
    statusBadgeText = "Nonaktif";
    isUsable = false;
  } else if (isEnded) {
    statusBadgeText = "Periode Berakhir";
    isUsable = false;
  } else if (!isStarted) {
    statusBadgeText = "Segera Hadir";
    isUsable = false;
  } else if (isQuotaSoldOut) {
    statusBadgeText = "Sold Out";
    isUsable = false;
  }

  const canClick = isUsable && !isSubEventBlocked;
  const buttonText = canClick ? "Klaim Promo" : (isSubEventBlocked ? subEventBlockText : statusBadgeText);

  return { canClick, buttonText, isSubEventBlocked, isUsable };
}

// Scenario A: Active Promo, but Sub-Event Gateway Closed
const scA = evaluatePromoCardButton({
  promo: { id: "p1", is_active: true, start_date: "2026-09-01 00:00:00", end_date: "2026-09-30 23:59:00", kuota_terpakai: 10, kuota_maksimal: 50 },
  targetTier: activeTier,
  targetGatewayOpen: false,
  targetQuota: { isEventFull: false, isPhaseFull: false },
});
console.log("Scenario A (Gateway Closed):", scA);
if (scA.canClick !== false || scA.buttonText !== "Pendaftaran Ditutup") {
  throw new Error("Scenario A failed: should be disabled with 'Pendaftaran Ditutup'");
}

// Scenario B: Active Promo, but Sub-Event Quota Full
const scB = evaluatePromoCardButton({
  promo: { id: "p1", is_active: true, start_date: "2026-09-01 00:00:00", end_date: "2026-09-30 23:59:00", kuota_terpakai: 10, kuota_maksimal: 50 },
  targetTier: activeTier,
  targetGatewayOpen: true,
  targetQuota: { isEventFull: true, isPhaseFull: false },
});
console.log("Scenario B (Event Quota Full):", scB);
if (scB.canClick !== false || scB.buttonText !== "Event Penuh") {
  throw new Error("Scenario B failed: should be disabled with 'Event Penuh'");
}

// Scenario C: Active Promo, but Sub-Event Date Expired
const scC = evaluatePromoCardButton({
  promo: { id: "p1", is_active: true, start_date: "2026-09-01 00:00:00", end_date: "2026-09-30 23:59:00", kuota_terpakai: 10, kuota_maksimal: 50 },
  targetTier: expiredTier,
  targetGatewayOpen: true,
  targetQuota: { isEventFull: false, isPhaseFull: false },
});
console.log("Scenario C (Tier Date Expired):", scC);
if (scC.canClick !== false || scC.buttonText !== "Pendaftaran Ditutup") {
  throw new Error("Scenario C failed: should be disabled with 'Pendaftaran Ditutup'");
}

// Scenario D: Promo Quota Sold Out, Sub-Event Open
const scD = evaluatePromoCardButton({
  promo: { id: "p1", is_active: true, start_date: "2026-09-01 00:00:00", end_date: "2026-09-30 23:59:00", kuota_terpakai: 50, kuota_maksimal: 50 },
  targetTier: activeTier,
  targetGatewayOpen: true,
  targetQuota: { isEventFull: false, isPhaseFull: false },
});
console.log("Scenario D (Promo Sold Out):", scD);
if (scD.canClick !== false || scD.buttonText !== "Sold Out") {
  throw new Error("Scenario D failed: should be disabled with 'Sold Out'");
}

// Scenario E: Everything Open & Valid
const scE = evaluatePromoCardButton({
  promo: { id: "p1", is_active: true, start_date: "2026-09-01 00:00:00", end_date: "2026-09-30 23:59:00", kuota_terpakai: 10, kuota_maksimal: 50 },
  targetTier: activeTier,
  targetGatewayOpen: true,
  targetQuota: { isEventFull: false, isPhaseFull: false },
});
console.log("Scenario E (All Open):", scE);
if (scE.canClick !== true || scE.buttonText !== "Klaim Promo") {
  throw new Error("Scenario E failed: should be enabled with 'Klaim Promo'");
}

console.log("ALL TESTS PASSED SUCCESSFULLY!");
