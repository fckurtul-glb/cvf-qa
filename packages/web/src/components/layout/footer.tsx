import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  urun: [
    { label: 'Çözümler', href: '/cozumler' },
    { label: 'Fiyatlandırma', href: '/fiyatlandirma' },
    { label: 'Demo', href: '/demo' },
    { label: 'Hakkımızda', href: '/hakkimizda' },
    { label: 'İletişim', href: '/iletisim' },
  ],
  kaynaklar: [
    { label: 'Blog', href: '/blog' },
    { label: 'YÖKAK Rehberi', href: '/blog' },
    { label: 'API Dokümantasyonu', href: '/blog' },
  ],
  yasal: [
    { label: 'KVKK Aydınlatma Metni', href: '/kvkk' },
    { label: 'Gizlilik Politikası', href: '/gizlilik' },
    { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' },
    { label: 'Çerez Politikası', href: '/cerez-politikasi' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-primary py-16 text-white">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-white">
                QA
              </div>
              <span className="text-lg font-semibold">CVF-QA</span>
            </div>
            <p className="text-sm leading-relaxed text-white/50">
              Yükseköğretim kurumları için kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.
            </p>
            <p className="mt-4 text-sm text-white/40">
              destek@cvf-qa.com.tr
            </p>
          </div>

          {/* Ürün */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">Ürün</h3>
            <ul className="space-y-2.5">
              {footerLinks.urun.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/50 transition-colors duration-150 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kaynaklar */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">Kaynaklar</h3>
            <ul className="space-y-2.5">
              {footerLinks.kaynaklar.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/50 transition-colors duration-150 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Yasal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">Yasal</h3>
            <ul className="space-y-2.5">
              {footerLinks.yasal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/50 transition-colors duration-150 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/30 md:flex-row">
          <p>&copy; {new Date().getFullYear()} CVF-QA. Tüm hakları saklıdır.</p>
          <p>Türkiye&apos;de tasarlanıp geliştirilmiştir.</p>
        </div>
      </div>
    </footer>
  );
}
