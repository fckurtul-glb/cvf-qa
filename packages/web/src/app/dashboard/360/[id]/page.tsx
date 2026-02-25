'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Rater {
  id: string;
  name: string;
  status: string;
}

interface PerspectiveData {
  count: number;
  completed: number;
  raters: Rater[];
}

interface Config360Detail {
  id: string;
  campaignName: string;
  manager: { id: string; name: string };
  status: string;
  createdAt: string;
  completedAt: string | null;
  perspectives: Record<string, PerspectiveData>;
}

interface ReportData {
  perspectives: Record<string, { subdimensions: { id: string; title: string; mean: number; count: number }[]; overallMean: number }>;
  blindSpots: { subdimension: string; title: string; selfScore: number; othersScore: number; gap: number }[];
  strengths: { id: string; title: string; mean: number }[];
  developmentAreas: { id: string; title: string; mean: number }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Bekliyor', color: '#E67E22', bg: '#FFF5EB' },
  IN_PROGRESS: { label: 'Devam Ediyor', color: '#2E86AB', bg: '#E8F4FD' },
  COMPLETED: { label: 'Tamamlandı', color: '#27AE60', bg: '#EAFAF1' },
};

const PERSPECTIVE_LABELS: Record<string, string> = {
  SELF: 'Öz Değerlendirme',
  SUBORDINATE: 'Ast',
  PEER: 'Eşdüzey',
  SUPERIOR: 'Üst',
};

export default function Assessment360DetailPage() {
  const router = useRouter();
  const params = useParams();
  const configId = params.id as string;

  const [detail, setDetail] = useState<Config360Detail | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportError, setReportError] = useState('');
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/360/${configId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDetail(json.data);
          // Rapor varsa yükle
          if (json.data.status === 'IN_PROGRESS' || json.data.status === 'COMPLETED') {
            loadReport(token);
          }
        } else {
          setError(json.error?.message || 'Yüklenemedi');
        }
        setLoading(false);
      })
      .catch(() => { setError('Bağlantı hatası'); setLoading(false); });
  }, [configId, router]);

  function loadReport(token: string) {
    fetch(`${API}/360/${configId}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setReport(json.data);
        else setReportError(json.error?.message || '');
      })
      .catch(() => setReportError('Rapor yüklenemedi'));
  }

  async function handleLaunch() {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLaunching(true);
    try {
      const res = await fetch(`${API}/360/${configId}/launch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (json.success) {
        window.location.reload();
      } else {
        setError(json.error?.message || 'Başlatılamadı');
        setLaunching(false);
      }
    } catch {
      setError('Bağlantı hatası');
      setLaunching(false);
    }
  }

  if (loading) return <div style={styles.loading}>Yükleniyor...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!detail) return null;

  const status = STATUS_LABELS[detail.status] || STATUS_LABELS.PENDING;
  const totalRaters = Object.values(detail.perspectives).reduce((s, p) => s + p.count, 0);
  const totalCompleted = Object.values(detail.perspectives).reduce((s, p) => s + p.completed, 0);

  return (
    <div style={styles.wrapper}>
      {/* Başlık */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>{detail.manager.name} — 360° Değerlendirme</h1>
          <p style={styles.subtitle}>Kampanya: {detail.campaignName}</p>
        </div>
        <span style={{ ...styles.badge, color: status.color, background: status.bg, fontSize: 14, padding: '6px 16px' }}>
          {status.label}
        </span>
      </div>

      {/* Özet Kartları */}
      <div style={styles.cardGrid}>
        <div style={styles.card}>
          <div style={styles.cardValue}>{totalRaters}</div>
          <div style={styles.cardLabel}>Toplam Değerlendirici</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>{totalCompleted}</div>
          <div style={styles.cardLabel}>Tamamlanan</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardValue}>
            {totalRaters > 0 ? Math.round((totalCompleted / totalRaters) * 100) : 0}%
          </div>
          <div style={styles.cardLabel}>Tamamlanma Oranı</div>
        </div>
      </div>

      {/* Başlat Butonu */}
      {detail.status === 'PENDING' && totalRaters > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button onClick={handleLaunch} disabled={launching} style={styles.launchBtn}>
            {launching ? 'Başlatılıyor...' : 'Değerlendirmeyi Başlat'}
          </button>
          <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            Başlatıldığında her değerlendirici için benzersiz anket tokeni üretilecektir.
          </p>
        </div>
      )}

      {/* Perspektif Bazlı Durum */}
      <h2 style={styles.sectionTitle}>Perspektif Bazlı Durum</h2>
      <div style={styles.perspectiveGrid}>
        {Object.entries(detail.perspectives).map(([key, data]) => (
          <div key={key} style={styles.perspectiveCard}>
            <div style={styles.perspectiveHeader}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{PERSPECTIVE_LABELS[key] || key}</span>
              <span style={{ fontSize: 13, color: '#888' }}>{data.completed}/{data.count}</span>
            </div>
            {data.raters.length > 0 ? (
              <div style={styles.raterList}>
                {data.raters.map((r) => (
                  <div key={r.id} style={styles.raterItem}>
                    <span>{r.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                      color: r.status === 'COMPLETED' ? '#27AE60' : '#E67E22',
                      background: r.status === 'COMPLETED' ? '#EAFAF1' : '#FFF5EB',
                    }}>
                      {r.status === 'COMPLETED' ? 'Tamamlandı' : 'Bekliyor'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#aaa', margin: '8px 0 0' }}>Atanmamış</p>
            )}
          </div>
        ))}
      </div>

      {/* Rapor Bölümü */}
      {report && (
        <>
          <h2 style={styles.sectionTitle}>Sonuçlar</h2>

          {/* Perspektif Skorları */}
          <div style={styles.reportSection}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Perspektif Bazlı Ortalamalar</h3>
            <div style={styles.scoreGrid}>
              {Object.entries(report.perspectives).map(([key, data]) => (
                <div key={key} style={styles.scoreCard}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{PERSPECTIVE_LABELS[key] || key}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F1D2F' }}>{data.overallMean}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{data.subdimensions.length} boyut</div>
                </div>
              ))}
            </div>
          </div>

          {/* Güçlü Yönler */}
          {report.strengths.length > 0 && (
            <div style={styles.reportSection}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#27AE60' }}>Güçlü Yönler</h3>
              {report.strengths.map((s, i) => (
                <div key={s.id} style={styles.strengthItem}>
                  <span style={{ fontWeight: 600 }}>{i + 1}.</span>
                  <span style={{ flex: 1 }}>{s.title}</span>
                  <span style={{ fontWeight: 700, color: '#27AE60' }}>{s.mean}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gelişim Alanları */}
          {report.developmentAreas.length > 0 && (
            <div style={styles.reportSection}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#E67E22' }}>Gelişim Alanları</h3>
              {report.developmentAreas.map((s, i) => (
                <div key={s.id} style={styles.strengthItem}>
                  <span style={{ fontWeight: 600 }}>{i + 1}.</span>
                  <span style={{ flex: 1 }}>{s.title}</span>
                  <span style={{ fontWeight: 700, color: '#E67E22' }}>{s.mean}</span>
                </div>
              ))}
            </div>
          )}

          {/* Kör Noktalar */}
          {report.blindSpots.length > 0 && (
            <div style={styles.reportSection}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#E74C3C' }}>Kör Noktalar (Öz vs Diğerleri)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={styles.reportTh}>Boyut</th>
                    <th style={{ ...styles.reportTh, textAlign: 'center' }}>Öz</th>
                    <th style={{ ...styles.reportTh, textAlign: 'center' }}>Diğerleri</th>
                    <th style={{ ...styles.reportTh, textAlign: 'center' }}>Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {report.blindSpots.map((bs) => (
                    <tr key={bs.subdimension}>
                      <td style={styles.reportTd}>{bs.title}</td>
                      <td style={{ ...styles.reportTd, textAlign: 'center' }}>{bs.selfScore}</td>
                      <td style={{ ...styles.reportTd, textAlign: 'center' }}>{bs.othersScore}</td>
                      <td style={{
                        ...styles.reportTd,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: bs.gap > 0 ? '#E74C3C' : '#27AE60',
                      }}>
                        {bs.gap > 0 ? '+' : ''}{bs.gap}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {reportError && (
        <div style={{ padding: '12px 16px', background: '#FFF5EB', color: '#E67E22', borderRadius: 8, marginTop: 16, fontSize: 14 }}>
          {reportError}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  error: { padding: '12px 16px', background: '#FDEDEC', color: '#E74C3C', borderRadius: 8, margin: 24 },
  wrapper: { padding: '24px 0' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#0F1D2F', margin: 0 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  badge: { display: 'inline-block', borderRadius: 12, fontWeight: 600 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  card: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, textAlign: 'center',
  },
  cardValue: { fontSize: 32, fontWeight: 700, color: '#0F1D2F' },
  cardLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  launchBtn: {
    padding: '12px 32px', fontSize: 15, fontWeight: 600, color: '#fff',
    background: '#27AE60', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#0F1D2F', margin: '0 0 16px 0' },
  perspectiveGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 },
  perspectiveCard: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 16,
  },
  perspectiveHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  raterList: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  raterItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 8px', background: '#f8f9fa', borderRadius: 6, fontSize: 13,
  },
  reportSection: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, marginBottom: 16,
  },
  scoreGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  scoreCard: { textAlign: 'center', padding: 12, background: '#f8f9fa', borderRadius: 8 },
  strengthItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
    borderBottom: '1px solid #f0f0f0', fontSize: 14,
  },
  reportTh: {
    textAlign: 'left' as const, padding: '8px 12px', fontSize: 12, fontWeight: 600,
    color: '#888', borderBottom: '2px solid #e0e0e0', background: '#fafafa',
  },
  reportTd: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0' },
};
