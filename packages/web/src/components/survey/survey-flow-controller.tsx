'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { IpsativeWidget } from './ipsative-widget';
import { LikertWidget } from './likert-widget';
import { cn } from '@/lib/utils';

// ═══ Types ═══
type SurveyStep = 'welcome' | 'consent' | 'demographics' | 'survey' | 'break' | 'complete';

interface SurveyModule {
  code: string;
  name: string;
  format: 'ipsative' | 'likert_5' | 'likert_7' | 'likert_360';
  questions: any[];
}

interface FlowProps {
  campaignName: string;
  orgLogo?: string;
  orgName: string;
  modules: SurveyModule[];
  estimatedMinutes: number;
  sessionId: string;
  savedAnswers?: Record<string, any>;
  savedPosition?: { moduleIndex: number; questionIndex: number };
  onSave: (data: { answers: Record<string, any>; moduleIndex: number; questionIndex: number }) => Promise<void>;
  onSubmit: (answers: Record<string, any>) => Promise<void>;
}

// ═══ Auto-save interval ═══
const AUTO_SAVE_MS = 30_000;

export function SurveyFlowController({
  campaignName,
  orgLogo,
  orgName,
  modules,
  estimatedMinutes,
  sessionId,
  savedAnswers,
  savedPosition,
  onSave,
  onSubmit,
}: FlowProps) {
  const [step, setStep] = useState<SurveyStep>(savedPosition ? 'survey' : 'welcome');
  const [consentGiven, setConsentGiven] = useState(false);
  const [demographics, setDemographics] = useState({ seniorityRange: '', ageRange: '' });
  const [moduleIndex, setModuleIndex] = useState(savedPosition?.moduleIndex ?? 0);
  const [questionIndex, setQuestionIndex] = useState(savedPosition?.questionIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, any>>(savedAnswers ?? {});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();

  const currentModule = modules[moduleIndex];
  const totalQuestions = modules.reduce((sum, m) => sum + m.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  // ── Auto-save ──
  useEffect(() => {
    if (step !== 'survey') return;
    autoSaveRef.current = setInterval(async () => {
      setSaving(true);
      try {
        await onSave({ answers, moduleIndex, questionIndex });
        setLastSaved(new Date());
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
      setSaving(false);
    }, AUTO_SAVE_MS);
    return () => clearInterval(autoSaveRef.current);
  }, [step, answers, moduleIndex, questionIndex, onSave]);

  // ── Session timeout uyarısı (50 dk) ──
  useEffect(() => {
    if (step !== 'survey') return;
    const timer = setTimeout(() => {
      alert('Oturumunuz 10 dakika sonra sona erecek. Lütfen anketi tamamlayın.');
    }, 50 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [step]);

  const handleAnswer = useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const goNext = useCallback(() => {
    if (!currentModule) return;
    if (questionIndex < currentModule.questions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else if (moduleIndex < modules.length - 1) {
      setStep('break');
    } else {
      setStep('complete');
    }
  }, [questionIndex, moduleIndex, currentModule, modules.length]);

  const goPrev = useCallback(() => {
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    } else if (moduleIndex > 0) {
      setModuleIndex((i) => i - 1);
      setQuestionIndex(modules[moduleIndex - 1].questions.length - 1);
    }
  }, [questionIndex, moduleIndex, modules]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit(answers);
    setSaving(false);
  };

  // ═══ RENDER ═══

  // 1. HOŞ GELDİNİZ
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8 text-center">
          {orgLogo && <img src={orgLogo} alt={orgName} className="h-16 mx-auto mb-4" />}
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">{campaignName}</h1>
          <p className="text-muted-foreground mb-1">{orgName}</p>
          <div className="flex items-center justify-center gap-6 my-6 text-sm text-muted-foreground">
            <span>📋 {totalQuestions} soru</span>
            <span>⏱ ~{estimatedMinutes} dk</span>
            <span>🔒 Anonim</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Yanıtlarınız şifreli olarak saklanır. Kimliğiniz kurumunuzla paylaşılmaz.
            Yarıda bırakırsanız kaldığınız yerden devam edebilirsiniz.
          </p>
          <button
            onClick={() => setStep('consent')}
            className="w-full py-3 bg-gradient-to-r from-accent to-accent-light text-white font-semibold rounded-xl hover:shadow-lg transition"
          >
            Başla →
          </button>
        </div>
      </div>
    );
  }

  // 2. KVKK ONAY
  if (step === 'consent') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Kişisel Verilerin Korunması Aydınlatma Metni</h2>
          <div className="h-64 overflow-y-auto border rounded-lg p-4 text-sm text-foreground/70 mb-4 bg-slate-50">
            <p className="mb-3">
              <strong>Veri Sorumlusu:</strong> CVF-QA Ltd. Şti. / {orgName}
            </p>
            <p className="mb-3">
              Bu anket kapsamında toplanan veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) 
              hükümlerine uygun olarak işlenecektir.
            </p>
            <p className="mb-3">
              <strong>Toplanan Veriler:</strong> Birim kodu, kıdem aralığı, yaş aralığı (opsiyonel), 
              anket yanıtları. İsim, TC kimlik no, e-posta gibi doğrudan tanımlayıcı bilgiler toplanmaz.
            </p>
            <p className="mb-3">
              <strong>İşleme Amacı:</strong> Kurumsal kültür değerlendirmesi, birim bazlı karşılaştırma, 
              kalite güvence raporlaması.
            </p>
            <p className="mb-3">
              <strong>Anonimlik:</strong> Yanıtlarınız kriptografik olarak anonim hale getirilir. 
              Kurum yöneticileri bireysel yanıtlara erişemez. 5 kişiden az yanıt gelen birimlerde 
              birim raporu üretilmez.
            </p>
            <p className="mb-3">
              <strong>Veri Saklama:</strong> Veriler Türkiye'de barındırılan sunucularda, AES-256 
              şifreleme ile korunarak saklanır. Talep halinde verileriniz silinir.
            </p>
            <p>
              <strong>Haklarınız:</strong> KVKK Md. 11 kapsamında bilgi edinme, düzeltme, silme, 
              itiraz etme haklarınız mevcuttur. Başvuru: destek@cvf-qa.com.tr
            </p>
          </div>
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-accent focus:ring-accent"
            />
            <span className="text-sm text-foreground">
              Yukarıdaki aydınlatma metnini okudum ve kişisel verilerimin belirtilen amaçlarla 
              işlenmesini kabul ediyorum.
            </span>
          </label>
          <button
            disabled={!consentGiven}
            onClick={() => setStep('demographics')}
            className={cn(
              'w-full py-3 font-semibold rounded-xl transition',
              consentGiven
                ? 'bg-gradient-to-r from-accent to-accent-light text-white hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            Devam →
          </button>
        </div>
      </div>
    );
  }

  // 3. DEMOGRAFİK (Minimal)
  if (step === 'demographics') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-2">Demografik Bilgiler</h2>
          <p className="text-sm text-muted-foreground mb-6">Bu bilgiler birim bazlı karşılaştırma için kullanılır. İsim sorulmaz.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Kıdem Yılı</label>
              <select
                value={demographics.seniorityRange}
                onChange={(e) => setDemographics((d) => ({ ...d, seniorityRange: e.target.value }))}
                className="w-full border rounded-lg p-3 text-sm"
              >
                <option value="">Seçiniz...</option>
                <option value="0-2">0-2 yıl</option>
                <option value="3-5">3-5 yıl</option>
                <option value="6-10">6-10 yıl</option>
                <option value="11-20">11-20 yıl</option>
                <option value="20+">20+ yıl</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Yaş Aralığı <span className="text-muted-foreground/70">(opsiyonel)</span></label>
              <select
                value={demographics.ageRange}
                onChange={(e) => setDemographics((d) => ({ ...d, ageRange: e.target.value }))}
                className="w-full border rounded-lg p-3 text-sm"
              >
                <option value="">Seçiniz...</option>
                <option value="18-25">18-25</option>
                <option value="26-35">26-35</option>
                <option value="36-45">36-45</option>
                <option value="46-55">46-55</option>
                <option value="56+">56+</option>
              </select>
            </div>
          </div>

          <button
            disabled={!demographics.seniorityRange}
            onClick={() => setStep('survey')}
            className={cn(
              'w-full py-3 mt-6 font-semibold rounded-xl transition',
              demographics.seniorityRange
                ? 'bg-gradient-to-r from-accent to-accent-light text-white hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            Ankete Başla →
          </button>
        </div>
      </div>
    );
  }

  // 4. MODÜL ARASI MOLA
  if (step === 'break') {
    const nextModule = modules[moduleIndex + 1];
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">☕</div>
          <h2 className="text-xl font-bold text-foreground mb-2">{currentModule.name} tamamlandı!</h2>
          <p className="text-muted-foreground mb-6">
            İsterseniz kısa bir mola verin. Sıradaki modül: <strong>{nextModule?.name}</strong>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
            <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground mb-6">İlerleme: %{progress}</p>
          <button
            onClick={() => {
              setModuleIndex((i) => i + 1);
              setQuestionIndex(0);
              setStep('survey');
            }}
            className="w-full py-3 bg-gradient-to-r from-accent to-accent-light text-white font-semibold rounded-xl hover:shadow-lg transition"
          >
            Devam Et →
          </button>
        </div>
      </div>
    );
  }

  // 5. TAMAMLAMA
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Teşekkürler!</h2>
          <p className="text-muted-foreground mb-6">
            Tüm yanıtlarınız kaydedildi. Raporunuz hazır olduğunda bilgilendirileceksiniz.
          </p>
          <button
            disabled={saving}
            onClick={handleSubmit}
            className="w-full py-3 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold rounded-xl hover:shadow-lg transition"
          >
            {saving ? 'Gönderiliyor...' : 'Yanıtları Gönder ✓'}
          </button>
        </div>
      </div>
    );
  }

  // 6. ANKET — Soru Akışı
  const question = currentModule?.questions[questionIndex];
  if (!question || !currentModule) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{currentModule.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {saving && <span className="text-amber-500">💾 Kaydediliyor...</span>}
              {lastSaved && !saving && (
                <span className="text-green-500">✓ {lastSaved.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              <span>%{progress}</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="pt-24 pb-12 px-4">
        {currentModule.format === 'ipsative' ? (
          <IpsativeWidget
            questionNumber={questionIndex + 1}
            questionTitle={question.title}
            options={question.options}
            perspective={question.perspective ?? 'current'}
            initialValues={answers[question.id]?.distribution}
            onComplete={(values) => {
              handleAnswer(question.id, { questionId: question.id, distribution: values });
              goNext();
            }}
          />
        ) : (
          <LikertWidget
            questionNumber={questionIndex + 1}
            questionText={question.text}
            dimension={question.dimension}
            scaleMin={currentModule.format === 'likert_7' ? 0 : 1}
            scaleMax={currentModule.format === 'likert_7' ? 6 : 5}
            initialValue={answers[question.id]?.value}
            onAnswer={(value) => {
              handleAnswer(question.id, { questionId: question.id, value });
              // Likert'te otomatik ilerleme (kısa gecikmeyle)
              setTimeout(goNext, 400);
            }}
          />
        )}

        {/* Navigation */}
        <div className="max-w-2xl mx-auto flex items-center justify-between mt-8">
          <button
            onClick={goPrev}
            disabled={moduleIndex === 0 && questionIndex === 0}
            className="text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-30"
          >
            ← Önceki
          </button>
          <span className="text-xs text-muted-foreground/70">
            {questionIndex + 1} / {currentModule.questions.length}
          </span>
        </div>
      </div>
    </div>
  );
}
