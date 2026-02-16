import type { Metadata } from 'next';
import { ContactForm } from '@/components/marketing/contact-form';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Demo Talep Et',
  description: 'CVF-QA platformunu canlı olarak görün. Ücretsiz demo görüşmesi için formu doldurun.',
  openGraph: {
    title: 'CVF-QA Demo Talep Et',
    description: 'CVF-QA platformunu canlı olarak görün. Ücretsiz demo görüşmesi için formu doldurun.',
  },
};

export default function DemoPage() {
  return (
    <div>
      <section className="bg-primary py-20 pt-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">Demo Talep Edin</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            CVF-QA platformunu canlı olarak görün. 15 dakikalık demo görüşmemizde tüm sorularınızı yanıtlayalım.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
            <div className="space-y-8">
              <h2 className="font-display text-2xl font-bold text-foreground">Demo Görüşmesinde</h2>
              <div className="space-y-6">
                {[
                  { title: 'Platform Turu', desc: 'Kampanya oluşturma, anket doldurma ve raporlama süreçlerini canlı görün.' },
                  { title: 'YÖKAK Eşleştirme', desc: 'Kanıt dosyasının otomatik oluşturulma sürecini inceleyin.' },
                  { title: '360° Değerlendirme', desc: 'Liderlik değerlendirme ve kör nokta analizini keşfedin.' },
                  { title: 'Güvenlik Altyapısı', desc: 'Şifreleme, anonimlik ve KVKK uyum mekanizmalarını öğrenin.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
