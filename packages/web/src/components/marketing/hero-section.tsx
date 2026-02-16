import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-primary/20" />
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70">
            YÖKAK Akreditasyon Destek Platformu
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Kurumsal Kültürünüzü{' '}
            <span className="bg-gradient-to-r from-primary to-frosted bg-clip-text text-transparent">
              Veriye Dayalı
            </span>{' '}
            Yönetin
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
            6 bilimsel ölçekle kurumsal kültür değerlendirmesi yapın, YÖKAK kanıt dosyalarınızı
            otomatik oluşturun, 360° liderlik analizi ile yöneticilerinizi geliştirin.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg">
              <Link href="/demo">Ücretsiz Demo Talep Et</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 border-white/20 px-8 text-base text-white hover:bg-white/10 hover:text-white">
              <Link href="/cozumler">Çözümleri İncele</Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-8">
            <div>
              <div className="text-3xl font-bold text-white">6</div>
              <div className="text-sm text-white/50">Bilimsel Ölçek</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">146</div>
              <div className="text-sm text-white/50">Toplam Soru</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">%100</div>
              <div className="text-sm text-white/50">KVKK Uyum</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
