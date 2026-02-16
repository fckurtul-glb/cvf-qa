'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MiniSurveyResult {
  klan: number;
  adhokrasi: number;
  pazar: number;
  hiyerarsi: number;
}

const questions = [
  {
    id: 'q1',
    module: 'OCAI+',
    text: 'Kurumunuzda en çok hangi değer öne çıkar?',
    options: [
      { label: 'İşbirliği ve takım ruhu', culture: 'klan' as const },
      { label: 'Yenilikçilik ve girişimcilik', culture: 'adhokrasi' as const },
      { label: 'Rekabet ve sonuç odaklılık', culture: 'pazar' as const },
      { label: 'Düzen ve süreç yönetimi', culture: 'hiyerarsi' as const },
    ],
  },
  {
    id: 'q2',
    module: 'QCI-TR',
    text: 'Kalite güvence süreçleriniz ne düzeyde?',
    options: [
      { label: 'Sistematik ve sürekli iyileştirme var', culture: 'klan' as const },
      { label: 'Yenilikçi yaklaşımlar deneniyor', culture: 'adhokrasi' as const },
      { label: 'Performans odaklı ve ölçülebilir', culture: 'pazar' as const },
      { label: 'Standartlara ve prosedürlere uygun', culture: 'hiyerarsi' as const },
    ],
  },
  {
    id: 'q3',
    module: 'MSAI-YÖ',
    text: 'Yöneticileriniz nasıl bir liderlik tarzı sergiler?',
    options: [
      { label: 'Mentorluk ve koçluk yaparlar', culture: 'klan' as const },
      { label: 'Vizyoner ve ilham vericidirler', culture: 'adhokrasi' as const },
      { label: 'Hedef odaklı ve kararlıdırlar', culture: 'pazar' as const },
      { label: 'Koordinatör ve organize edicidirler', culture: 'hiyerarsi' as const },
    ],
  },
  {
    id: 'q4',
    module: 'UWES-TR',
    text: 'Çalışanlarınızın işe bağlılığı nasıl?',
    options: [
      { label: 'Enerjik ve istekli çalışırlar', culture: 'klan' as const },
      { label: 'Yaratıcı projelerle motive olurlar', culture: 'adhokrasi' as const },
      { label: 'Başarı ve ödüllerle motive olurlar', culture: 'pazar' as const },
      { label: 'İstikrar ve güvenlik önemlidir', culture: 'hiyerarsi' as const },
    ],
  },
  {
    id: 'q5',
    module: 'PKE',
    text: 'Paydaşlarınız karar süreçlerine ne kadar katılır?',
    options: [
      { label: 'Aktif katılım ve ortak karar alma', culture: 'klan' as const },
      { label: 'Yenilikçi fikirlere açık platformlar', culture: 'adhokrasi' as const },
      { label: 'Sonuç odaklı geri bildirim mekanizmaları', culture: 'pazar' as const },
      { label: 'Formel karar alma süreçleri', culture: 'hiyerarsi' as const },
    ],
  },
  {
    id: 'q6',
    module: 'SPU',
    text: 'Stratejik planınız günlük operasyonlara ne kadar yansır?',
    options: [
      { label: 'Herkes planı bilir ve sahiplenir', culture: 'klan' as const },
      { label: 'Plan esnek, değişime açık', culture: 'adhokrasi' as const },
      { label: 'KPI\'lar net, takip sistematik', culture: 'pazar' as const },
      { label: 'Prosedürler planla uyumlu', culture: 'hiyerarsi' as const },
    ],
  },
];

const cultureLabels: Record<string, string> = {
  klan: 'Klan Kültürü',
  adhokrasi: 'Adhokrasi Kültürü',
  pazar: 'Pazar Kültürü',
  hiyerarsi: 'Hiyerarşi Kültürü',
};

const cultureColors: Record<string, string> = {
  klan: 'bg-frosted text-primary',
  adhokrasi: 'bg-accent/10 text-accent',
  pazar: 'bg-secondary/10 text-secondary',
  hiyerarsi: 'bg-primary/10 text-primary',
};

export function MiniCultureSurvey() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', university: '', title: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (culture: string) => {
    const q = questions[currentQ];
    setAnswers((prev) => ({ ...prev, [q.id]: culture }));

    if (currentQ < questions.length - 1) {
      setTimeout(() => setCurrentQ((i) => i + 1), 300);
    } else {
      setTimeout(() => setShowResult(true), 300);
    }
  };

  const getResult = (): MiniSurveyResult => {
    const scores = { klan: 0, adhokrasi: 0, pazar: 0, hiyerarsi: 0 };
    Object.values(answers).forEach((culture) => {
      scores[culture as keyof MiniSurveyResult] += 1;
    });
    // Normalize to percentage (6 questions total)
    return {
      klan: Math.round((scores.klan / 6) * 100),
      adhokrasi: Math.round((scores.adhokrasi / 6) * 100),
      pazar: Math.round((scores.pazar / 6) * 100),
      hiyerarsi: Math.round((scores.hiyerarsi / 6) * 100),
    };
  };

  const getDominant = () => {
    const result = getResult();
    const max = Math.max(result.klan, result.adhokrasi, result.pazar, result.hiyerarsi);
    if (result.klan === max) return 'klan';
    if (result.adhokrasi === max) return 'adhokrasi';
    if (result.pazar === max) return 'pazar';
    return 'hiyerarsi';
  };

  // Result screen
  if (showResult) {
    const result = getResult();
    const dominant = getDominant();

    if (submitted) {
      return (
        <div className="flex min-h-[500px] items-center justify-center rounded-2xl bg-primary p-8 text-center">
          <div>
            <div className="mb-4 text-5xl">✓</div>
            <h3 className="mb-2 font-display text-2xl font-bold text-white">Teşekkürler!</h3>
            <p className="text-white/60">Demo talebiniz alındı. En kısa sürede size ulaşacağız.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <h3 className="mb-6 text-center font-display text-2xl font-bold text-foreground">Kültür Profiliniz</h3>

        {/* Simple bar results */}
        <div className="mb-8 space-y-4">
          {(['klan', 'adhokrasi', 'pazar', 'hiyerarsi'] as const).map((culture) => (
            <div key={culture}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{cultureLabels[culture]}</span>
                <span className="text-muted-foreground">%{result[culture]}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    culture === 'klan' && 'bg-frosted',
                    culture === 'adhokrasi' && 'bg-accent',
                    culture === 'pazar' && 'bg-secondary',
                    culture === 'hiyerarsi' && 'bg-primary'
                  )}
                  style={{ width: `${result[culture]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={cn('mb-6 rounded-xl p-4 text-center', cultureColors[dominant])}>
          <p className="text-sm font-medium">Baskın kültür tipiniz:</p>
          <p className="text-lg font-bold">{cultureLabels[dominant]}</p>
        </div>

        <div className="border-t pt-6">
          <h4 className="mb-4 text-center font-semibold text-foreground">Tam profil için demo talep edin</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Ad Soyad"
              value={leadForm.name}
              onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="email"
              placeholder="E-posta"
              value={leadForm.email}
              onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="text"
              placeholder="Üniversite"
              value={leadForm.university}
              onChange={(e) => setLeadForm((f) => ({ ...f, university: e.target.value }))}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="text"
              placeholder="Unvan"
              value={leadForm.title}
              onChange={(e) => setLeadForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button
              className="w-full"
              disabled={!leadForm.name || !leadForm.email}
              onClick={() => setSubmitted(true)}
            >
              Ücretsiz Demo Talep Et
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  const q = questions[currentQ];

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg">
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === currentQ ? 'w-8 bg-accent' : i < currentQ ? 'w-2 bg-accent/40' : 'w-2 bg-muted'
            )}
          />
        ))}
      </div>

      {/* Module badge */}
      <div className="mb-4 text-center">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {q.module}
        </span>
      </div>

      {/* Question */}
      <h3 className="mb-8 text-center font-display text-xl font-bold text-foreground">{q.text}</h3>

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((option, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAnswer(option.culture)}
            className={cn(
              'w-full rounded-xl border-2 p-4 text-left text-sm font-medium transition-all duration-200',
              answers[q.id] === option.culture
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-muted bg-white text-foreground hover:border-accent/40 hover:bg-accent/5'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Question counter */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {currentQ + 1} / {questions.length}
      </p>
    </div>
  );
}
