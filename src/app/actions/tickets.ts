"use server";

import { createClient } from "@/lib/supabase/server";

export type VerificationResult = {
  status: "valid" | "duplicate" | "invalid" | "error";
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
  };
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
      status: "invalid",
      message: "Token tiket tidak boleh kosong.",
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
    // Check if registration payment is verified
    if ((cfrRecord.payment_status || "").toLowerCase() !== "verified") {
      return {
        status: "invalid",
        message: `Tiket ColorFun Belum Terverifikasi (Status: ${cfrRecord.payment_status || "Pending"})`,
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

    // First Scan (scan_count === 0 before update): 'Valid Ticket - Access Granted' (Green)
    if (prevScanCount === 0) {
      return {
        status: "valid",
        message: "Valid Ticket - Access Granted",
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
          scannedByName: profile.full_name || "Petugas Security",
        },
      };
    }

    // Subsequent Scans (scan_count >= 1 before update): 'Warning: Ticket Already Scanned X Times' (Yellow/Red alert)
    return {
      status: "duplicate",
      message: `Warning: Ticket Already Scanned ${prevScanCount} Times`,
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
        scannedByName: profile.full_name || "Petugas Security",
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
        status: "invalid",
        message: `Tiket Festival Belum Terverifikasi (Status: ${festRecord.payment_status || "Pending"})`,
        token: cleanToken,
      };
    }

    const prevScanCount = festRecord.scan_count || 0;
    const newScanCount = prevScanCount + 1;
    const now = new Date().toISOString();

    // Increment scan_count by 1 and update last_scanned_at
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

    // First Scan (scan_count === 0 before update): 'Valid Ticket - Access Granted' (Green)
    if (prevScanCount === 0) {
      return {
        status: "valid",
        message: "Valid Ticket - Access Granted",
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
          scannedByName: profile.full_name || "Petugas Security",
        },
      };
    }

    // Subsequent Scans (scan_count >= 1 before update): 'Warning: Ticket Already Scanned X Times' (Alert)
    return {
      status: "duplicate",
      message: `Warning: Ticket Already Scanned ${prevScanCount} Times`,
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
        scannedByName: profile.full_name || "Petugas Security",
      },
    };
  }

  // 4. Fallback: Query festival tickets table by token
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

  // Case 3: Invalid Ticket (Not Found in any table)
  if (!ticket) {
    return {
      status: "invalid",
      message: "Invalid Ticket",
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

  // First Scan (scan_count === 0 before update): 'Valid Ticket - Access Granted' (Green)
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
      message: "Valid Ticket - Access Granted",
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
        scannedByName: profile.full_name || "Petugas Gate",
      },
    };
  }

  // Subsequent Scans (scan_count >= 1 before update): 'Warning: Ticket Already Scanned X Times' (Yellow/Red alert)
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

  // Increment scan_count in tickets table
  await supabase
    .from("tickets")
    .update({
      scan_count: newScanCount,
    })
    .eq("id", ticket.id);

  return {
    status: "duplicate",
    message: `Warning: Ticket Already Scanned ${prevScanCount} Times`,
    token: ticket.token,
    ticket: {
      id: ticket.id,
      token: ticket.token,
      eventType: ticket.event_type || "FESTIVAL",
      participantName,
      participantEmail,
      amount,
      scanCount: prevScanCount,
      firstScannedAt: ticket.scanned_at || undefined,
      scannedByName: originalVerifierName,
    },
  };
}

export async function getRecentScans(limit = 15) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Recent scans from colorfun_registrations
  const { data: cfrData } = await supabase
    .from("colorfun_registrations")
    .select("id, ticket_qr_code, scan_count, last_scanned_at, nama_lengkap")
    .not("last_scanned_at", "is", null)
    .order("last_scanned_at", { ascending: false })
    .limit(limit);

  // 2. Recent scans from festival_registrations
  const { data: festData } = await supabase
    .from("festival_registrations")
    .select("id, ticket_qr_code, scan_count, last_scanned_at, nama_lengkap")
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
      profiles:user_id (full_name)
    `)
    .not("scanned_at", "is", null)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  const cfrScans = (cfrData || []).map((c: any) => ({
    id: c.id,
    token: c.ticket_qr_code,
    eventType: "ColorFun Run",
    scanCount: c.scan_count || 1,
    scannedAt: c.last_scanned_at,
    participantName: c.nama_lengkap || "Peserta ColorFun",
  }));

  const festScans = (festData || []).map((f: any) => ({
    id: f.id,
    token: f.ticket_qr_code,
    eventType: "Festival",
    scanCount: f.scan_count || 1,
    scannedAt: f.last_scanned_at,
    participantName: f.nama_lengkap || "Peserta Festival",
  }));

  const ticketScans = (ticketData || []).map((t: any) => {
    const profileObj = (Array.isArray(t.profiles) ? t.profiles[0] : t.profiles) as { full_name?: string } | null;
    return {
      id: t.id,
      token: t.token,
      eventType: t.event_type || "Festival",
      scanCount: t.scan_count || 1,
      scannedAt: t.scanned_at,
      participantName: profileObj?.full_name || "Peserta",
    };
  });

  const merged = [...cfrScans, ...festScans, ...ticketScans];
  merged.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  return merged.slice(0, limit);
}
