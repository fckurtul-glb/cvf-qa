'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MODULE_ROUTES: Record<string, string> = {
  M1_OCAI: '/survey/ocai',
  M2_QCI: '/survey/qci',
  M4_UWES: '/survey/uwes',
  M5_PKE: '/survey/pke',
  M6_SPU: '/survey/spu',
};

const MODULE_NAMES: Record<string, string> = {
  M1_OCAI: 'OCAI — Kültür Değerlendirme',
  M2_QCI: 'QCI — Kalite Kültürü',
  M4_UWES: 'UWES — İşe Bağlılık',
  M5_PKE: 'PKE — Paydaş Katılım',
  M6_SPU: 'SPU — Stratejik Plan Uyumu',
};

type Step = 'loading' | 'error' | 'consent' | 'demographic' | 'ready';

interface TokenData {
  tokenHash: string;
  campaignId: string;
  campaignName: string;
  modules: string[];
  existingResponseId: string | null;
}

export default function SurveyStartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('t');

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [seniorityRange, setSeniorityRange] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Token doğrulama
  useEffect(() => {
    if (!rawToken) {
      setError('Geçersiz bağlantı: Token bulunamadı');
      setStep('error');
      return;
    }

    fetch(`${API}/survey/start?t=${encodeURIComponent(rawToken)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error?.message || 'Token doğrulanamadı');
          setStep('error');
          return;
        }
        setTokenData(json.data);

        // Mevcut yanıt varsa direkt devam
        if (json.data.existingResponseId) {
          setStep('ready');
        } else {
          setStep('consent');
        }
      })
      .catch(() => {
        setError('Bağlantı hatası');
        setStep('error');
      });
  }, [rawToken]);

  async function handleConsent() {
    if (!consentChecked) {
      setError('KVKK aydınlatma metnini onaylamanız gereklidir.');
      return;
    }
    setError(null);
    setStep('demographic');
  }

  async function handleDemographic() {
    if (!tokenData) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/survey/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenHash: tokenData.tokenHash,
          consentGiven: true,
          demographic: {
            seniorityRange: seniorityRange || undefined,
            ageRange: ageRange || undefined,
          },
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Onay kaydedilemedi');
        setSubmitting(false);
        return;
      }

      // responseId'yi localStorage'a kaydet (auto-save için)
      localStorage.setItem('cvf_responseId', json.data.responseId);
      localStorage.setItem('cvf_modules', JSON.stringify(json.data.modules));
      setStep('ready');
    } catch {
      setError('Bağlantı hatası');
    }
    setSubmitting(false);
  }

  function startSurvey() {
    if (!tokenData) return;
    const firstModule = tokenData.modules[0];
    const route = MODULE_ROUTES[firstModule];
    if (route) {
      router.push(route);
    }
  }

  // ── RENDER ──

  if (step === 'loading') {
    return <div style={styles.center}>Token doğrulanıyor...</div>;
  }

  if (step === 'error') {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <h2 style={{ margin: '0 0 12px', color: '#c62828' }}>Hata</h2>
          <p style={{ color: '#666', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (step === 'consent') {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <h1 style={styles.title}>{tokenData?.campaignName}</h1>
          <p style={styles.subtitle}>Anket başlamadan önce aşağıdaki bilgileri okuyun.</p>

          <div style={styles.consentBox}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>KVKK Aydınlatma Metni</h3>
            <div style={styles.consentText}>
              <p>Bu anket kapsamında toplanan veriler tamamen <strong>anonim</strong> olarak işlenecektir.</p>
              <p>Yanıtlarınız hiçbir şekilde kimliğinizle ilişkilendirilmeyecektir. Veriler yalnızca kurumsal düzeyde istatistiksel analiz amacıyla kullanılacaktır.</p>
              <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, yanıtlarınız şifreli olarak saklanmaktadır. Birim bazlı raporlar minimum 5 kişi kuralına tabidir.</p>
              <p>Anketi istediğiniz zaman bırakabilirsiniz. Kaldığınız yerden devam edebilirsiniz.</p>
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                style={{ marginRight: 10, width: 18, height: 18 }}
              />
              Aydınlatma metnini okudum ve onaylıyorum.
            </label>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            onClick={handleConsent}
            disabled={!consentChecked}
            style={{ ...styles.primaryBtn, opacity: consentChecked ? 1 : 0.5 }}
          >
            Devam Et
          </button>
        </div>
      </div>
    );
  }

  if (step === 'demographic') {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <h1 style={styles.title}>Demografik Bilgiler</h1>
          <p style={styles.subtitle}>Bu bilgiler anonim analiz amacıyla kullanılır. İsim bilgisi istenmez.</p>

          <div style={styles.field}>
            <label style={styles.label}>Kıdem Yılı Aralığı</label>
            <select value={seniorityRange} onChange={(e) => setSeniorityRange(e.target.value)} style={styles.select}>
              <option value="">Seçiniz (isteğe bağlı)</option>
              <option value="0-2">0-2 yıl</option>
              <option value="3-5">3-5 yıl</option>
              <option value="6-10">6-10 yıl</option>
              <option value="11-20">11-20 yıl</option>
              <option value="20+">20+ yıl</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Yaş Aralığı</label>
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} style={styles.select}>
              <option value="">Seçiniz (isteğe bağlı)</option>
              <option value="18-25">18-25</option>
              <option value="26-35">26-35</option>
              <option value="36-45">36-45</option>
              <option value="46-55">46-55</option>
              <option value="56+">56+</option>
            </select>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            onClick={handleDemographic}
            disabled={submitting}
            style={{ ...styles.primaryBtn, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Kaydediliyor...' : 'Ankete Başla'}
          </button>
        </div>
      </div>
    );
  }

  // step === 'ready'
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>{tokenData?.campaignName}</h1>
        <p style={styles.subtitle}>
          {tokenData?.existingResponseId ? 'Kaldığınız yerden devam edebilirsiniz.' : 'Anketiniz hazır.'}
        </p>

        <div style={styles.moduleList}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#0F1D2F' }}>Doldurulacak Modüller</h3>
          {tokenData?.modules.map((m, i) => (
            <div key={m} style={styles.moduleItem}>
              <span style={styles.moduleNumber}>{i + 1}</span>
              <span style={{ fontWeight: 500 }}>{MODULE_NAMES[m] || m}</span>
            </div>
          ))}
        </div>

        <button onClick={startSurvey} style={styles.primaryBtn}>
          {tokenData?.existingResponseId ? 'Devam Et' : 'Başla'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', padding: 24 },
  wrapper: { minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '48px 16px', background: '#FBF9F4' },
  container: { width: '100%', maxWidth: 600 },
  title: { fontSize: 24, fontWeight: 700, color: '#0F1D2F', margin: '0 0 8px', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', margin: '0 0 28px', textAlign: 'center' },
  consentBox: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '24px', marginBottom: 20 },
  consentText: { fontSize: 14, color: '#444', lineHeight: 1.7, maxHeight: 200, overflowY: 'auto', marginBottom: 16, paddingRight: 8 },
  checkboxLabel: { display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 600, color: '#0F1D2F', cursor: 'pointer' },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#0F1D2F', marginBottom: 8 },
  select: { width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #d0d0d0', borderRadius: 8, background: '#fff', color: '#0F1D2F' },
  moduleList: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '20px 24px', marginBottom: 24 },
  moduleItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14, color: '#0F1D2F' },
  moduleNumber: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: '50%', background: '#2E86AB', color: '#fff',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#991b1b', fontSize: 14, marginBottom: 16 },
  errorCard: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '32px', textAlign: 'center', maxWidth: 400 },
  primaryBtn: {
    display: 'block', width: '100%', padding: '14px', fontSize: 16, fontWeight: 600,
    color: '#fff', background: '#2E86AB', border: 'none', borderRadius: 10, cursor: 'pointer',
  },
};
