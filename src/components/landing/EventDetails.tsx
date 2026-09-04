import CustomHeading from "@/components/ui/CustomHeading";
import { Infinity, Users, Sparkles, Quote } from "lucide-react";

export default function EventDetails() {
  return (
    <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap relative z-10 flex flex-col gap-stack-lg">
      {/* Theme Section */}
      <div className="glass-card p-stack-lg rounded-2xl border-primary/20 max-w-4xl mx-auto text-center w-full">
        <CustomHeading 
          as="h2" 
          text="Cosmic: Parade of The Stars" 
          className="font-headline-lg text-headline-lg text-primary-fixed mb-4 text-glow" 
        />
        <p className="font-body-lg text-body-lg text-on-surface/80 leading-relaxed mb-12 max-w-3xl mx-auto">
          Mengonseptualisasikan VOITSFEST 2026 sebagai ekosistem festival vokasi yang menyatukan semangat kewirausahaan mahasiswa, showcase inovasi keilmiahan, dan pengalaman interaktif dalam satu harmoni.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
          <div className="glass-card p-6 rounded-2xl border-primary/20 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-on-surface/10 flex items-center justify-center mb-6">
              <Infinity className="w-8 h-8 text-primary-fixed" />
            </div>
            <h3 className="font-headline-md text-primary-fixed mb-4">Cosmic</h3>
            <p className="font-body-md text-on-surface/70">Melambangkan ruang kolaborasi tanpa batas yang dinamis.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl border-primary/20 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-on-surface/10 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-primary-fixed" />
            </div>
            <h3 className="font-headline-md text-primary-fixed mb-4">Parade</h3>
            <p className="font-body-md text-on-surface/70">Merepresentasikan gerak kolektif lintas departemen yang saling mengisi.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl border-primary/20 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-on-surface/10 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-primary-fixed" />
            </div>
            <h3 className="font-headline-md text-primary-fixed mb-4">Stars</h3>
            <p className="font-body-md text-on-surface/70">Menegaskan bahwa setiap mahasiswa, tenant, serta karya inovatif adalah cahaya unik yang berkontribusi pada kesatuan acara.</p>
          </div>
        </div>
        <div className="relative pt-12 border-t border-primary/10">
          <Quote className="w-10 h-10 text-primary/30 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-1" />
          <p className="font-body-lg italic text-on-surface/90 max-w-3xl mx-auto leading-relaxed">
            VOITSFEST sebagai platform strategis yang mengarahkan engagement pengunjung langsung ke aktivitas ekonomi tenant, sekaligus mengukuhkan positioning Fakultas Vokasi ITS sebagai event unggulan yang berkelanjutan, terkelola profesional, dan berdampak nyata bagi ekosistem kreatif kampus.
          </p>
        </div>
      </div>
      
      {/* About VOITSFEST */}
      <div className="glass-card p-stack-lg rounded-2xl border-primary/20 max-w-4xl mx-auto text-center w-full py-12">
        <CustomHeading 
          as="h2" 
          text="About VOITSFEST" 
          className="font-headline-lg text-headline-lg text-primary-fixed mb-6 text-glow" 
        />
        <p className="font-body-lg text-body-lg text-on-surface/80 leading-relaxed">
          VOITSFEST 2026 hadir kembali sebagai signature event unggulan dari Fakultas Vokasi Institut Teknologi Sepuluh Nopember. Festival ini dirancang sebagai ekosistem yang menyatukan inovasi keilmiahan, kreativitas mahasiswa, serta pengembangan ekonomi kreatif yang berkelanjutan. Lebih dari sekadar festival biasa, VOITSFEST 2026 merupakan ruang kolaborasi tanpa batas, tempat berkumpulnya ribuan pasang mata untuk menikmati perpaduan antara edukasi, aksi olahraga, dan hiburan spektakuler.
        </p>
      </div>
    </section>
  );
}
