import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const packages = [
  {
    name: 'Starter',
    price: 'Teklif Alın',
    description: 'Temel kültür değerlendirmesi için ideal başlangıç.',
    modules: ['OCAI+', 'QCI-TR', 'UWES-TR'],
    features: ['3 ölçek', '500 katılımcıya kadar', 'Kurum raporu', 'E-posta destek'],
    popular: false,
  },
  {
    name: 'Professional',
    price: 'Teklif Alın',
    description: 'Kapsamlı değerlendirme ve paydaş analizi.',
    modules: ['OCAI+', 'QCI-TR', 'UWES-TR', 'PKE', 'SPU'],
    features: ['5 ölçek', '2.000 katılımcıya kadar', 'YÖKAK kanıt dosyası', 'Birim bazlı raporlar', 'Öncelikli destek'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Teklif Alın',
    description: '360° liderlik dahil tüm modüller.',
    modules: ['OCAI+', 'QCI-TR', 'MSAI-YÖ', 'UWES-TR', 'PKE', 'SPU'],
    features: ['6 ölçek + 360°', 'Sınırsız katılımcı', 'AI destekli yorumlar', 'API entegrasyonu', 'Özel danışmanlık'],
    popular: false,
  },
];

export function PackageCards() {
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-navy md:text-4xl">Paketler</h2>
          <p className="text-lg text-muted-foreground">Kurumunuzun ihtiyacına uygun paketi seçin.</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.name} className={`relative transition-all duration-200 ${pkg.popular ? 'border-2 border-accent shadow-lg scale-[1.02]' : 'hover:shadow-lg'}`}>
              {pkg.popular && (
                <Badge variant="accent" className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm">En Popüler</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-1">
                  {pkg.modules.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                  ))}
                </div>
                <ul className="mb-6 space-y-2.5">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={pkg.popular ? 'default' : 'outline'}>
                  <Link href="/demo">{pkg.price}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
