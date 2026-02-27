'use client';

import { motion } from 'framer-motion';

const steps = [
  { number: '01', title: 'Bağlan', description: 'Modüllerinizi seçin, hedef grupları belirleyin, tek tıkla anket linklerini gönderin.' },
  { number: '02', title: 'Ölç', description: 'Katılımcılar anonim olarak bilimsel ölçekleri tamamlar. Otomatik hatırlatma ve ilerleme takibi.' },
  { number: '03', title: 'Analiz Et', description: 'Radar chart\'lar, gap analizi, 360° kör nokta raporu — tüm sonuçlar anında hesaplanır.' },
  { number: '04', title: 'Raporla', description: 'Ölçüt eşleştirmeli YÖKAK kanıt dosyanız PDF olarak hazır. İndirin, dış değerlendirmeye sunun.' },
  { number: '05', title: 'Dönüştür', description: 'AI destekli önerilerle kurumsal kültürünüzü iyileştirin, gelişim planları oluşturun.' },
];

export function SolutionSteps() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4 font-display text-3xl font-bold text-navy md:text-4xl">Nasıl Çalışır?</h2>
          <p className="text-lg text-muted-foreground">5 adımda kurumsal kültür değerlendirmenizi tamamlayın.</p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3 lg:grid-cols-5">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {i < steps.length - 1 && (
                <div className="absolute top-7 left-[calc(50%+28px)] hidden h-0.5 w-[calc(100%-56px)] bg-gradient-to-r from-secondary/30 to-secondary/10 lg:block" />
              )}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xl font-bold text-white shadow-lg shadow-primary/20">
                {step.number}
              </div>
              <h3 className="mb-2 font-semibold text-navy">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
