"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CheckoutResult {
  success?: boolean;
  transactionId?: string;
  error?: string;
}

export async function submitCheckoutTransaction(formData: FormData): Promise<CheckoutResult> {
  const supabase = await createClient();

  // 1. Validate user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Sesi Anda telah kedaluwarsa atau belum login. Silakan login terlebih dahulu." };
  }

  const subEventType = (formData.get("subEventType") as string)?.toUpperCase(); // 'FESTIVAL' or 'CFR'
  const amountStr = formData.get("amount") as string;
  const paymentProofFile = formData.get("paymentProof") as File | null;
  const existingProofUrl = formData.get("paymentProofUrl") as string | null;

  if (!subEventType || (subEventType !== "FESTIVAL" && subEventType !== "CFR")) {
    return { error: "Jenis sub-event tidak valid." };
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Nominal pembayaran tidak valid." };
  }

  let paymentProofUrl = existingProofUrl || "";

  // 2. Upload payment proof to 'payment-proofs' bucket if file was submitted directly
  if (!paymentProofUrl && paymentProofFile && paymentProofFile.size > 0) {
    const cleanFileName = paymentProofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${cleanFileName}`;

    // Try primary bucket: payment-proofs
    let { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, paymentProofFile, {
        cacheControl: "3600",
        upsert: false,
      });

    let targetBucket = "payment-proofs";

    // Fallback: If payment-proofs bucket does not exist yet, try registrations bucket
    if (uploadError) {
      console.warn("Upload to payment-proofs failed, attempting fallback to registrations:", uploadError.message);
      const fallbackUpload = await supabase.storage
        .from("registrations")
        .upload(filePath, paymentProofFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (fallbackUpload.error) {
        return { 
          error: `Gagal mengunggah bukti transfer ke storage: ${uploadError.message}. Pastikan bucket 'payment-proofs' sudah dibuat di Supabase.` 
        };
      }
      targetBucket = "registrations";
    }

    const { data: publicUrlData } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(filePath);

    paymentProofUrl = publicUrlData.publicUrl;
  }

  if (!paymentProofUrl) {
    return { error: "Bukti transfer pembayaran wajib diunggah." };
  }

  // 3. Insert transaction record into 'transactions' table
  const sourceType = subEventType === "FESTIVAL" ? "festival" : "cfr";

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      source_type: sourceType,
      sub_event_type: subEventType,
      amount,
      payment_proof_url: paymentProofUrl,
      status: "Pending",
    })
    .select("id")
    .single();

  if (txError) {
    console.error("Failed to insert transaction:", txError);
    return { error: `Gagal membuat data transaksi: ${txError.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true, transactionId: tx?.id };
}
