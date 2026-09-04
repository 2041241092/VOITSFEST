import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CustomHeading from "@/components/ui/CustomHeading";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RegistrationClosedPage() {
  return (
    <div className="text-on-background font-poppins min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center flex-col px-4 md:px-12 max-w-container-max mx-auto w-full relative z-10 pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="text-center max-w-3xl mx-auto my-auto py-8">
          <CustomHeading 
            as="h1" 
            text="Gerbang Galaxy Ditutup" 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-6 drop-shadow-md tracking-tight text-center font-bold" 
          />
          <p className="font-poppins text-base sm:text-lg md:text-xl text-primary-fixed-dim max-w-2xl mx-auto leading-relaxed px-2">
            Terima kasih atas antusiasme Anda yang luar biasa! Pendaftaran untuk VOITSFEST 2026 saat ini telah mencapai kapasitas maksimal atau batas waktu telah berakhir.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 bg-primary-container text-primary hover:bg-primary-container/80 px-8 py-3.5 rounded-full font-poppins font-semibold text-sm tracking-wider uppercase transition-all duration-300 shadow-lg hover:shadow-primary-container/25 hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
