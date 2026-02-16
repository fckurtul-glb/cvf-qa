import { Card, CardContent } from '@/components/ui/card';

const statistics = [
  {
    stat: '%73',
    title: 'Excel ile Veri Toplama',
    description: 'Kurumların %73\'ü hâlâ Excel ile kültür verisi topluyor — hata oranı yüksek, analiz süresi uzun.',
    icon: '📊',
  },
  {
    stat: '%60',
    title: 'YÖKAK Kanıt Eksikliği',
    description: 'Kurumların %60\'ında YÖKAK kanıt dosyası eksik veya yetersiz — akreditasyon riski artıyor.',
    icon: '📋',
  },
  {
    stat: '%45',
    title: 'Düşük Çalışan Bağlılığı',
    description: 'Akademik personelin %45\'inde çalışan bağlılığı düşük — verimlilik ve kalite doğrudan etkileniyor.',
    icon: '📉',
  },
];

export function PainPoints() {
  return (
    <section className="bg-icy/20 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-navy md:text-4xl">Neden CVF-QA?</h2>
          <p className="text-lg text-muted-foreground">
            Yükseköğretim kurumlarının kültür değerlendirme süreçlerindeki en büyük sorunları çözüyoruz.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {statistics.map((item) => (
            <Card key={item.title} className="border-0 bg-white shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">{item.icon}</div>
                <div className="mb-2 font-display text-4xl font-bold text-accent">{item.stat}</div>
                <h3 className="mb-2 text-lg font-semibold text-navy">{item.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
