import type { Metadata } from 'next';
import { PackageCards } from '@/components/marketing/package-cards';
import { CTASection } from '@/components/marketing/cta-section';
import { Footer } from '@/components/layout/footer';

const faqItems = [
  {
    q: 'Minimum katılımcı sayısı var mı?',
    a: 'İstatistiksel anlamlılık için en az 30 katılımcı önerilir. Birim bazlı raporlarda anonimlik için minimum 5 kişi gereklidir.',
  },
  {
    q: 'Verilerimiz nerede saklanır?',
    a: 'Tüm veriler Türkiye\'deki veri merkezlerinde, AES-256 şifreleme ile saklanır. KVKK\'ya tam uyum sağlanır.',
  },
  {
    q: 'Anket süresi ne kadar?',
    a: 'Tek modül için ortalama 5-10 dakika, tüm modüller için toplam 30-40 dakika. Otomatik kaydetme ile yarım kalınan yerden devam edilebilir.',
  },
  {
    q: 'YÖKAK kanıt dosyası ne içerir?',
    a: 'Her YÖKAK ölçütü için ilgili modül skorları, alt boyut analizleri, örneklem bilgileri ve değerlendirme düzeyi. PDF olarak indirilir.',
  },
  {
    q: 'Entegrasyon imkânları var mı?',
    a: 'Enterprise pakette REST API erişimi sunulmaktadır. OBS, EBYS gibi sistemlerle entegrasyon için destek sağlanır.',
  },
  {
    q: 'Hangi üniversiteler kullanıyor?',
    a: 'Platform şu anda pilot üniversitelerle test aşamasındadır. Erken erişim için demo talep edebilirsiniz.',
  },
  {
    q: 'Sonuçlar ne kadar güvenilir?',
    a: 'Tüm ölçekler uluslararası akademik yayınlarda geçerliliği kanıtlanmış araçlardır. Cronbach alpha değerleri 0.80 üzerindedir.',
  },
  {
    q: 'Birden fazla kampanya yürütebilir miyiz?',
    a: 'Evet, Professional ve Enterprise paketlerde eş zamanlı birden fazla kampanya oluşturabilir ve yönetebilirsiniz.',
  },
];

export const metadata: Metadata = {
  title: 'Fiyatlandırma — Paketler',
  description: 'CVF-QA Starter, Professional ve Enterprise paketleri. Kurumunuzun ihtiyacına uygun seçenekler.',
  openGraph: {
    title: 'CVF-QA Fiyatlandırma',
    description: 'CVF-QA Starter, Professional ve Enterprise paketleri. Kurumunuzun ihtiyacına uygun seçenekler.',
  },
};

export default function PricingPage() {
  return (
    <div>
      <section className="bg-primary py-20 pt-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">Fiyatlandırma</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Kurumunuzun büyüklüğüne ve ihtiyaçlarına uygun paketi seçin.
          </p>
        </div>
      </section>

      <PackageCards />

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-foreground">Sık Sorulan Sorular</h2>
          <div className="mx-auto max-w-3xl space-y-6">
            {faqItems.map((item) => (
              <div key={item.q} className="rounded-lg border p-6">
                <h3 className="mb-2 font-semibold text-foreground">{item.q}</h3>
                <p className="text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
      <Footer />
    </div>
  );
}
