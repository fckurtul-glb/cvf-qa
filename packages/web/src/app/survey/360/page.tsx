'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Question {
  id: string;
  text: string;
  subdimension: string;
}

interface Subdimension {
  id: string;
  title: string;
  questionIds: string[];
}

interface MSAIData {
  name: string;
  instruction: string;
  scale: { min: number; max: number; labels: Record<string, string> };
  subdimensions: Subdimension[];
}

export default function Survey360Page() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('t');

  const [step, setStep] = useState<'loading' | 'consent' | 'survey' | 'done' | 'error'>('loading');
  const [error, setError] = useState('');
  const [msaiData, setMsaiData] = useState<MSAIData | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [responseId, setResponseId] = useState('');
  const [tokenHash, setTokenHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const QUESTIONS_PER_PAGE = 8;

  useEffect(() => {
    if (!tokenParam) {
      setError('Token gereklidir. Lütfen size gönderilen bağlantıyı kullanın.');
      setStep('error');
      return;
    }

    // Token doğrula
    fetch(`${API}/survey/start?t=${encodeURIComponent(tokenParam)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error?.message || 'Geçersiz veya süresi dolmuş token');
          setStep('error');
          return;
        }
        setTokenHash(json.data.tokenHash);
        setStep('consent');
      })
      .catch(() => { setError('Bağlantı hatası'); setStep('error'); });

    // MSAI soruları yükle
    fetch(`${API}/survey/msai/questions`, {
      headers: { Authorization: `Bearer ${tokenParam}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setMsaiData(json.data);
          // Tüm soruları düzleştir
          const questions: Question[] = [];
          for (const sub of json.data.subdimensions) {
            for (const qId of sub.questionIds) {
              questions.push({
                id: qId,
                text: qId, // Soru metni subdimension items'dan gelecek
                subdimension: sub.id,
              });
            }
          }
          setAllQuestions(questions);
        }
      })
      .catch(() => {});
  }, [tokenParam]);

  async function handleConsent() {
    try {
      const res = await fetch(`${API}/survey/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, consentGiven: true }),
      });
      const json = await res.json();
      if (json.success) {
        setResponseId(json.data.responseId);
        setStep('survey');
      } else {
        setError(json.error?.message || 'Onay kaydedilemedi');
      }
    } catch {
      setError('Bağlantı hatası');
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Yanıtları modül koduyla gönder
      const res = await fetch(`${API}/survey/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          moduleCode: 'M3_MSAI',
          answers,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStep('done');
      } else {
        setError(json.error?.message || 'Yanıtlar gönderilemedi');
        setSubmitting(false);
      }
    } catch {
      setError('Bağlantı hatası');
      setSubmitting(false);
    }
  }

  function setAnswer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  // Loading
  if (step === 'loading') {
    return <div style={styles.center}><p>Yükleniyor...</p></div>;
  }

  // Error
  if (step === 'error') {
    return (
      <div style={styles.center}>
        <div style={styles.errorBox}>
          <h2 style={{ margin: '0 0 12px 0', color: '#E74C3C' }}>Hata</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Consent
  if (step === 'consent') {
    return (
      <div style={styles.center}>
        <div style={styles.consentBox}>
          <h2 style={styles.consentTitle}>360° Yönetici Değerlendirmesi</h2>
          <p style={styles.consentText}>
            Bu anket, yöneticinizin liderlik yetkinliklerini değerlendirmeniz için hazırlanmıştır.
            Yanıtlarınız anonim olarak toplanacak ve yalnızca toplu sonuçlar paylaşılacaktır.
          </p>
          <p style={styles.consentText}>
            6103 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, verilerinizin bilimsel
            araştırma amacıyla anonim olarak işleneceğini kabul ediyorsunuz.
          </p>
          <div style={styles.consentActions}>
            <button onClick={handleConsent} style={styles.consentBtn}>
              Onaylıyorum ve Ankete Başla
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done
  if (step === 'done') {
    return (
      <div style={styles.center}>
        <div style={styles.doneBox}>
          <div style={styles.checkmark}>&#10003;</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#27AE60' }}>Teşekkürler!</h2>
          <p style={{ color: '#666' }}>Değerlendirmeniz başarıyla kaydedildi.</p>
        </div>
      </div>
    );
  }

  // Survey
  if (!msaiData) return <div style={styles.center}>Sorular yükleniyor...</div>;

  const totalPages = Math.ceil(allQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = allQuestions.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === allQuestions.length;

  return (
    <div style={styles.surveyWrapper}>
      <div style={styles.surveyHeader}>
        <h1 style={styles.surveyTitle}>{msaiData.name}</h1>
        <p style={styles.surveyInstruction}>{msaiData.instruction}</p>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(answeredCount / allQuestions.length) * 100}%` }} />
        </div>
        <p style={styles.progressText}>{answeredCount}/{allQuestions.length} soru yanıtlandı</p>
      </div>

      <div style={styles.questionsContainer}>
        {pageQuestions.map((q, idx) => {
          const globalIdx = currentPage * QUESTIONS_PER_PAGE + idx + 1;
          const sub = msaiData.subdimensions.find((s) => s.id === q.subdimension);
          return (
            <div key={q.id} style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <span style={styles.questionNum}>{globalIdx}</span>
                <span style={styles.questionSubdim}>{sub?.title}</span>
              </div>
              <p style={styles.questionText}>{q.id}</p>
              <div style={styles.scaleRow}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAnswer(q.id, val)}
                    style={{
                      ...styles.scaleBtn,
                      ...(answers[q.id] === val ? styles.scaleBtnActive : {}),
                    }}
                  >
                    {val}
                    <span style={styles.scaleLabel}>
                      {msaiData.scale.labels[String(val)] || ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.navRow}>
        <button
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 0}
          style={{ ...styles.navBtn, opacity: currentPage === 0 ? 0.4 : 1 }}
        >
          Önceki
        </button>
        <span style={{ fontSize: 14, color: '#888' }}>
          Sayfa {currentPage + 1}/{totalPages}
        </span>
        {currentPage < totalPages - 1 ? (
          <button onClick={() => setCurrentPage((p) => p + 1)} style={styles.navBtn}>
            Sonraki
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            style={{
              ...styles.submitBtn,
              opacity: !allAnswered || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f5f6f8', padding: 24,
  },
  errorBox: {
    background: '#fff', padding: 32, borderRadius: 12, border: '1px solid #e0e0e0',
    maxWidth: 480, textAlign: 'center',
  },
  consentBox: {
    background: '#fff', padding: 32, borderRadius: 12, border: '1px solid #e0e0e0',
    maxWidth: 560,
  },
  consentTitle: { fontSize: 22, fontWeight: 700, color: '#0F1D2F', margin: '0 0 16px 0' },
  consentText: { fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 12 },
  consentActions: { marginTop: 24, textAlign: 'center' as const },
  consentBtn: {
    padding: '12px 32px', fontSize: 15, fontWeight: 600, color: '#fff',
    background: '#2E86AB', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  doneBox: {
    background: '#fff', padding: 40, borderRadius: 12, border: '1px solid #e0e0e0',
    maxWidth: 400, textAlign: 'center' as const,
  },
  checkmark: {
    width: 60, height: 60, borderRadius: '50%', background: '#EAFAF1', color: '#27AE60',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 700, marginBottom: 16,
  },
  surveyWrapper: {
    maxWidth: 720, margin: '0 auto', padding: '24px 16px', minHeight: '100vh',
  },
  surveyHeader: { marginBottom: 24 },
  surveyTitle: { fontSize: 22, fontWeight: 700, color: '#0F1D2F', margin: '0 0 8px 0' },
  surveyInstruction: { fontSize: 14, color: '#666', lineHeight: 1.5, margin: '0 0 16px 0' },
  progressBar: {
    height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: '#2E86AB', borderRadius: 3, transition: 'width 0.3s',
  },
  progressText: { fontSize: 13, color: '#888', marginTop: 6 },
  questionsContainer: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  questionCard: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20,
  },
  questionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  questionNum: {
    width: 28, height: 28, borderRadius: '50%', background: '#E8F4FD', color: '#2E86AB',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  questionSubdim: { fontSize: 12, color: '#888', fontWeight: 500 },
  questionText: { fontSize: 15, color: '#0F1D2F', lineHeight: 1.5, margin: '0 0 12px 0' },
  scaleRow: { display: 'flex', gap: 8, justifyContent: 'center' },
  scaleBtn: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4,
    padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: 8,
    background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#333',
    minWidth: 60, transition: 'all 0.15s',
  },
  scaleBtnActive: {
    borderColor: '#2E86AB', background: '#E8F4FD', color: '#2E86AB',
  },
  scaleLabel: { fontSize: 10, color: '#888', fontWeight: 400 },
  navRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 24, padding: '16px 0',
  },
  navBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#2E86AB',
    background: '#E8F4FD', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#27AE60', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
};
