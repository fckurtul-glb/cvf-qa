'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const ParticleSphere = dynamic(
  () => import('./particle-sphere').then((m) => m.ParticleSphere),
  { ssr: false, loading: () => <div className="h-full w-full" /> }
);

const modules = [
  { id: 'M1', code: 'OCAI+', label: 'Kültür Profili', desc: 'Cameron & Quinn CVF modeline dayalı kurumsal kültür tipolojisi analizi. 4 kültür boyutu, 6 alt ölçüt.' },
  { id: 'M2', code: 'QCI-TR', label: 'Kalite Kültürü', desc: 'ISO 9001 uyumlu kalite yönetim kültürü değerlendirmesi. YÖKAK C1-C4 ölçütleri ile eşleşir.' },
  { id: 'M3', code: 'MSAI-YÖ', label: '360° Liderlik', desc: 'Liderlik yetkinlikleri için çoklu kaynaklı geribildirim. Yönetici, ast ve akran görüşleri.' },
  { id: 'M4', code: 'UWES-TR', label: 'Çalışan Bağlılığı', desc: 'Utrecht İş Bağlılığı Ölçeği — Türkçe uyarlaması. Dinamizm, adanmışlık, yoğunlaşma.' },
  { id: 'M5', code: 'PKE', label: 'Paydaş Katılımı', desc: 'İç ve dış paydaş katılım düzeyi analizi. YÖKAK Paydaş boyutu için kanıt üretir.' },
  { id: 'M6', code: 'SPU', label: 'Stratejik Uyum', desc: 'Stratejik plan hedefleri ile kurumsal kültür uyum endeksi. Eylem planı çıktısı.' },
];

export function HeroSection() {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-[#0d1b2e] pt-14"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px)',
      }}
    >
      {/* Glow blobs */}
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-[#8EE3EF]/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-[#AEF3E7]/5 blur-[100px]" />

      <div className="container relative z-10 mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center">
          {/* Sol: Başlık + Butonlar + İstatistikler */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col justify-center"
          >
            <div className="mb-4 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
              YÖKAK Akreditasyon Destek Platformu
            </div>

            <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
              Kurumsal Kültürünüzü{' '}
              <span className="bg-gradient-to-r from-[#8EE3EF] to-[#AEF3E7] bg-clip-text text-transparent">
                Veriye Dayalı
              </span>{' '}
              Yönetin
            </h1>

            <p className="mb-8 text-base leading-relaxed text-white/55 lg:text-lg">
              6 bilimsel ölçekle kurumsal kültür değerlendirmesi yapın, YÖKAK kanıt dosyalarınızı
              otomatik oluşturun, 360° liderlik analizi ile yöneticilerinizi geliştirin.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 bg-[#8EE3EF] px-6 text-sm font-semibold text-[#0d1b2e] hover:bg-[#7dd4e0]">
                <Link href="/demo">Ücretsiz Demo Talep Et</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 border-white/20 px-6 text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link href="/cozumler">Çözümleri İncele</Link>
              </Button>
            </div>

            {/* İstatistikler */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
              {[
                { value: '6', label: 'Bilimsel Ölçek' },
                { value: '146', label: 'Toplam Soru' },
                { value: '%100', label: 'KVKK Uyum' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Orta: Three.js Particle Sphere */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="flex items-center justify-center"
            style={{ height: 420 }}
          >
            <ParticleSphere />
          </motion.div>

          {/* Sağ: Modül Listesi */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="flex flex-col gap-2"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/30">
              Platform Modülleri
            </p>
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
                className="group w-full rounded-lg border border-white/5 bg-white/3 px-4 py-3 text-left transition-all duration-200 hover:border-white/15 hover:bg-white/8"
                style={{
                  backgroundColor: activeModule === mod.id ? 'rgba(142,227,239,0.08)' : undefined,
                  borderColor: activeModule === mod.id ? 'rgba(142,227,239,0.25)' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#8EE3EF]/60">{mod.id}</span>
                    <span className="text-sm font-semibold text-white">{mod.code}</span>
                    <span className="text-xs text-white/40">{mod.label}</span>
                  </div>
                  <svg
                    className={`h-3.5 w-3.5 text-white/30 transition-transform duration-200 ${activeModule === mod.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {activeModule === mod.id && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 text-xs leading-relaxed text-white/50"
                  >
                    {mod.desc}
                  </motion.p>
                )}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
