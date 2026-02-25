'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import questionBank from '../../../data/question-bank.json';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const OCAI = questionBank.modules.M1_OCAI;
const DIMENSIONS = OCAI.dimensions;
const PERSPECTIVES: ['mevcut', 'tercih_edilen'] = ['mevcut', 'tercih_edilen'];
const ALTERNATIVES = ['A', 'B', 'C', 'D'] as const;
const CULTURE_TYPES = OCAI.cultureTypes as Record<string, string>;

const PERSPECTIVE_LABELS: Record<string, string> = {
  mevcut: 'Mevcut Durum',
  tercih_edilen: 'Tercih Edilen Durum',
};

const TOTAL_STEPS = DIMENSIONS.length * PERSPECTIVES.length; // 12

type Answers = Record<string, Record<string, Record<string, number>>>;

export default function OCAISurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const dim of DIMENSIONS) {
      init[dim.id] = {};
      for (const p of PERSPECTIVES) {
        init[dim.id][p] = { A: 0, B: 0, C: 0, D: 0 };
      }
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // Mevcut adımın boyut ve perspektifini hesapla
  const dimIndex = Math.floor(step / PERSPECTIVES.length);
  const perspIndex = step % PERSPECTIVES.length;
  const currentDim = DIMENSIONS[dimIndex];
  const currentPersp = PERSPECTIVES[perspIndex];
  const currentValues = answers[currentDim.id][currentPersp];
  const currentTotal = Object.values(currentValues).reduce((sum, v) => sum + v, 0);
  const remaining = 100 - currentTotal;
  const isCurrentValid = currentTotal === 100;

  function handleValueChange(alt: string, value: number) {
    const clamped = Math.max(0, Math.min(100, Math.floor(value)));
    setAnswers((prev) => ({
      ...prev,
      [currentDim.id]: {
        ...prev[currentDim.id],
        [currentPersp]: {
          ...prev[currentDim.id][currentPersp],
          [alt]: clamped,
        },
      },
    }));
    setError(null);
  }

  function handleNext() {
    if (!isCurrentValid) {
      setError(`Toplam puan 100 olmalıdır. Şu an: ${currentTotal}`);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function handlePrev() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    if (!isCurrentValid) {
      setError(`Toplam puan 100 olmalıdır. Şu an: ${currentTotal}`);
      return;
    }

    // Tüm adımları kontrol et
    for (const dim of DIMENSIONS) {
      for (const p of PERSPECTIVES) {
        const vals = answers[dim.id][p];
        const total = Object.values(vals).reduce((s, v) => s + v, 0);
        if (total !== 100) {
          setError(`${dim.title} — ${PERSPECTIVE_LABELS[p]}: Toplam ${total}, 100 olmalı`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/survey/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Gönderim başarısız');
        setSubmitting(false);
        return;
      }

      router.push(`/survey/result/${data.data.responseId}`);
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return <div style={styles.loading}>Yükleniyor...</div>;
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{OCAI.name}</h1>
          <p style={styles.instruction}>{OCAI.instruction}</p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.progressLabel}>
            {step + 1} / {TOTAL_STEPS}
          </div>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicator}>
          <span style={styles.dimensionBadge}>{currentDim.title}</span>
          <span style={styles.perspectiveBadge}>
            {PERSPECTIVE_LABELS[currentPersp]}
          </span>
        </div>

        {/* Question Stem */}
        <div style={styles.questionBox}>
          <h2 style={styles.stem}>{currentDim.stem}</h2>
          <p style={styles.stemHint}>
            Aşağıdaki 4 seçeneğe toplam <strong>100 puan</strong> dağıtın.
            {currentPersp === 'mevcut'
              ? ' Üniversitenizin şu anki durumunu düşünün.'
              : ' Üniversitenizin 5 yıl sonra olmasını istediğiniz durumu düşünün.'}
          </p>
        </div>

        {/* Alternatives */}
        <div style={styles.alternatives}>
          {ALTERNATIVES.map((alt) => {
            const altText = (currentDim.alternatives as Record<string, string>)[alt];
            const value = currentValues[alt];

            return (
              <div key={alt} style={styles.altCard}>
                <div style={styles.altHeader}>
                  <span style={styles.altLabel}>
                    {alt} — {CULTURE_TYPES[alt]}
                  </span>
                  <div style={styles.inputGroup}>
                    <button
                      style={styles.stepBtn}
                      onClick={() => handleValueChange(alt, value - 5)}
                      disabled={value <= 0}
                    >
                      -5
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) => handleValueChange(alt, parseInt(e.target.value) || 0)}
                      style={styles.pointInput}
                    />
                    <button
                      style={styles.stepBtn}
                      onClick={() => handleValueChange(alt, value + 5)}
                      disabled={value >= 100}
                    >
                      +5
                    </button>
                  </div>
                </div>
                <p style={styles.altText}>{altText}</p>
                {/* Visual bar */}
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${value}%`,
                      background: value > 0 ? barColors[alt] : '#e0e0e0',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Indicator */}
        <div
          style={{
            ...styles.totalBox,
            borderColor: isCurrentValid ? '#4caf50' : remaining < 0 ? '#f44336' : '#ff9800',
            background: isCurrentValid ? '#f0fdf4' : remaining < 0 ? '#fef2f2' : '#fffbeb',
          }}
        >
          <span style={styles.totalLabel}>Toplam:</span>
          <span
            style={{
              ...styles.totalValue,
              color: isCurrentValid ? '#2e7d32' : remaining < 0 ? '#c62828' : '#e65100',
            }}
          >
            {currentTotal} / 100
          </span>
          {!isCurrentValid && (
            <span style={styles.totalHint}>
              {remaining > 0 ? `${remaining} puan daha dağıtın` : `${Math.abs(remaining)} puan fazla`}
            </span>
          )}
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Navigation */}
        <div style={styles.navBar}>
          <button
            onClick={handlePrev}
            disabled={step === 0}
            style={{
              ...styles.navBtn,
              opacity: step === 0 ? 0.4 : 1,
            }}
          >
            Geri
          </button>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !isCurrentValid}
              style={{
                ...styles.submitBtn,
                opacity: submitting || !isCurrentValid ? 0.6 : 1,
              }}
            >
              {submitting ? 'Gönderiliyor...' : 'Anketi Gönder'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!isCurrentValid}
              style={{
                ...styles.nextBtn,
                opacity: isCurrentValid ? 1 : 0.5,
              }}
            >
              İleri
            </button>
          )}
        </div>

        {/* Step dots */}
        <div style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const dI = Math.floor(i / PERSPECTIVES.length);
            const pI = i % PERSPECTIVES.length;
            const vals = answers[DIMENSIONS[dI].id][PERSPECTIVES[pI]];
            const total = Object.values(vals).reduce((s, v) => s + v, 0);
            const filled = total === 100;

            return (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  ...styles.dot,
                  background: i === step ? '#2E86AB' : filled ? '#4caf50' : '#ddd',
                  border: i === step ? '2px solid #1a6d8a' : '2px solid transparent',
                }}
                title={`${DIMENSIONS[dI].title} — ${PERSPECTIVE_LABELS[PERSPECTIVES[pI]]}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const barColors: Record<string, string> = {
  A: '#4CAF50', // Klan — yeşil
  B: '#FF9800', // Adhokrasi — turuncu
  C: '#F44336', // Pazar — kırmızı
  D: '#2196F3', // Hiyerarşi — mavi
};

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
  },
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 16px',
    background: '#FBF9F4',
  },
  container: {
    width: '100%',
    maxWidth: 760,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0F1D2F',
    margin: '0 0 8px',
  },
  instruction: {
    fontSize: 13,
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
  // Progress
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    background: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2E86AB, #3A9BC5)',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#666',
    minWidth: 50,
    textAlign: 'right' as const,
  },
  // Step indicator
  stepIndicator: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  dimensionBadge: {
    padding: '4px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#0F1D2F',
    color: '#fff',
    borderRadius: 16,
  },
  perspectiveBadge: {
    padding: '4px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#e8f4fd',
    color: '#2E86AB',
    borderRadius: 16,
  },
  // Question
  questionBox: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 16,
  },
  stem: {
    fontSize: 17,
    fontWeight: 600,
    color: '#0F1D2F',
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  stemHint: {
    fontSize: 13,
    color: '#888',
    margin: 0,
  },
  // Alternatives
  alternatives: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    marginBottom: 16,
  },
  altCard: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 10,
    padding: '16px 20px',
  },
  altHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  altLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0F1D2F',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 36,
    height: 32,
    border: '1px solid #d0d0d0',
    borderRadius: 6,
    background: '#fafafa',
    fontSize: 12,
    fontWeight: 600,
    color: '#555',
    cursor: 'pointer',
  },
  pointInput: {
    width: 56,
    height: 32,
    textAlign: 'center' as const,
    fontSize: 16,
    fontWeight: 700,
    border: '2px solid #d0d0d0',
    borderRadius: 6,
    outline: 'none',
    color: '#0F1D2F',
  },
  altText: {
    fontSize: 14,
    color: '#444',
    margin: '0 0 10px',
    lineHeight: 1.5,
  },
  barTrack: {
    height: 6,
    background: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.2s ease',
  },
  // Total
  totalBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    borderRadius: 10,
    border: '2px solid',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#555',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 800,
  },
  totalHint: {
    fontSize: 13,
    color: '#888',
    marginLeft: 'auto',
  },
  // Error
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#991b1b',
    fontSize: 14,
    marginBottom: 16,
  },
  // Navigation
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navBtn: {
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 500,
    color: '#555',
    background: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  nextBtn: {
    padding: '10px 32px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#2E86AB',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 32px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#2e7d32',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  // Dots
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s',
  },
};
