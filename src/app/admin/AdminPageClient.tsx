"use client";

import { useState } from "react";
import DashboardOverview from "./components/DashboardOverview";
import DataGrid from "./components/DataGrid";
import CFRDatabase from "./components/CFRDatabase";
import FestivalDatabase from "./components/FestivalDatabase";
import AdminHeader from "./components/AdminHeader";
import { 
  Database
} from "lucide-react";

export default function AdminPageClient() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "akun" | "cfr" | "festival" | "bpc" | "bcc" | "seminar" | "tenant"
  >("overview");

  const handleScrollToCMS = () => {
    if (activeTab !== "overview") {
      setActiveTab("overview");
      setTimeout(() => {
        const el = document.getElementById("cms-gateways");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      const el = document.getElementById("cms-gateways");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div 
      className="min-h-screen overflow-x-hidden antialiased text-on-background font-poppins pb-24"
      style={{
        backgroundColor: "#0b1026",
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(46, 78, 143, 0.15) 0%, rgba(11, 16, 38, 1) 70%)",
        backgroundAttachment: "fixed"
      }}
    >
      {/* 3-Part Sticky Header */}
      <AdminHeader 
        onLogoClick={() => setActiveTab("overview")}
        onScrollToCMS={handleScrollToCMS}
      />

      {/* Main Content Area */}
      <main className="pt-8 px-6 min-h-screen">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-12">
          
          {/* Page Header */}
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <h1 className="text-3xl md:text-4xl font-semibold text-on-surface">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "akun" && "Account Database"}
              {activeTab === "cfr" && "ColorFun Run Database"}
              {activeTab === "festival" && "Festival Database"}
              {activeTab === "bpc" && "BPC Registrations"}
              {activeTab === "bcc" && "BCC Registrations"}
              {activeTab === "seminar" && "Seminar Registrations"}
              {activeTab === "tenant" && "Tenant Registrations"}
            </h1>

            <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`${activeTab === "overview" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab("akun")}
                  className={`${activeTab === "akun" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data Akun
                </button>
                <button 
                  onClick={() => setActiveTab("cfr")}
                  className={`${activeTab === "cfr" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data CFR
                </button>
                <button 
                  onClick={() => setActiveTab("festival")}
                  className={`${activeTab === "festival" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data Festival
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setActiveTab("bpc")}
                  className={`${activeTab === "bpc" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data BPC
                </button>
                <button 
                  onClick={() => setActiveTab("bcc")}
                  className={`${activeTab === "bcc" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data BCC
                </button>
                <button 
                  onClick={() => setActiveTab("seminar")}
                  className={`${activeTab === "seminar" ? "bg-primary text-primary-container" : "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data Seminar
                </button>
                <button 
                  onClick={() => setActiveTab("tenant")}
                  className={`${activeTab === "tenant" ? "bg-tertiary-fixed text-tertiary-container" : "bg-tertiary/10 text-tertiary border border-tertiary/30 hover:bg-tertiary/20"} px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Database className="w-4 h-4" /> Data Tenant
                </button>
              </div>
            </div>
          </header>

          {/* Dynamic Content */}
          {activeTab === "overview" && <DashboardOverview />}
          {activeTab === "cfr" && <CFRDatabase />}
          {activeTab === "festival" && <FestivalDatabase />}
          {activeTab !== "overview" && activeTab !== "cfr" && activeTab !== "festival" && <DataGrid tableName={activeTab} />}

        </div>
      </main>
    </div>
  );
}
