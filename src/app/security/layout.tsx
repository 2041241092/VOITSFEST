import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user || (await supabase.auth.getUser()).data.user;

  if (!user) {
    redirect("/login?redirect=/security");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "security"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
