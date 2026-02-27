'use client';

import { HeroSection } from '@/components/marketing/hero-section';
import { PainPoints } from '@/components/marketing/pain-points';
import { ModuleTabs } from '@/components/marketing/module-tabs';
import { YokakRedFlags } from '@/components/marketing/yokak-red-flags';
import { SolutionSteps } from '@/components/marketing/solution-steps';
import { PackageCards } from '@/components/marketing/package-cards';
import { TrustSection } from '@/components/marketing/trust-section';
import { CTASection } from '@/components/marketing/cta-section';
import { ContactForm } from '@/components/marketing/contact-form';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40);
  });

  return (
    <motion.nav
      className="fixed left-0 right-0 top-0 z-50 backdrop-blur-md transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: scrolled ? 'linear-gradient(135deg, #254E70, #1a3a55)' : 'rgba(255,255,255,0.1)',
              color: 'white',
            }}
          >
            QA
          </div>
          <span
            className="text-lg font-semibold transition-colors duration-300"
            style={{ color: scrolled ? '#1e293b' : 'white' }}
          >
            CVF-QA
          </span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {[
            { href: '/cozumler', label: 'Çözümler' },
            { href: '/fiyatlandirma', label: 'Fiyatlandırma' },
            { href: '/hakkimizda', label: 'Hakkımızda' },
            { href: '/blog', label: 'Blog' },
            { href: '/iletisim', label: 'İletişim' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200"
              style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.65)' }}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/auth/login"
            className="text-sm transition-colors duration-200"
            style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.65)' }}
          >
            Giriş Yap
          </Link>

          <Link
            href="/demo"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{
              background: scrolled ? '#254E70' : 'rgba(142,227,239,0.15)',
              border: scrolled ? 'none' : '1px solid rgba(142,227,239,0.3)',
            }}
          >
            Demo
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

export default function HomePage() {
  return (
    <div>
      <MarketingNav />
      <HeroSection />
      <TrustSection />
      <PainPoints />
      <SolutionSteps />
      <ModuleTabs />
      <YokakRedFlags />
      <PackageCards />
      <CTASection />

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-foreground md:text-4xl">Sık Sorulan Sorular</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {[
              { q: 'CVF-QA nedir?', a: 'CVF-QA, Cameron & Quinn Rekabetçi Değerler Çerçevesi üzerine inşa edilmiş, yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformudur.' },
              { q: 'Hangi ölçekler kullanılıyor?', a: '6 bilimsel ölçek: OCAI+ (Kültür Profili), QCI-TR (Kalite Kültürü), MSAI-YÖ (360° Liderlik), UWES-TR (Çalışan Bağlılığı), PKE (Paydaş Katılımı), SPU (Stratejik Plan Uyumu).' },
              { q: 'Verilerimiz güvende mi?', a: 'Evet. AES-256 şifreleme, KVKK tam uyum, Türkiye lokasyonlu sunucular, Row Level Security ve kriptografik anonimlik garantisi sunuyoruz.' },
              { q: 'Minimum katılımcı sayısı var mı?', a: 'İstatistiksel anlamlılık için en az 30 katılımcı önerilir. Birim bazlı raporlarda anonimlik için minimum 5 kişi gereklidir.' },
              { q: 'YÖKAK kanıt dosyası ne içerir?', a: 'Her YÖKAK ölçütü için ilgili modül skorları, alt boyut analizleri, örneklem bilgileri ve değerlendirme düzeyi. PDF olarak indirilir.' },
              { q: 'Anket süresi ne kadar?', a: 'Tek modül için ortalama 5-10 dakika, tüm modüller için toplam 30-40 dakika. Yarım kalınan yerden devam edilebilir.' },
              { q: 'Sonuçlar ne kadar güvenilir?', a: 'Tüm ölçekler uluslararası akademik yayınlarda geçerliliği kanıtlanmış araçlardır. Cronbach alpha değerleri 0.80 üzerindedir.' },
              { q: 'Demo nasıl talep edebilirim?', a: 'Sayfanın altındaki formu doldurabilir veya doğrudan destek@cvf-qa.com.tr adresine e-posta gönderebilirsiniz. 15 dakikalık demo görüşmesi ücretsizdir.' },
            ].map((item) => (
              <details key={item.q} className="group rounded-lg border p-4 transition-colors hover:bg-muted/30">
                <summary className="cursor-pointer font-semibold text-foreground">{item.q}</summary>
                <p className="mt-3 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ContactForm />
      <Footer />
    </div>
  );
}
