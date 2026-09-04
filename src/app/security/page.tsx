import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SecurityScanner from "./components/SecurityScanner";

export const metadata = {
  title: "Security Scanner Dashboard | VOITSFEST 2026",
  description: "Gate security QR scanning and ticket verification dashboard for VOITSFEST 2026",
};

export default async function SecurityPage() {
  const supabase = await createClient();

  // 1. Role Protection & Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/security");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "security"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <SecurityScanner
      guardName={profile.full_name || "Petugas Security"}
      guardEmail={user.email || profile.email || ""}
      role={profile.role}
    />
  );
}
