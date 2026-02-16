import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

const solutions = [
  {
    title: 'Kurumsal Kültür Profili (OCAI+)',
    description: 'Cameron & Quinn Rekabetçi Değerler Çerçevesi ile kurumunuzun kültür DNA\'sını ortaya çıkarır. Mevcut ve tercih edilen kültür arasındaki farkı görselleştirir.',
    features: ['Radar chart profil', 'Boyut bazlı analiz', 'Kültür gap raporu', 'Benchmark karşılaştırma'],
    yokak: ['A.2.1'],
    color: 'bg-primary',
  },
  {
    title: 'Kalite Kültürü Değerlendirme (QCI-TR)',
    description: 'EFQM Mükemmellik Modeli çerçevesinde kalite kültürünün 6 boyutunu ölçer. YÖKAK iç kalite güvencesi kanıtı olarak kullanılır.',
    features: ['6 alt boyut skoru', 'Güçlü/zayıf yön analizi', 'Birim karşılaştırma', 'Trend takibi'],
    yokak: ['A.1.4', 'A.3.1', 'A.3.4'],
    color: 'bg-secondary',
  },
  {
    title: '360° Liderlik Değerlendirme (MSAI-YÖ)',
    description: 'Yöneticilerin öz, ast, eşdüzey ve üst perspektiflerinden değerlendirilmesi. Kör nokta analizi ile gelişim alanları belirlenir.',
    features: ['4 perspektif', 'Kör nokta raporu', 'Güçlü yön analizi', 'Bireysel gelişim planı'],
    yokak: ['A.2.3'],
    color: 'bg-accent',
  },
  {
    title: 'Çalışan Bağlılığı (UWES-TR)',
    description: 'Schaufeli & Bakker UWES-9 ölçeği ile akademik ve idari personelin dinçlik, adanmışlık ve yoğunlaşma düzeylerini ölçer.',
    features: ['3 boyut skoru', 'Departman karşılaştırma', 'Demografik analiz', 'Turnover risk tahmini'],
    yokak: ['A.5'],
    color: 'bg-frosted',
  },
  {
    title: 'Paydaş Katılım Endeksi (PKE)',
    description: 'Türkiye yükseköğretim ekosistemine özgü geliştirilmiş ölçek. İç ve dış paydaşların katılım etkinliğini ölçer.',
    features: ['5 boyut', 'Paydaş grubu analizi', 'Katılım haritası', 'İyileştirme önerileri'],
    yokak: ['A.4.1'],
    color: 'bg-icy',
  },
  {
    title: 'Stratejik Plan Uyum Analizi (SPU)',
    description: 'Kurumun stratejik planı ile günlük operasyonlar arasındaki uyumu ölçer. Plan-uygulama kopukluklarını tespit eder.',
    features: ['5 boyut', 'Uyum skoru', 'Gap analizi', 'Aksiyon önerileri'],
    yokak: ['A.6'],
    color: 'bg-primary/70',
  },
];

export const metadata: Metadata = {
  title: 'Çözümler — 6 Bilimsel Ölçek',
  description: 'OCAI+, QCI-TR, MSAI-YÖ, UWES-TR, PKE ve SPU ölçekleri ile kurumsal kültür değerlendirme çözümleri.',
  openGraph: {
    title: 'CVF-QA Çözümler — 6 Bilimsel Ölçek',
    description: 'OCAI+, QCI-TR, MSAI-YÖ, UWES-TR, PKE ve SPU ölçekleri ile kurumsal kültür değerlendirme çözümleri.',
  },
};

export default function SolutionsPage() {
  return (
    <div>
      <section className="bg-primary py-20 pt-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">Çözümlerimiz</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            6 bilimsel ölçek ile kurumsal kültürünüzün her boyutunu ölçün, YÖKAK akreditasyonuna hazır kanıt dosyaları oluşturun.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl space-y-8">
            {solutions.map((sol) => (
              <Card key={sol.title} className="overflow-hidden">
                <div className="md:flex">
                  <div className={`${sol.color} flex w-full items-center justify-center p-8 md:w-48`}>
                    <div className="flex flex-wrap gap-1">
                      {sol.yokak.map((y) => (
                        <Badge key={y} className="bg-white/20 text-white">{y}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <CardHeader>
                      <CardTitle className="text-xl">{sol.title}</CardTitle>
                      <CardDescription>{sol.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {sol.features.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-primary">✓</span> {f}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link href="/demo">Demo Talep Et</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
