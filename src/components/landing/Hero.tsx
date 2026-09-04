"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Countdown from "./Countdown";
import CustomHeading from "@/components/ui/CustomHeading";
import EnterGalaxyButton from "./EnterGalaxyButton";

export default function Hero() {
  const [countdownLabel, setCountdownLabel] = useState<string>("The Next Milestone");

  useEffect(() => {
    const supabase = createClient();
    async function loadCountdownLabel() {
      try {
        const { data, error } = await supabase
          .from("cms_settings")
          .select("value")
          .eq("key", "countdown_label")
          .single();

        if (data && !error && data.value) {
          const raw = typeof data.value === "string" ? data.value : String(data.value);
          if (raw.trim()) {
            setCountdownLabel(raw.trim());
          }
        }
      } catch (err) {
        console.error("Error loading countdown_label:", err);
      }
    }
    loadCountdownLabel();
  }, []);

  return (
    <>
      {/* Cosmic Drifting Decorators */}
      <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden h-full">
        <img alt="Komet 1" className="absolute top-[8%] left-[10%] w-64 h-auto opacity-0 animate-drift-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV4XvQidOZN-BTW_af_BZLt1tQazNm4Z-8ttlSv4p25ZIv48WfVDXdjW0ng5HjrEWYMml7hJ2T0v5tZQnxVnruz072azDX_196kvOm9c3Da5AJfAVstxOlPKN4-zsuzYFCuSEwe6ROwSFKwq2TYZEn7sBpiYbsrmM8t_2T3jn-rKa31ti9IE25Tsj9ZRMtrzn0-4jaus7tmOvn76khvENuPnOnTY383hqh1yAtbwwbwUDDaiypD97R_wUuOSRFL3-uz5g" />
        <img alt="Komet 2" className="absolute top-[20%] right-[15%] w-80 h-auto opacity-0 animate-drift-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC74mChHAyNg-pZnR1HPU4TjTxWO0A4nslAJxb_cFTG2GJMR5w_etYhYI-aEPHsknHRqgN1R9MwFnakXLU7KBHoqro6kviNdZ2QVzSiqowItT9YOarv36VTfWmDlO5Xn_iJhiVgW53vn9D5dNChDlnquReV8WGMqEzqPWY-izK2-e_MHNPHwBpbIY9F0OIBVphkNJjUvWSwbRZTCKG4cbApN08Ma3GAa2bzLQqjIZffXGTj2ubsIcVWecYMPFyGPExWu6k" />
        <img alt="Komet 1" className="absolute top-[35%] right-[5%] w-72 h-auto opacity-0 animate-drift-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0V05aG7hamlN8W9ou8XfPldNgZy0aRST3rBRlKmYj4wI0zLjasf7WbiWjXpOwW9Bn3mczKqqXaLZO8U1NIN8mHeBRaNySkMCVCvu5anMBjF1-1OpqAljSXrdVzF5GI5rOFh08ji_AWwrB1Ex8-Lb5r55xq-aDnLfy8Mt1dRhz8bov-nMyTX4kwXm5MHYdNvYZYuJ5qa7l8KPzTM4hheXf2SObOp6nKmNdyHtk_SaLHoQP0_WDUStCkT2wYMOKy0bqmJY" />
        <img alt="Komet 2" className="absolute top-[50%] left-[8%] w-96 h-auto opacity-0 animate-drift-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV-XIyL7Stm2ULI0aq4suu4LDrAvwuKvBjBbh1_Dr8yjcSsLIFrh8oAhfb1X7M0HtWkWvUGKMjljqJPRcZOIPRvh16QSUJQva5EgeDePDVxEiIP5fQqXoBV2SX6H6EYihGARrcodvmYPNY1yY9LCMl6vGrEcFb6RanyY7IF0RgEO2wEUMZvFPw3kiVGOnXq9MBwKPudi8zhIwyYPJhHuKwkO2LMNL4Lfxz4eGUOona8JV2-qekHRI6o4qvMOg6f60XK7I" />
        <img alt="Komet 1" className="absolute top-[70%] left-[25%] w-64 h-auto opacity-0 animate-drift-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8Ub6lPn3Apo60V1rAs4rZk268wKGUIzpe3Tfn2Cp2_2luXDRBxH9Qk8bhM7VinxZqiC5-X3tJuM3nk9_yVltt0DM_rcqYk-ghI5nvbI-akjjNPWtrJ40J5GP9PXCe6P5xq9xCRLRTehi3D7XGHg1qlFsgjk73IU1Q__tLLZnRViFFC36l08pVL_IKG0yw1QK-5bC2RVO2jpX8jpAOuO2Fc29ROv9BlMzQpzj7IYPlfX-gThyLWIcMX8t_gxNR181aCWs" />
        <img alt="Komet 2" className="absolute top-[85%] right-[10%] w-80 h-auto opacity-0 animate-drift-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_FEtzlwjvrgGZQjAVdNgyW2VKta9COcCUXGxwP4OIFYD10Ql0Hlm-RL3_NHU1852e0_HR5HypoaxGFrRcUCJMW9nKJtujW0GQg_RkDZNbIGqWNtjOVy4QgSsEVlouxEnV8TQtB1iXPVPvYG5kTyZF4Eyh7X77zV5QRYzF3btRSjDnQVGWuShZC-rqhBn7PSLkVWpteDfLe6kfHI-iF6FnUsBQwdk3prRUnANrqo0p3EfCN7vSmMMN4a99sLcPLHK7tYk" />
        <img alt="Komet 1" className="absolute top-[15%] left-[40%] w-48 h-auto opacity-0 animate-drift-1" style={{ animationDuration: "18s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiD5fp7yc9pN3EwgQldGBwxSPw0sg-Gn4cK7xd1oIWYV-Z01T-ZjLJL3wizuIo4hybnQieZroME7ShyloqTwrqjCwPNUklUZOcnqQVWQUy3Tg2UMoRxHCGWYyTXhlNSOw1rLWG1wzKTNMILdYaXeLGOPqcGF4jpW9PrxoUQ0PVXV14YnsX25muOKww_Ml1fYAmbiwGe4ylNJ9bnbmPIgZu2bjzk3OHC72PuBZk44pboYvbAeVp9Vp22HJM50RFuEhjhVQ" />
        <img alt="Komet 2" className="absolute top-[45%] right-[30%] w-64 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "22s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIaJuCfuwh93IQl-0v4bIdqCkSpeL6Sw8EWuijgxWDeYshA0g4qENHNez4zUjnzyxlWHaP7LOK38DGU4Eo6GfuIDeNGZTFQgoyYZGaSPED47prTdnl6WufdygfkOwyOW7aJOEeY9DJujBAfXTY7kOZ-a9eZ3-_bY_KeMK-HneYVvTgam9OQSJyYLyqthO4mJ8vAs9OBiXtaTmzZzNfnPrY1dE3PM2nPNS8Ajj3zPyl0U7VJZ1qkIlsOzeebGmoYcuQly0" />
        <img alt="Komet 1" className="absolute top-[60%] left-[5%] w-56 h-auto opacity-0 animate-drift-1" style={{ animationDuration: "14s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8qYWZb2KIMzfkkY_tnNaZC4AbXHk-R_SjNJ0uA1H_WjLTJcRAw0KIx0qoN0MGMIjJGcJY71miJ9o5fzGkcosHUK1MCZhYmsx8KnT2JqJTSFi4MTAGOlZ1R4HwdrPU2Ef53PfxBvLyyjLbsqDNEyECWbJhlnjf6p2Yz4RmRSg6nMXimav-HqRwg3xYmA0dRakquqRdfnE1NAPHRLe9Tmm33WywtcAnGLz9fWnu0ty8pwyPhCzR1S6JAZAve5K_EACc0yE" />
        <img alt="Komet 2" className="absolute top-[75%] right-[45%] w-72 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "25s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsdqB9oUMKiR20e-MgGPtfRzqCO6OBOJe1eVuR38WPqKAp6mJHZf0C9NrvPGDuCcyjMXgt_WJA44OKZFTKE3xrIXUTF7GkR2VtaEonmHk4pl7HID327ksWfWl3_wdv7fwABuwAOklDsEOgXGCeMe2j4OcP8weDXC5WBBnjFWx-kTkvdLm28RrwiSiLb-o274M3IZy0ECOC0hZly7IgwePvVqecDElt6CgdK5Lz8Ve-Ow6F1Au4Ad5ACR3gksNJW1XOcFw" />
        <img alt="Komet 1" className="absolute top-[90%] left-[60%] w-40 h-auto opacity-0 animate-drift-1" style={{ animationDuration: "20s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-IRxbwIpe8iUgMuyHKy6bCPHSHIfDPR-yy5L1ebGBBt2f9qaDnedrnpZpnlVcFW5kZZOV5n1MxhkcG9Gp8yszWz8FxMrA35TuQ__NLrDx650N36mAuW52UBCkXkqdj1G-x-M3ymnIhE3AvUTb7LLnhXqI3XdhTLazAFD7EbczRaRGLXobtHAX9AvNXzrCZRi1pNd4KOb3iHU6jb50RU_1yZqbi_mamTlE-88-r7lj06_l4Xpl2dDdEOZimmOAmrmDgAE" />
        <img alt="Komet 2" className="absolute top-[5%] right-[60%] w-52 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "17s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHokhK66JPWIO1u_4388eB7MjIxAPLuItAR0yQgf-bxdE2Ed1YFeht8PLJ3xEDXBdIXvlE7YHqIZFtOCJf7GHk7CvdbePHSDCPz66T2HXE28WgnGaXLNuT1uhOFPjsh48-OjdXZFSvNwoaVkoWOpQwJ-gxxAKcHOtD6VaP8QVXMfsbZ-60iHbpo3S3zYFM5RxrhnMwTv8cLmobBQh7ORMrWhGn1RNSlnaYZfqKZT-tAGfTCuA-ESY09_ZGkHKVpX9kazg" />
        <img alt="Komet 2" className="absolute top-[15%] right-[40%] w-64 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "19s", animationDelay: "2s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1TVi-6eziiTpKGmM986ywwxgrJTVGLJuFbrv1es7yDxkUDVBfy5uUDrwMTWDELNWFobfrFT-eQIjlruoZruPVgGHX2MKcitle4h-8okIdDgvxF0hzNFP-9-CHiJLXHSiTJYJmrKcg9fTpuTaZPCxA1wkxcaZ6Z-qqLJmbH0bSig0GIx9PL2nUNgmDpLCBdtWe-G2HoHVYTZ5RWvdnS1scrveSNCvbqxhp8-6Yk7ExXz-JpmirJkDCIfs4_X5sRMSQ1w" />
        <img alt="Komet 2" className="absolute top-[30%] left-[60%] w-72 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "23s", animationDelay: "5s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAwAIdWdFFomW8hy7raOVtzlZ0mXzdyP0scVMRFxZqf3wetE5I0qJcLE3aQQZH8thmE_9bC3RsbD0Oci0i6fSsl0cLi0IbY_qDSP5bhAIvEjsYwY4tOQTXRGfg7SynKXhmDLAzY77gm3OOYkzowgM6PcqLVFhRfanJAJ9jZVtQeBa3gPXT9ObLV2vsTivCtBRCMlqJlNSLj-ZxyerSgATuTKD7w-r7fWhOOfty_Rv97rtcJViyf-jfZ70OsR3qeO7uyA" />
        <img alt="Komet 2" className="absolute top-[40%] right-[5%] w-56 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "16s", animationDelay: "8s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmKs1PMj576Hm0MDCO6DsnK5xxzT_nfWyQxrhw4wAsq8-EF5YVZXixk8VXb3Yiu4G_1HqQMjKnWQlyo89z7kRjhiBpK6GmIjYA2ssHpDbHFHM6CnEwkNuJrBP0TYqikB3mt2vKlH-mVKCuj3qELjdmfTNBOc9P2CtCSKG3_CTIzeI4T32EPU4t3AOYl0Ja_k7whjhxmukg-TvHC-t6AVre4CrWRnzXSGazxaNTHwlz-9VNsR7LVWDJti7aBo6Txag9lg" />
        <img alt="Komet 2" className="absolute top-[55%] left-[15%] w-80 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "21s", animationDelay: "1s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_UFfUe-sGGpVu_5jW-9xxpS25O8G_ugzkO8pLQUFQOKOh9RG2qlTmlqmx_po3k2md2KDvZGBjyGYDdTLb3UJ6rdep984Byq2felfI_T70Flm1NqajEF44mrVpaC8AvJSo0q3oKeQeD3XpUlAWUCUJatGm76Mjr4Yy2NenycoarPtUy4MY6gl-hBmWzfrP-rLfYUTw0yzUWWIKyTRSYybuh8x2LwTctFgfh5LEtfyz6nH3plZQ9AbqseZv29Ifbnilow" />
        <img alt="Komet 2" className="absolute top-[65%] right-[25%] w-48 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "24s", animationDelay: "10s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaRR87Mww2kMZjyx1LAaXTUSWP-gxzPUMWPM72uFHLzoRi-5FyZN2LPWgrN74ZySG3s7dFfeRDunjFsgCqOEIWiiXiv8uNHQpj-3brxozMxw4dk2nhvsF24T_bOmKTs79UCynuLf7vVmCjU4QoodJsBxNO-oZpnR5Yiu1xZleFcDmVmXmLyHDGlUgXjWvkQLbSOrKhcMHmXk4D4V9M4u5p1FiWKUrtgPk4i1shGG0jlVm8DvTDrBUtQpA2mP3RHs179Q" />
        <img alt="Komet 2" className="absolute top-[80%] left-[45%] w-64 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "18s", animationDelay: "4s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1wyFYG7jVpR-nfCwjuBFaB5bWx21Dv7PBE4qX-FkuoJ5sc1lFYQW0aBiJnQiUmkbBwOB0GMQ_58Rz5nSC6sIfHCmpQwMVhI6mDgPrJvP38Ht9MIOUeb9jzLxH4tor9lidY0fl7FBd8ZDLOo7mh4NF-qGaEtr4I5HbBJhawugHCW9WV4jgKe5LHrRH3uj5LWaROKB_AyxsiXypkrRl36oidb8XILknREK7dRm3KQEx10xRHqembSTjLABHffxGGjfMog" />
        <img alt="Komet 2" className="absolute top-[92%] right-[60%] w-72 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "22s", animationDelay: "12s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNvXhI-iDqsDMG_JQVWRIDLFaSJtMW3FnA3WMrnP4JkZHbWJdxrJGxdzp80ieIX3STyXasEEjBaiaUXH6xPJpKQ1a-WPnbYS0yTQxBuzkypqv3iLb8Hy-wFyrl9u5tD2R-1YBZ_yL9k_VReL4bsWgTeaHA6jPVMHhewBXntNeqm4m6vCJhxJYTcec9ga2_2hvGdeoeItpH-a8D7LTU8xYfktsM3A5OjOSM2CGIsicYmZaRYoIANcAMmWCzFAHZKT8A7Q" />
        <img alt="Komet 2" className="absolute top-[25%] right-[80%] w-52 h-auto opacity-0 animate-drift-2" style={{ animationDuration: "20s", animationDelay: "7s" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3dfESMqOY5B2ZBvxkPxQaqAmC5mkfOFtCGAKSqalCpednbCWaM23LS1JZm3GqFqJJkDpqtI8IIo-WmCEHfJlDLy6Rgnn4MJb2qmEqHpYTj_cqbdLLfYMJuRNehgkg_VMkbA6CVlAX1DISO_bafp5sCXgxvetTT9rDznkGDqXOfvzmbrUmi2mG1DJwr3sjRBkqE3Iy5bbxnb_0445qLGb78EplUVziDVGTqPL1ufh4liIiSIEHv4FD4q_8lwifciqBMw" />
      </div>
      
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop text-center">
        {/* Cosmic Assets around Hero */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img alt="Cosmic element" className="absolute top-[10%] left-[5%] w-32 h-32 animate-float opacity-70" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmGVFNr6u7E7H1YitJfXwjVb2wNDM9kSa08NubQALEFdNni7leUSX-V5GDxP7YT-Qkj7A-9ME1U__3zFomKzmIIxqyiQk02lspnwTJh01QGMrI1BdSngSPN5vkX_XzsGNc5p16DKLIpjetdLaJSR8chceajfeBU_XEC1ui88OujLLxhyKFJayXU4ibAigHJ5AL1a77K_eodT3F-e83KeDgdccOzWW5JO4GpdfTiPb6C-IUAVzDOGdSgf9aG_qBPoXnVOU" />
          <img alt="Cosmic element" className="absolute top-[20%] right-[10%] w-48 h-48 animate-float opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDlhLhkTjfqbdMaIFXvGJTMBq5bfBKFBvdzZthcC6eo6sy0W2xoLPgTi-hHdJL4xl_PYUTAd7EUPI3SaF7_IwV4bUGOYA6NpwoVL7Z2rOtGAUtIg58uKWh1Vc41YnGY4k5zCdpXQPZ5NGreYwbxLIINWWNfF0Jv0yoM5dVxWG_h2-QqJSFEOujKjaB6rBwJ2nnzTWEy0taBMJ29RsOuMANg-hUnm0i2davjztcGr2ANPzBXG8-77XHzgK1dOYK0xV-lsE" />
          <img alt="Cosmic element" className="absolute bottom-[10%] left-[15%] w-40 h-40 animate-float opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLwJVD5glx3IIbaEQOt4Z0uhCwGfkOvAPj8-RJX6H-UgigDsjvbSsKlVS7Se67TcDK9dAqZ8LsWNueMfVIsZJTPYYOMJ5h2GkGcjgoHu-OFWTCSFab8D0YAxAG6j71V4PgI9Obwlr_oLn6D6MofSEt9eJFFrHWe5utZCdGbSCZQiVJQ7Ub9IO7czsQSGoME-AlJxUD28Zle2FUpgFKQcIBwKP2em9AFB0TU0aCSY2gHSVaXnGua7rNKN_4FdKl5h6eloA" />
          <img alt="Cosmic element" className="absolute bottom-[20%] right-[5%] w-24 h-24 animate-float opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDTv9BvttwmCMhpbHhyWwtEpsjZgTkEUp0UdgOtn6Y5ez_gT90_sqiJ6IEM-HaiJVk3pAue-f7rhGEk0wq_sy6Xu0uTi68sW4Kyk-BnY2WIjf1gk_E9k78l2T1-YMdDfb9PF32T5FEAK0Zw0-BP8eFVH2h9ESPqo8zDEqwBdV4cDMm1PTV2beHynmYqpXxwlEUjub74VBmoed4PXZWZ9QIUshSJQPfch1Bqz7saNHmHRWSnn_cceKeFsGkDkoK7WHIF-I" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <CustomHeading 
            as="h1" 
            text="VOITSFEST" 
            className="font-headline-lg text-display-lg md:text-[120px] uppercase font-bold tracking-tighter text-primary-container text-glow mb-2 leading-none" 
          />
          <p className="font-headline-md text-3xl md:text-4xl uppercase font-bold tracking-wider text-primary-container text-glow mb-4">Shine Loud, Glow Together</p>
          
          <Countdown />
          
          <p className="font-headline-md text-headline-md text-primary-container text-glow mb-stack-lg">
            {countdownLabel || "The Next Milestone"}
          </p>
          <EnterGalaxyButton />
        </div>
      </section>
    </>
  );
}
