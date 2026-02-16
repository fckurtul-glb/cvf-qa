import type { Metadata } from 'next';
import { ContactForm } from '@/components/marketing/contact-form';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'CVF-QA ile iletişime geçin. Demo talep edin, sorularınızı sorun.',
  openGraph: {
    title: 'CVF-QA İletişim',
    description: 'CVF-QA ile iletişime geçin. Demo talep edin, sorularınızı sorun.',
  },
};

export default function ContactPage() {
  return (
    <div>
      <section className="bg-primary py-20 pt-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">İletişim</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Sorularınız mı var? Demo talep etmek mi istiyorsunuz? Bizimle iletişime geçin.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Bize Ulaşın</h2>
                <p className="leading-relaxed text-muted-foreground">
                  Platformumuz hakkında detaylı bilgi almak, kurumunuza özel teklif almak veya teknik
                  sorularınızı sormak için aşağıdaki kanallardan bize ulaşabilirsiniz.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">E-posta</h3>
                    <p className="text-muted-foreground">destek@cvf-qa.com.tr</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Telefon</h3>
                    <p className="text-muted-foreground">+90 (312) 000 00 00</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Adres</h3>
                    <p className="text-muted-foreground">Ankara, Türkiye</p>
                  </div>
                </div>
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
