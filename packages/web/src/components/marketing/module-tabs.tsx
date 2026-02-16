import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const modules = [
  {
    id: 'M1', code: 'OCAI+', name: 'Örgüt Kültürü Değerlendirme', items: 24,
    format: 'İpsatif (100 puan dağıtma)',
    dimensions: ['Klan', 'Adhokrasi', 'Pazar', 'Hiyerarşi'],
    description: 'Cameron & Quinn modeli ile kurumunuzun mevcut ve tercih edilen kültür profilini ortaya çıkarır.',
    yokak: ['A.2.1'],
    color: 'bg-primary',
  },
  {
    id: 'M2', code: 'QCI-TR', name: 'Kalite Kültürü Envanteri', items: 30,
    format: "5'li Likert",
    dimensions: ['Liderlik', 'Strateji', 'İnsan Kaynakları', 'Ortaklıklar', 'Süreçler', 'Sonuçlar'],
    description: 'EFQM çerçevesinde iç kalite güvence mekanizmalarının etkinliğini ölçer.',
    yokak: ['A.1.4', 'A.3.1', 'A.3.4'],
    color: 'bg-secondary',
  },
  {
    id: 'M3', code: 'MSAI-YÖ', name: '360° Liderlik Değerlendirme', items: 48,
    format: '360° Likert',
    dimensions: ['İşbirliği', 'Yenilikçilik', 'Rekabetçilik', 'Kontrol'],
    description: 'Yöneticilerin 4 farklı perspektiften değerlendirildiği kapsamlı 360° analiz.',
    yokak: ['A.2.3'],
    color: 'bg-accent',
  },
  {
    id: 'M4', code: 'UWES-TR', name: 'Çalışan Bağlılığı', items: 9,
    format: "7'li Likert",
    dimensions: ['Dinçlik', 'Adanmışlık', 'Yoğunlaşma'],
    description: 'Schaufeli & Bakker UWES-9 ölçeği ile akademik ve idari personelin işe bağlılığını ölçer.',
    yokak: ['A.5'],
    color: 'bg-frosted',
  },
  {
    id: 'M5', code: 'PKE', name: 'Paydaş Katılım Endeksi', items: 20,
    format: "5'li Likert",
    dimensions: ['İletişim', 'Karar Katılımı', 'Geri Bildirim', 'İşbirliği', 'Memnuniyet'],
    description: 'Türkiye yükseköğretim ekosisteminin kendine özgü paydaş yapısına özel geliştirilmiş ölçek.',
    yokak: ['A.4.1'], original: true,
    color: 'bg-icy',
  },
  {
    id: 'M6', code: 'SPU', name: 'Stratejik Plan Uyum Analizi', items: 15,
    format: "5'li Likert",
    dimensions: ['Vizyon Bilinci', 'Hedef Uyumu', 'Kaynak Yeterliliği', 'İzleme', 'Uyarlama'],
    description: 'Kurumun stratejik planı ile günlük operasyonlar arasındaki uyumu ölçer.',
    yokak: ['A.6'], original: true,
    color: 'bg-primary',
  },
];

export function ModuleTabs() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-navy md:text-4xl">6 Bilimsel Ölçek</h2>
          <p className="text-lg text-muted-foreground">
            Her biri akademik geçerliliği kanıtlanmış, Türkiye yükseköğretim sistemine uyarlanmış.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Card key={m.id} className="border shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color} text-sm font-bold text-white`}>
                    {m.id}
                  </div>
                  <div>
                    <div className="font-semibold text-navy">{m.code}</div>
                    {m.original && <Badge variant="accent" className="text-[10px]">Özgün</Badge>}
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-navy">{m.name}</h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{m.items}</span>
                  <span className="text-xs text-muted-foreground">soru &middot; {m.format}</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {m.dimensions.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.yokak.map((y) => (
                    <Badge key={y} variant="accent" className="text-xs">{y}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
