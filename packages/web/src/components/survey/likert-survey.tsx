'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Tipler ──
export interface LikertQuestion {
  id: string;
  text: string;
  subdimension: string;
  subdimensionTitle: string;
}

export interface LikertSurveyProps {
  title: string;
  subtitle: string;
  questions: LikertQuestion[];
  scaleType: 'likert5' | 'likert7';
  moduleCode: string;
  accentColor?: string;
  onSubmit: (answers: Record<string, number>) => Promise<void>;
}

// ── Ölçek tanımları ──
const SCALE_5 = [
  { value: 1, label: 'Kesinlikle Katılmıyorum' },
  { value: 2, label: 'Katılmıyorum' },
  { value: 3, label: 'Kararsızım' },
  { value: 4, label: 'Katılıyorum' },
  { value: 5, label: 'Kesinlikle Katılıyorum' },
];

const SCALE_7 = [
  { value: 0, label: 'Hiçbir zaman' },
  { value: 1, label: 'Neredeyse hiç' },
  { value: 2, label: 'Nadiren' },
  { value: 3, label: 'Bazen' },
  { value: 4, label: 'Sıklıkla' },
  { value: 5, label: 'Çok sık' },
  { value: 6, label: 'Her zaman' },
];

const QUESTIONS_PER_PAGE = 5;

export function LikertSurvey({
  title,
  subtitle,
  questions,
  scaleType,
  accentColor = '#2E86AB',
  onSubmit,
}: LikertSurveyProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleOptions = scaleType === 'likert5' ? SCALE_5 : SCALE_7;
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE,
  );
  const isLastPage = currentPage === totalPages - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  // Sayfadaki tüm sorular cevaplanmış mı?
  const allPageAnswered = pageQuestions.every((q) => answers[q.id] !== undefined);

  const handleAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  }, []);

  function handleNext() {
    if (!allPageAnswered) {
      setError('Bu sayfadaki tüm soruları cevaplayın.');
      return;
    }
    setError(null);
    setCurrentPage((p) => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePrev() {
    setError(null);
    setCurrentPage((p) => p - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`${unanswered.length} soru cevaplanmamış. Lütfen tüm soruları cevaplayın.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(answers);
    } catch (err: any) {
      setError(err.message || 'Gönderim başarısız. Lütfen tekrar deneyin.');
      setSubmitting(false);
    }
  }

  // Grup başlığı: Aynı subdimension'daki ilk soruda göster
  function shouldShowGroupHeader(index: number): boolean {
    const q = pageQuestions[index];
    if (index === 0) return true;
    return pageQuestions[index - 1].subdimension !== q.subdimension;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
              }}
            />
          </div>
          <div style={styles.progressLabel}>
            {answeredCount} / {questions.length} cevaplandı
          </div>
        </div>

        {/* Page indicator */}
        <div style={styles.pageIndicator}>
          Sayfa {currentPage + 1} / {totalPages}
        </div>

        {/* Scale Legend */}
        <div style={styles.scaleLegend}>
          {scaleOptions.map((opt) => (
            <div key={opt.value} style={styles.scaleLegendItem}>
              <span style={{ ...styles.scaleLegendDot, background: accentColor }}>{opt.value}</span>
              <span style={styles.scaleLegendLabel}>{opt.label}</span>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div style={styles.questionsContainer}>
          {pageQuestions.map((q, idx) => {
            const globalIndex = currentPage * QUESTIONS_PER_PAGE + idx;
            const isSelected = answers[q.id] !== undefined;
            const showHeader = shouldShowGroupHeader(idx);

            return (
              <div key={q.id}>
                {/* Subdimension header */}
                {showHeader && (
                  <div style={{ ...styles.groupHeader, borderLeftColor: accentColor }}>
                    {q.subdimensionTitle}
                  </div>
                )}

                <div
                  style={{
                    ...styles.questionCard,
                    borderColor: isSelected ? `${accentColor}40` : '#e0e0e0',
                  }}
                >
                  {/* Question text */}
                  <div style={styles.questionRow}>
                    <span
                      style={{
                        ...styles.qNumber,
                        background: isSelected ? accentColor : '#e0e0e0',
                        color: isSelected ? '#fff' : '#666',
                      }}
                    >
                      {globalIndex + 1}
                    </span>
                    <p style={styles.qText}>{q.text}</p>
                  </div>

                  {/* Desktop: horizontal radio buttons */}
                  <div data-likert-desktop="" style={styles.radioRowDesktop}>
                    {scaleOptions.map((opt) => {
                      const isActive = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswer(q.id, opt.value)}
                          style={{
                            ...styles.radioBtn,
                            borderColor: isActive ? accentColor : '#ddd',
                            background: isActive ? `${accentColor}15` : '#fff',
                          }}
                        >
                          <span
                            style={{
                              ...styles.radioCircle,
                              borderColor: isActive ? accentColor : '#ccc',
                              background: isActive ? accentColor : '#fff',
                            }}
                          >
                            {isActive && <span style={styles.radioDot} />}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F1D2F' }}>
                            {opt.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile: vertical radio buttons */}
                  <div data-likert-mobile="" style={styles.radioRowMobile}>
                    {scaleOptions.map((opt) => {
                      const isActive = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswer(q.id, opt.value)}
                          style={{
                            ...styles.radioBtnMobile,
                            borderColor: isActive ? accentColor : '#e0e0e0',
                            background: isActive ? `${accentColor}15` : '#fff',
                          }}
                        >
                          <span
                            style={{
                              ...styles.radioCircle,
                              borderColor: isActive ? accentColor : '#ccc',
                              background: isActive ? accentColor : '#fff',
                            }}
                          >
                            {isActive && <span style={styles.radioDot} />}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F1D2F', minWidth: 16 }}>
                            {opt.value}
                          </span>
                          <span style={{ fontSize: 13, color: '#666' }}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Navigation */}
        <div style={styles.navBar}>
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            style={{ ...styles.navBtn, opacity: currentPage === 0 ? 0.4 : 1 }}
          >
            Geri
          </button>

          {isLastPage ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !allPageAnswered}
              style={{
                ...styles.submitBtn,
                opacity: submitting || !allPageAnswered ? 0.6 : 1,
              }}
            >
              {submitting ? 'Gönderiliyor...' : 'Anketi Gönder'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!allPageAnswered}
              style={{
                ...styles.nextBtn,
                background: accentColor,
                opacity: allPageAnswered ? 1 : 0.5,
              }}
            >
              İleri
            </button>
          )}
        </div>

        {/* Page dots */}
        <div style={styles.dots}>
          {Array.from({ length: totalPages }, (_, i) => {
            const pageStart = i * QUESTIONS_PER_PAGE;
            const pageEnd = Math.min((i + 1) * QUESTIONS_PER_PAGE, questions.length);
            const pageQs = questions.slice(pageStart, pageEnd);
            const allAnswered = pageQs.every((q) => answers[q.id] !== undefined);

            return (
              <button
                key={i}
                onClick={() => { setCurrentPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{
                  ...styles.dot,
                  background: i === currentPage ? accentColor : allAnswered ? '#4caf50' : '#ddd',
                  border: i === currentPage ? `2px solid ${accentColor}` : '2px solid transparent',
                }}
                title={`Sayfa ${i + 1}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stiller ──

const styles: Record<string, React.CSSProperties> = {
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
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    margin: 0,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#666',
    minWidth: 110,
    textAlign: 'right' as const,
  },
  pageIndicator: {
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  // Scale legend
  scaleLegend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
    padding: '10px 16px',
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #e8e8e8',
  },
  scaleLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  scaleLegendDot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
  },
  scaleLegendLabel: {
    fontSize: 11,
    color: '#666',
  },
  // Questions
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    marginBottom: 20,
  },
  groupHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0F1D2F',
    padding: '8px 14px',
    marginTop: 8,
    marginBottom: 4,
    borderLeft: '4px solid',
    background: '#f8f8f8',
    borderRadius: '0 6px 6px 0',
  },
  questionCard: {
    background: '#fff',
    border: '1px solid',
    borderRadius: 10,
    padding: '16px 20px',
  },
  questionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  qNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  qText: {
    fontSize: 15,
    fontWeight: 500,
    color: '#0F1D2F',
    margin: 0,
    lineHeight: 1.5,
  },
  // Desktop radio row
  radioRowDesktop: {
    display: 'flex',
    gap: 6,
    marginLeft: 40,
  },
  radioBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '8px 4px',
    borderRadius: 8,
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  // Mobile radio row
  radioRowMobile: {
    display: 'none',
  },
  radioBtnMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as const,
    background: '#fff',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '2px solid',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#fff',
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

// CSS media query for mobile — inject once
if (typeof document !== 'undefined') {
  const styleId = 'likert-survey-responsive';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media (max-width: 768px) {
        [data-likert-desktop] { display: none !important; }
        [data-likert-mobile] { display: flex !important; flex-direction: column; gap: 6px; margin-left: 0; }
      }
      @media (min-width: 769px) {
        [data-likert-mobile] { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }
}
