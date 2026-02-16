'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const modules = [
  {
    id: 'M1', code: 'OCAI+', name: 'Örgüt Kültürü Değerlendirme', items: 24,
    format: 'İpsatif (100 puan dağıtma)',
    dimensions: ['Klan', 'Adhokrasi', 'Pazar', 'Hiyerarşi'],
    description: 'Cameron & Quinn modeli ile kurumunuzun mevcut ve tercih edilen kültür profilini ortaya çıkarır.',
    yokak: ['A.2.1'],
  },
  {
    id: 'M2', code: 'QCI-TR', name: 'Kalite Kültürü Envanteri', items: 30,
    format: "5'li Likert",
    dimensions: ['Liderlik', 'Strateji', 'İnsan Kaynakları', 'Ortaklıklar', 'Süreçler', 'Sonuçlar'],
    description: 'EFQM çerçevesinde iç kalite güvence mekanizmalarının etkinliğini ölçer.',
    yokak: ['A.1.4', 'A.3.1', 'A.3.4'],
  },
  {
    id: 'M3', code: 'MSAI-YÖ', name: '360° Liderlik Değerlendirme', items: 48,
    format: '360° Likert',
    dimensions: ['İşbirliği', 'Yenilikçilik', 'Rekabetçilik', 'Kontrol'],
    description: 'Yöneticilerin 4 farklı perspektiften değerlendirildiği kapsamlı 360° analiz.',
    yokak: ['A.2.3'],
  },
  {
    id: 'M4', code: 'UWES-TR', name: 'Çalışan Bağlılığı', items: 9,
    format: "7'li Likert",
    dimensions: ['Dinçlik', 'Adanmışlık', 'Yoğunlaşma'],
    description: 'Schaufeli & Bakker UWES-9 ölçeği ile akademik ve idari personelin işe bağlılığını ölçer.',
    yokak: ['A.5'],
  },
  {
    id: 'M5', code: 'PKE', name: 'Paydaş Katılım Endeksi', items: 20,
    format: "5'li Likert",
    dimensions: ['İletişim', 'Karar Katılımı', 'Geri Bildirim', 'İşbirliği', 'Memnuniyet'],
    description: 'Türkiye yükseköğretim ekosisteminin kendine özgü paydaş yapısına özel geliştirilmiş ölçek.',
    yokak: ['A.4.1'], original: true,
  },
  {
    id: 'M6', code: 'SPU', name: 'Stratejik Plan Uyum Analizi', items: 15,
    format: "5'li Likert",
    dimensions: ['Vizyon Bilinci', 'Hedef Uyumu', 'Kaynak Yeterliliği', 'İzleme', 'Uyarlama'],
    description: 'Kurumun stratejik planı ile günlük operasyonlar arasındaki uyumu ölçer.',
    yokak: ['A.6'], original: true,
  },
];

export function ModuleTabs() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-navy md:text-4xl">6 Bilimsel Ölçek</h2>
          <p className="text-lg text-muted-foreground">
            Her biri akademik geçerliliği kanıtlanmış, Türkiye yükseköğretim sistemine uyarlanmış.
          </p>
        </div>

        <Tabs defaultValue="M1" className="mx-auto max-w-4xl">
          <TabsList className="mb-8 grid w-full grid-cols-3 md:grid-cols-6">
            {modules.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="text-xs md:text-sm">{m.code}</TabsTrigger>
            ))}
          </TabsList>

          {modules.map((m) => (
            <TabsContent key={m.id} value={m.id}>
              <Card className="border shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{m.name}</CardTitle>
                    {m.original && <Badge variant="accent">Özgün</Badge>}
                  </div>
                  <CardDescription className="leading-relaxed">{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Soru Sayısı</div>
                      <div className="text-2xl font-bold text-primary">{m.items}</div>
                      <div className="text-xs text-muted-foreground">{m.format}</div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium text-muted-foreground">Boyutlar</div>
                      <div className="flex flex-wrap gap-1">
                        {m.dimensions.map((d) => (
                          <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium text-muted-foreground">YÖKAK Ölçütleri</div>
                      <div className="flex flex-wrap gap-1">
                        {m.yokak.map((y) => (
                          <Badge key={y} variant="accent" className="text-xs">{y}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
