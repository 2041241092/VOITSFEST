"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EnterGalaxyButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/register");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = (profile?.role || user.user_metadata?.role || "user")
        .toString()
        .toLowerCase()
        .trim();

      if (userRole === "admin") {
        router.push("/admin");
      } else if (userRole === "security") {
        router.push("/security");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error navigating from Enter the Galaxy button:", err);
      router.push("/register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-primary-container text-on-primary font-headline-md text-headline-md px-10 py-4 rounded-full hover:shadow-[0_0_30px_rgba(240,192,77,0.6)] transition-all transform hover:scale-105 duration-300 cursor-pointer"
    >
      Enter the Galaxy
    </button>
  );
}
