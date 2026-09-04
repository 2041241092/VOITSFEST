import CustomHeading from "@/components/ui/CustomHeading";

export default function JourneyMap() {
  return (
    <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap relative z-10">
      <CustomHeading 
        as="h2" 
        text="Journey Map" 
        className="font-headline-lg text-headline-lg text-primary-fixed mb-stack-lg text-center" 
      />
      <div className="relative max-w-container-max mx-auto py-10">
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-primary/30 -translate-x-1/2 hidden md:block"></div>
        <div className="relative flex flex-col gap-16">
          {/* Tenant Registration (Left) */}
          <div className="flex flex-col md:flex-row items-center w-full relative group">
            <div className="w-full md:w-1/2 md:pr-12 flex justify-end">
              <div className="glass-card p-6 rounded-xl border-primary/20 hover:border-primary/50 transition-all duration-300 text-center w-full md:w-[400px] h-[120px] flex flex-col justify-center">
                <h4 className="font-headline-md text-primary mb-1">Tenant Registration</h4>
                <p className="font-body-md text-tertiary text-sm">August - September 2026</p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(240,192,77,0.8)] z-10"></div>
            </div>
            <div className="w-full md:w-1/2"></div>
          </div>
          
          {/* Entrepreneurship Seminar (Right) */}
          <div className="flex flex-col md:flex-row items-center w-full relative group">
            <div className="w-full md:w-1/2"></div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(240,192,77,0.8)] z-10"></div>
            </div>
            <div className="w-full md:w-1/2 md:pl-12 flex justify-start">
              <div className="glass-card p-6 rounded-xl border-primary/20 hover:border-primary/50 transition-all duration-300 text-center w-full md:w-[400px] h-[120px] flex flex-col justify-center">
                <h4 className="font-headline-md text-primary mb-1">Entrepreneurship Seminar</h4>
                <p className="font-body-md text-tertiary text-sm">September 2026</p>
              </div>
            </div>
          </div>
          
          {/* Final BPC & BCC (Left) */}
          <div className="flex flex-col md:flex-row items-center w-full relative group">
            <div className="w-full md:w-1/2 md:pr-12 flex justify-end">
              <div className="glass-card p-6 rounded-xl border-primary/20 hover:border-primary/50 transition-all duration-300 text-center w-full md:w-[400px] h-[120px] flex flex-col justify-center">
                <h4 className="font-headline-md text-primary mb-1">Final BPC &amp; BCC</h4>
                <p className="font-body-md text-tertiary text-sm">September 2026</p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(240,192,77,0.8)] z-10"></div>
            </div>
            <div className="w-full md:w-1/2"></div>
          </div>
          
          {/* ColorFun Run (Right) */}
          <div className="flex flex-col md:flex-row items-center w-full relative group">
            <div className="w-full md:w-1/2"></div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(240,192,77,0.8)] z-10"></div>
            </div>
            <div className="w-full md:w-1/2 md:pl-12 flex justify-start">
              <div className="glass-card p-6 rounded-xl border-primary/20 hover:border-primary/50 transition-all duration-300 text-center w-full md:w-[400px] h-[120px] flex flex-col justify-center">
                <h4 className="font-headline-md text-primary mb-1">ColorFun Run</h4>
                <p className="font-body-md text-tertiary text-sm">Oktober 2026</p>
              </div>
            </div>
          </div>
          
          {/* Festival (Left) */}
          <div className="flex flex-col md:flex-row items-center w-full relative group">
            <div className="w-full md:w-1/2 md:pr-12 flex justify-end">
              <div className="glass-card p-6 rounded-xl border-primary/50 bg-primary/10 shadow-[0_0_25px_rgba(240,192,77,0.3)] text-center w-full md:w-[400px] h-[120px] flex flex-col justify-center">
                <h4 className="font-headline-md text-primary-fixed mb-1">Festival</h4>
                <p className="font-body-md text-tertiary text-sm">Oktober 2026</p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center top-1/2 -translate-y-1/2">
              <div className="w-6 h-6 rounded-full bg-primary shadow-[0_0_20px_rgba(240,192,77,1)] z-10"></div>
            </div>
            <div className="w-full md:w-1/2"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
