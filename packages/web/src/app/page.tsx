import type { Metadata } from 'next';
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
import { MarketingNav } from '@/components/marketing/marketing-nav';

export const metadata: Metadata = {
  title: 'CVF-QA | Kurumsal Kültür Değerlendirme Platformu',
  description: 'Yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.',
};

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
