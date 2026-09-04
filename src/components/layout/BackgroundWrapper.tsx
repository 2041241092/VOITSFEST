"use client";

import { usePathname } from "next/navigation";
import React from "react";

interface BackgroundWrapperProps {
  children: React.ReactNode;
}

export default function BackgroundWrapper({ children }: BackgroundWrapperProps) {
  const pathname = usePathname();

  // Exclude /admin, /security, and all of their sub-routes
  const isExcluded =
    Boolean(pathname) &&
    (pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/security" ||
      pathname.startsWith("/security/"));

  return (
    <div
      className={`min-h-screen flex flex-col flex-1 w-full ${
        isExcluded
          ? "bg-background text-on-background"
          : "bg-[url('/assets/img/Background 2.png')] bg-cover bg-center bg-fixed text-on-background"
      }`}
      style={
        !isExcluded
          ? {
              backgroundImage: "url('/assets/img/Background 2.png')",
              backgroundAttachment: "fixed",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
