"use server";

import { createClient } from "@/lib/supabase/server";

export type VerificationResult = {
  status: "valid" | "scanned" | "not_found" | "error";
  message: string;
  token?: string;
  ticket?: {
    id: string;
    token: string;
    eventType: string;
    participantName: string;
    participantEmail?: string;
    amount?: number;
    ticketPhase?: string;
    scanCount?: number;
    scannedAt?: string;
    firstScannedAt?: string;
    scannedByName?: string;
    nomorBib?: number | string | null;
    kategoriPeserta?: string | null;
    departemen?: string | null;
    nrp?: string | null;
    isCheckedIn?: boolean;
  };
};

export type RecentScanItem = {
  id: string;
  token: string;
  eventType: string;
  scanCount: number;
  scannedAt: string | null;
  firstScannedAt?: string | null;
  participantName: string;
  participantEmail?: string;
  amount?: number;
  ticketPhase?: string | null;
  nomorBib?: number | string | null;
  kategoriPeserta?: string | null;
  departemen?: string | null;
  nrp?: string | null;
  status: "valid" | "scanned";
};

export type TicketMetrics = {
  total: number;
  valid: number;
  scanned: number;
};

export async function verifyTicket(rawToken: string): Promise<VerificationResult> {
  const supabase = await createClient();

  // 1. Verify user session and role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Sesi telah berakhir. Silakan login kembali.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "security"].includes(profile.role)) {
    return {
      status: "error",
      message: "Akses ditolak. Hanya peran Admin dan Security yang dapat memindai tiket.",
    };
  }

  const cleanToken = rawToken.trim();
  if (!cleanToken) {
    return {
      status: "not_found",
      message: "Data tidak ditemukan",
      token: "",
    };
  }

  // 2. First check colorfun_registrations table matching ticket_qr_code
  const { data: cfrRecord, error: cfrFetchError } = await supabase
    .from("colorfun_registrations")
    .select("*")
    .ilike("ticket_qr_code", cleanToken)
    .maybeSingle();

  if (cfrFetchError) {
    console.error("Fetch colorfun_registrations error:", cfrFetchError);
  }

  if (cfrRecord) {
    // Only verified payments count as valid database tickets
    if ((cfrRecord.payment_status || "").toLowerCase() !== "verified") {
      return {
        status: "not_found",
        message: "Data tidak ditemukan",
        token: cleanToken,
      };
    }

    const prevScanCount = cfrRecord.scan_count || 0;
    const newScanCount = prevScanCount + 1;
    const now = new Date().toISOString();

    // Increment scan_count by 1 and update last_scanned_at
    const { error: updateCfrError } = await supabase
      .from("colorfun_registrations")
      .update({
        scan_count: newScanCount,
        last_scanned_at: now,
      })
      .eq("id", cfrRecord.id);

    if (updateCfrError) {
      console.error("Update colorfun_registrations scan error:", updateCfrError);
    }

    // State 1: VALID (Green Badge) - First time scan (is_checked_in === false)
    if (prevScanCount === 0) {
      return {
        status: "valid",
        message: "Check-in Berhasil",
        token: cfrRecord.ticket_qr_code,
        ticket: {
          id: cfrRecord.id,
          token: cfrRecord.ticket_qr_code,
          eventType: "ColorFun Run (5K)",
          participantName: cfrRecord.nama_lengkap || "Peserta ColorFun",
          participantEmail: cfrRecord.email || "",
          amount: Number(cfrRecord.amount_paid || 0),
          ticketPhase: cfrRecord.ticket_phase || "",
          scanCount: newScanCount,
          scannedAt: now,
          firstScannedAt: now,
          scannedByName: profile.full_name || "Petugas Security",
          nomorBib: cfrRecord.nomor_bib ?? null,
          kategoriPeserta: cfrRecord.kategori_peserta || "Umum",
          departemen: cfrRecord.departemen || null,
          nrp: cfrRecord.nrp || null,
          isCheckedIn: true,
        },
      };
    }

    // State 2: SCANNED / ALREADY CHECKED IN (Yellow/Orange Badge) - Prior scan exists
    return {
      status: "scanned",
      message: "Tiket Sudah Check-in Sebelumnya",
      token: cfrRecord.ticket_qr_code,
      ticket: {
        id: cfrRecord.id,
        token: cfrRecord.ticket_qr_code,
        eventType: "ColorFun Run (5K)",
        participantName: cfrRecord.nama_lengkap || "Peserta ColorFun",
        participantEmail: cfrRecord.email || "",
        amount: Number(cfrRecord.amount_paid || 0),
        ticketPhase: cfrRecord.ticket_phase || "",
        scanCount: prevScanCount,
        firstScannedAt: cfrRecord.last_scanned_at || now,
        scannedAt: now,
        scannedByName: profile.full_name || "Petugas Security",
        nomorBib: cfrRecord.nomor_bib ?? null,
        kategoriPeserta: cfrRecord.kategori_peserta || "Umum",
        departemen: cfrRecord.departemen || null,
        nrp: cfrRecord.nrp || null,
        isCheckedIn: true,
      },
    };
  }

  // 3. Check festival_registrations table matching ticket_qr_code
  const { data: festRecord, error: festFetchError } = await supabase
    .from("festival_registrations")
    .select("*")
    .ilike("ticket_qr_code", cleanToken)
    .maybeSingle();

  if (festFetchError) {
    console.error("Fetch festival_registrations error:", festFetchError);
  }

  if (festRecord) {
    if ((festRecord.payment_status || "").toLowerCase() !== "verified") {
      return {
        status: "not_found",
        message: "Data tidak ditemukan",
        token: cleanToken,
      };
    }

    const prevScanCount = festRecord.scan_count || 0;
    const newScanCount = prevScanCount + 1;
    const now = new Date().toISOString();

    const { error: updateFestError } = await supabase
      .from("festival_registrations")
      .update({
        scan_count: newScanCount,
        last_scanned_at: now,
      })
      .eq("id", festRecord.id);

    if (updateFestError) {
      console.error("Update festival_registrations scan error:", updateFestError);
    }

    // State 1: VALID (Green Badge)
    if (prevScanCount === 0) {
      return {
        status: "valid",
        message: "Check-in Berhasil",
        token: festRecord.ticket_qr_code,
        ticket: {
          id: festRecord.id,
          token: festRecord.ticket_qr_code,
          eventType: "Festival",
          participantName: festRecord.nama_lengkap || "Peserta Festival",
          participantEmail: festRecord.email || "",
          amount: Number(festRecord.amount_paid || 0),
          ticketPhase: festRecord.ticket_phase || "",
          scanCount: newScanCount,
          scannedAt: now,
          firstScannedAt: now,
          scannedByName: profile.full_name || "Petugas Security",
          nomorBib: festRecord.nomor_bib ?? null,
          kategoriPeserta: festRecord.kategori_peserta || "Umum",
          departemen: festRecord.departemen || null,
          nrp: festRecord.nrp || null,
          isCheckedIn: true,
        },
      };
    }

    // State 2: SCANNED / ALREADY CHECKED IN
    return {
      status: "scanned",
      message: "Tiket Sudah Check-in Sebelumnya",
      token: festRecord.ticket_qr_code,
      ticket: {
        id: festRecord.id,
        token: festRecord.ticket_qr_code,
        eventType: "Festival",
        participantName: festRecord.nama_lengkap || "Peserta Festival",
        participantEmail: festRecord.email || "",
        amount: Number(festRecord.amount_paid || 0),
        ticketPhase: festRecord.ticket_phase || "",
        scanCount: prevScanCount,
        firstScannedAt: festRecord.last_scanned_at || now,
        scannedAt: now,
        scannedByName: profile.full_name || "Petugas Security",
        nomorBib: festRecord.nomor_bib ?? null,
        kategoriPeserta: festRecord.kategori_peserta || "Umum",
        departemen: festRecord.departemen || null,
        nrp: festRecord.nrp || null,
        isCheckedIn: true,
      },
    };
  }

  // 4. Fallback: Query tickets table by token
  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select(`
      id,
      token,
      event_type,
      scan_count,
      scanned_at,
      scanned_by,
      user_id,
      transaction_id,
      profiles:user_id (
        id,
        full_name,
        email,
        phone
      ),
      transactions:transaction_id (
        id,
        amount,
        sub_event_type,
        status
      )
    `)
    .ilike("token", cleanToken)
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch ticket error:", fetchError);
    return {
      status: "error",
      message: "Terjadi kesalahan saat memverifikasi database tiket.",
      token: cleanToken,
    };
  }

  // Unknown QR outside the database
  if (!ticket) {
    return {
      status: "not_found",
      message: "Data tidak ditemukan",
      token: cleanToken,
    };
  }

  const holderProfile = (Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles) as {
    full_name?: string;
    email?: string;
  } | null;

  const transactionData = (Array.isArray(ticket.transactions) ? ticket.transactions[0] : ticket.transactions) as {
    amount?: number;
    sub_event_type?: string;
  } | null;

  const participantName = holderProfile?.full_name || "Peserta VOITSFEST";
  const participantEmail = holderProfile?.email || "";
  const amount = transactionData?.amount || 0;

  const prevScanCount = ticket.scan_count || 0;
  const newScanCount = prevScanCount + 1;
  const now = new Date().toISOString();

  // State 1: VALID (Green Badge)
  if (prevScanCount === 0) {
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        scan_count: 1,
        scanned_by: user.id,
        scanned_at: now,
      })
      .eq("id", ticket.id);

    if (updateError) {
      console.error("Update ticket error:", updateError);
    }

    return {
      status: "valid",
      message: "Check-in Berhasil",
      token: ticket.token,
      ticket: {
        id: ticket.id,
        token: ticket.token,
        eventType: ticket.event_type || "FESTIVAL",
        participantName,
        participantEmail,
        amount,
        scanCount: 1,
        scannedAt: now,
        firstScannedAt: now,
        scannedByName: profile.full_name || "Petugas Gate",
        nomorBib: null,
        kategoriPeserta: "Umum",
        departemen: null,
        nrp: null,
        isCheckedIn: true,
      },
    };
  }

  // State 2: SCANNED / ALREADY CHECKED IN
  let originalVerifierName = "Petugas Gate";
  if (ticket.scanned_by) {
    const { data: verifierProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", ticket.scanned_by)
      .maybeSingle();

    if (verifierProfile?.full_name) {
      originalVerifierName = verifierProfile.full_name;
    }
  }

  await supabase
    .from("tickets")
    .update({
      scan_count: newScanCount,
    })
    .eq("id", ticket.id);

  return {
    status: "scanned",
    message: "Tiket Sudah Check-in Sebelumnya",
    token: ticket.token,
    ticket: {
      id: ticket.id,
      token: ticket.token,
      eventType: ticket.event_type || "FESTIVAL",
      participantName,
      participantEmail,
      amount,
      scanCount: prevScanCount,
      firstScannedAt: ticket.scanned_at || now,
      scannedAt: now,
      scannedByName: originalVerifierName,
      nomorBib: null,
      kategoriPeserta: "Umum",
      departemen: null,
      nrp: null,
      isCheckedIn: true,
    },
  };
}

export async function getTicketMetrics(): Promise<TicketMetrics> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, valid: 0, scanned: 0 };

  const [cfrRes, festRes, ticketRes] = await Promise.all([
    supabase
      .from("colorfun_registrations")
      .select("id, scan_count, last_scanned_at, payment_status"),
    supabase
      .from("festival_registrations")
      .select("id, scan_count, last_scanned_at, payment_status"),
    supabase
      .from("tickets")
      .select("id, scan_count, scanned_at"),
  ]);

  let total = 0;
  let scanned = 0;

  const countRow = (r: any) => {
    const status = (r.payment_status || "pending").toLowerCase();
    if (status !== "verified") return;
    total++;
    const isCheckedIn = (r.scan_count || 0) > 0 || r.last_scanned_at !== null;
    if (isCheckedIn) {
      scanned++;
    }
  };

  (cfrRes.data || []).forEach(countRow);
  (festRes.data || []).forEach(countRow);

  (ticketRes.data || []).forEach((t: any) => {
    total++;
    const isCheckedIn = (t.scan_count || 0) > 0 || t.scanned_at !== null;
    if (isCheckedIn) scanned++;
  });

  const valid = Math.max(0, total - scanned);

  return { total, valid, scanned };
}

export async function getRecentScans(limit = 30): Promise<RecentScanItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Recent scans from colorfun_registrations
  const { data: cfrData } = await supabase
    .from("colorfun_registrations")
    .select("*")
    .not("last_scanned_at", "is", null)
    .order("last_scanned_at", { ascending: false })
    .limit(limit);

  // 2. Recent scans from festival_registrations
  const { data: festData } = await supabase
    .from("festival_registrations")
    .select("*")
    .not("last_scanned_at", "is", null)
    .order("last_scanned_at", { ascending: false })
    .limit(limit);

  // 3. Recent scans from tickets
  const { data: ticketData } = await supabase
    .from("tickets")
    .select(`
      id,
      token,
      event_type,
      scan_count,
      scanned_at,
      profiles:user_id (full_name, email),
      transactions:transaction_id (amount)
    `)
    .not("scanned_at", "is", null)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  const cfrScans: RecentScanItem[] = (cfrData || []).map((c: any) => ({
    id: c.id,
    token: c.ticket_qr_code || "",
    eventType: "ColorFun Run (5K)",
    scanCount: c.scan_count || 1,
    scannedAt: c.last_scanned_at,
    firstScannedAt: c.last_scanned_at,
    participantName: c.nama_lengkap || "Peserta ColorFun",
    participantEmail: c.email || "",
    nomorBib: c.nomor_bib ?? null,
    kategoriPeserta: c.kategori_peserta || "Umum",
    departemen: c.departemen || null,
    nrp: c.nrp || null,
    status: (c.scan_count || 1) === 1 ? "valid" : "scanned",
    amount: Number(c.amount_paid || 0),
    ticketPhase: c.ticket_phase || "",
  }));

  const festScans: RecentScanItem[] = (festData || []).map((f: any) => ({
    id: f.id,
    token: f.ticket_qr_code || "",
    eventType: "Festival",
    scanCount: f.scan_count || 1,
    scannedAt: f.last_scanned_at,
    firstScannedAt: f.last_scanned_at,
    participantName: f.nama_lengkap || "Peserta Festival",
    participantEmail: f.email || "",
    nomorBib: f.nomor_bib ?? null,
    kategoriPeserta: f.kategori_peserta || "Umum",
    departemen: f.departemen || null,
    nrp: f.nrp || null,
    status: (f.scan_count || 1) === 1 ? "valid" : "scanned",
    amount: Number(f.amount_paid || 0),
    ticketPhase: f.ticket_phase || "",
  }));

  const ticketScans: RecentScanItem[] = (ticketData || []).map((t: any) => {
    const profileObj = (Array.isArray(t.profiles) ? t.profiles[0] : t.profiles) as { full_name?: string; email?: string } | null;
    const txObj = (Array.isArray(t.transactions) ? t.transactions[0] : t.transactions) as { amount?: number } | null;
    return {
      id: t.id,
      token: t.token || "",
      eventType: t.event_type || "Festival",
      scanCount: t.scan_count || 1,
      scannedAt: t.scanned_at,
      firstScannedAt: t.scanned_at,
      participantName: profileObj?.full_name || "Peserta",
      participantEmail: profileObj?.email || "",
      nomorBib: null,
      kategoriPeserta: "Umum",
      departemen: null,
      nrp: null,
      status: (t.scan_count || 1) === 1 ? "valid" : "scanned",
      amount: Number(txObj?.amount || 0),
      ticketPhase: "",
    };
  });

  const merged = [...cfrScans, ...festScans, ...ticketScans];
  merged.sort((a, b) => new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime());
  return merged.slice(0, limit);
}
