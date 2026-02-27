'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const redFlags = [
  { criterion: 'A.1.4', title: 'İç Kalite Güvencesi', risk: 'Kalite kültürü ölçülmemiş', solution: 'QCI-TR ölçeği' },
  { criterion: 'A.2.1', title: 'Misyon/Vizyon Uyumu', risk: 'Kültür-strateji uyumsuzluğu', solution: 'OCAI+ kültür profili' },
  { criterion: 'A.2.3', title: 'Performans Yönetimi', risk: 'Yönetici yetkinlik analizi yok', solution: 'MSAI-YÖ 360°' },
  { criterion: 'A.4.1', title: 'Paydaş Katılımı', risk: 'Paydaş memnuniyeti belirsiz', solution: 'PKE endeksi' },
  { criterion: 'A.5', title: 'İnsan Kaynakları', risk: 'Çalışan bağlılığı bilinmiyor', solution: 'UWES-TR ölçeği' },
  { criterion: 'A.6', title: 'Stratejik Planlama', risk: 'Plan-uygulama kopukluğu', solution: 'SPU analizi' },
];

export function YokakRedFlags() {
  return (
    <section className="bg-primary py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-4xl">YÖKAK Dış Değerlendirme Riskleri</h2>
          <p className="text-lg text-white/60">
            Bu ölçütlerde veri eksikliği ciddi puan kayıplarına yol açar. CVF-QA hepsini tek platformda çözer.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {redFlags.map((item, i) => (
            <motion.div
              key={item.criterion}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="border-white/10 bg-white/5 text-white transition-all duration-200 hover:bg-white/8">
                <CardContent className="p-5">
                  <Badge className="mb-3 bg-destructive/20 text-destructive">{item.criterion}</Badge>
                  <h3 className="mb-1 font-semibold">{item.title}</h3>
                  <p className="mb-3 text-sm text-white/50">{item.risk}</p>
                  <div className="rounded-lg bg-frosted/20 px-3 py-2 text-xs font-medium text-frosted">
                    Çözüm: {item.solution}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
