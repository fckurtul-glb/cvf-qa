import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(212,168,67,0.15),transparent_70%)]" />
      <div className="container relative z-10 mx-auto px-4 text-center">
        <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-4xl">
          Kurumsal Kültür Değerlendirmenize Başlayalım
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
          15 dakikalık demo görüşmesinde CVF-QA&apos;nin kurumunuza nasıl değer katacağını göstermek isteriz.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 bg-white px-8 text-base text-primary shadow-lg hover:bg-white/90">
            <Link href="/demo">Demo Talep Et</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 border-white/30 px-8 text-base text-white hover:bg-white/10 hover:text-white">
            <Link href="/fiyatlandirma">Fiyatları Gör</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
