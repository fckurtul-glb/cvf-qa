'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

const API = 'http://localhost:3001';

// ── OCAI Types ──
interface CultureScore {
  mevcut: number;
  tercih_edilen: number;
}

interface OCAIResultData {
  responseId: string;
  completedAt: string;
  cultureTypes: Record<string, string>;
  scores: Record<string, CultureScore>;
  dominant: {
    mevcut: { type: string; name: string };
    tercih_edilen: { type: string; name: string };
  };
  dimensions: Record<string, Record<string, Record<string, number>>>;
  dimensionLabels: { id: string; title: string }[];
}

// ── Likert Types ──
interface SubdimensionScore {
  id: string;
  title: string;
  mean: number;
  std: number;
  count: number;
  min: number;
  max: number;
}

interface LikertResultData {
  responseId: string;
  moduleCode: string;
  completedAt: string;
  overallMean: number;
  totalAnswers: number;
  subdimensions: SubdimensionScore[];
}

const CULTURE_DESCRIPTIONS: Record<string, string> = {
  A: 'Klan kültürü, aile benzeri bir ortam oluşturur. Mentorluk, takım çalışması ve çalışan gelişimi ön plandadır.',
  B: 'Adhokrasi kültürü, yenilikçilik ve girişimciliği teşvik eder. Risk alma, yaratıcılık ve öncü olma değer görür.',
  C: 'Pazar kültürü, sonuç odaklı ve rekabetçidir. Performans hedefleri ve başarı metrikleri ön plandadır.',
  D: 'Hiyerarşi kültürü, yapılandırılmış ve kontrollü bir ortam sunar. Prosedürler ve verimlilik temel değerlerdir.',
};

const CULTURE_COLORS: Record<string, string> = {
  A: '#4CAF50',
  B: '#FF9800',
  C: '#F44336',
  D: '#2196F3',
};

const MODULE_NAMES: Record<string, string> = {
  M2_QCI: 'QCI-TR Kalite Kültürü Envanteri',
  M4_UWES: 'UWES-TR İşe Bağlılık Ölçeği',
  M5_PKE: 'PKE Paydaş Katılım Endeksi',
  M6_SPU: 'SPU Stratejik Plan Uyumu',
};

const MODULE_COLORS: Record<string, string> = {
  M2_QCI: '#2E86AB',
  M4_UWES: '#7B2D8E',
  M5_PKE: '#E67E22',
  M6_SPU: '#27AE60',
};

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get('module');
  const [ocaiData, setOcaiData] = useState<OCAIResultData | null>(null);
  const [likertData, setLikertData] = useState<LikertResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLikert = !!moduleParam;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const url = moduleParam
      ? `${API}/survey/result/${params.id}?module=${moduleParam}`
      : `${API}/survey/result/${params.id}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Sonuçlar yüklenemedi');
        return res.json();
      })
      .then((json) => {
        if (isLikert) {
          setLikertData(json.data);
        } else {
          setOcaiData(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id, moduleParam, isLikert, router]);

  if (loading) {
    return <div style={styles.loading}>Sonuçlar hesaplanıyor...</div>;
  }

  if (error || (!ocaiData && !likertData)) {
    return (
      <div style={styles.loading}>
        <p style={{ color: '#c62828' }}>{error || 'Sonuç bulunamadı'}</p>
        <button onClick={() => router.push('/dashboard')} style={styles.backBtn}>
          Panoya Dön
        </button>
      </div>
    );
  }

  if (isLikert && likertData) {
    return <LikertResultView data={likertData} router={router} />;
  }

  if (ocaiData) {
    return <OCAIResultView data={ocaiData} router={router} />;
  }

  return null;
}

// ══════════════════════════════════════════
// LIKERT SONUÇ GÖRÜNÜMÜ
// ══════════════════════════════════════════
function LikertResultView({ data, router }: { data: LikertResultData; router: any }) {
  const accentColor = MODULE_COLORS[data.moduleCode] || '#2E86AB';
  const moduleName = MODULE_NAMES[data.moduleCode] || data.moduleCode;
  const scaleMax = data.moduleCode === 'M4_UWES' ? 6 : 5;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{moduleName} — Sonuç Raporu</h1>
          <p style={styles.subtitle}>
            Tamamlanma: {new Date(data.completedAt).toLocaleString('tr-TR')} &middot; {data.totalAnswers} yanıt
          </p>
        </div>

        {/* Overall Score Card */}
        <div style={{ ...styles.overallCard, borderLeftColor: accentColor }}>
          <div style={styles.overallLabel}>Genel Ortalama</div>
          <div style={{ ...styles.overallValue, color: accentColor }}>
            {data.overallMean} <span style={styles.overallMax}>/ {scaleMax}</span>
          </div>
          <div style={styles.overallBar}>
            <div
              style={{
                height: '100%',
                width: `${(data.overallMean / scaleMax) * 100}%`,
                background: accentColor,
                borderRadius: 4,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Subdimension Bar Chart */}
        <div style={styles.chartCard}>
          <h2 style={styles.sectionTitle}>Alt Boyut Skorları</h2>
          <div style={styles.barChartContainer}>
            {data.subdimensions.map((sub) => {
              const percentage = (sub.mean / scaleMax) * 100;
              return (
                <div key={sub.id} style={styles.barRow}>
                  <div style={styles.barLabel}>
                    <span style={styles.barTitle}>{sub.title}</span>
                    <span style={styles.barValue}>
                      {sub.mean} <span style={{ color: '#999', fontWeight: 400 }}>({'\u00B1'}{sub.std})</span>
                    </span>
                  </div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${percentage}%`,
                        background: accentColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Table */}
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Detaylı İstatistik</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Alt Boyut</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Ort.</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Std. Sapma</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Min</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Max</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Madde</th>
              </tr>
            </thead>
            <tbody>
              {data.subdimensions.map((sub) => (
                <tr key={sub.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{sub.title}</td>
                  <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: accentColor }}>
                    {sub.mean}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{sub.std}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{sub.min}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{sub.max}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{sub.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={() => router.push('/dashboard')} style={styles.backBtn}>
            Panoya Dön
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// OCAI SONUÇ GÖRÜNÜMÜ (Mevcut kod korundu)
// ══════════════════════════════════════════
function OCAIResultView({ data, router }: { data: OCAIResultData; router: any }) {
  const types = Object.keys(data.scores);

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>OCAI Sonuç Raporu</h1>
          <p style={styles.subtitle}>
            Tamamlanma: {new Date(data.completedAt).toLocaleString('tr-TR')}
          </p>
        </div>

        {/* Dominant Culture Cards */}
        <div style={styles.dominantRow}>
          <div style={{ ...styles.dominantCard, borderLeftColor: CULTURE_COLORS[data.dominant.mevcut.type] }}>
            <div style={styles.dominantLabel}>Mevcut Baskın Kültür</div>
            <div style={styles.dominantValue}>{data.dominant.mevcut.name}</div>
            <div style={styles.dominantScore}>
              {data.scores[data.dominant.mevcut.type].mevcut} puan
            </div>
          </div>
          <div style={{ ...styles.dominantCard, borderLeftColor: CULTURE_COLORS[data.dominant.tercih_edilen.type] }}>
            <div style={styles.dominantLabel}>Tercih Edilen Baskın Kültür</div>
            <div style={styles.dominantValue}>{data.dominant.tercih_edilen.name}</div>
            <div style={styles.dominantScore}>
              {data.scores[data.dominant.tercih_edilen.type].tercih_edilen} puan
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div style={styles.chartCard}>
          <h2 style={styles.sectionTitle}>Kültür Profili</h2>
          <div style={styles.chartWrapper}>
            <RadarChart scores={data.scores} cultureTypes={data.cultureTypes} />
          </div>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: '#2E86AB' }} />
              <span>Mevcut Durum</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: '#FF9800' }} />
              <span>Tercih Edilen</span>
            </div>
          </div>
        </div>

        {/* Score Table */}
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Skor Tablosu</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kültür Tipi</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Mevcut</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Tercih Edilen</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Fark</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => {
                const diff = data.scores[t].tercih_edilen - data.scores[t].mevcut;
                return (
                  <tr key={t}>
                    <td style={styles.td}>
                      <span style={{ ...styles.typeDot, background: CULTURE_COLORS[t] }} />
                      <strong>{t}</strong> — {data.cultureTypes[t]}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
                      {data.scores[t].mevcut}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
                      {data.scores[t].tercih_edilen}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: diff > 0 ? '#2e7d32' : diff < 0 ? '#c62828' : '#666',
                      }}
                    >
                      {diff > 0 ? '+' : ''}{diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Culture Type Descriptions */}
        <div style={styles.descriptionsSection}>
          <h2 style={styles.sectionTitle}>Kültür Tipleri</h2>
          <div style={styles.descGrid}>
            {types.map((t) => (
              <div key={t} style={{ ...styles.descCard, borderTopColor: CULTURE_COLORS[t] }}>
                <div style={styles.descHeader}>
                  <span style={{ ...styles.descBadge, background: CULTURE_COLORS[t] }}>{t}</span>
                  <span style={styles.descName}>{data.cultureTypes[t]}</span>
                </div>
                <p style={styles.descText}>{CULTURE_DESCRIPTIONS[t]}</p>
                <div style={styles.descScores}>
                  <span>Mevcut: <strong>{data.scores[t].mevcut}</strong></span>
                  <span>Tercih: <strong>{data.scores[t].tercih_edilen}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={() => router.push('/dashboard')} style={styles.backBtn}>
            Panoya Dön
          </button>
          <button onClick={() => router.push('/survey/ocai')} style={styles.retakeBtn}>
            Yeni Değerlendirme
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SVG Radar Chart ──
function RadarChart({ scores, cultureTypes }: { scores: Record<string, CultureScore>; cultureTypes: Record<string, string> }) {
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 150;
  const types = Object.keys(scores);
  const n = types.length;

  function getPoint(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function makePolygon(getValue: (t: string) => number): string {
    return types.map((t, i) => getPoint(i, getValue(t)).join(',')).join(' ');
  }

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 400, height: 'auto' }}>
      {gridLevels.map((level) => (
        <polygon key={level} points={types.map((_, i) => getPoint(i, level).join(',')).join(' ')} fill="none" stroke="#e0e0e0" strokeWidth={level === 100 ? 1.5 : 0.8} />
      ))}
      {types.map((_, i) => {
        const [x, y] = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#d0d0d0" strokeWidth={0.8} />;
      })}
      {gridLevels.map((level) => (
        <text key={level} x={cx + 4} y={cy - (level / 100) * maxRadius + 4} fontSize={9} fill="#aaa">{level}</text>
      ))}
      <polygon points={makePolygon((t) => scores[t].mevcut)} fill="rgba(46, 134, 171, 0.2)" stroke="#2E86AB" strokeWidth={2.5} />
      {types.map((t, i) => {
        const [x, y] = getPoint(i, scores[t].mevcut);
        return <circle key={`m_${t}`} cx={x} cy={y} r={4} fill="#2E86AB" />;
      })}
      <polygon points={makePolygon((t) => scores[t].tercih_edilen)} fill="rgba(255, 152, 0, 0.15)" stroke="#FF9800" strokeWidth={2.5} strokeDasharray="6,3" />
      {types.map((t, i) => {
        const [x, y] = getPoint(i, scores[t].tercih_edilen);
        return <circle key={`t_${t}`} cx={x} cy={y} r={4} fill="#FF9800" />;
      })}
      {types.map((t, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const labelR = maxRadius + 30;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        return (
          <text key={`label_${t}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={CULTURE_COLORS[t]}>
            {cultureTypes[t]}
          </text>
        );
      })}
      {types.map((t, i) => {
        const [mx, my] = getPoint(i, scores[t].mevcut);
        const [tx, ty] = getPoint(i, scores[t].tercih_edilen);
        return (
          <g key={`vals_${t}`}>
            <text x={mx + 8} y={my - 6} fontSize={10} fontWeight={600} fill="#2E86AB">{scores[t].mevcut}</text>
            <text x={tx + 8} y={ty + 14} fontSize={10} fontWeight={600} fill="#FF9800">{scores[t].tercih_edilen}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Stiller ──
const styles: Record<string, React.CSSProperties> = {
  loading: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 16, color: '#888' },
  wrapper: { minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '32px 16px', background: '#FBF9F4' },
  container: { width: '100%', maxWidth: 880 },
  header: { textAlign: 'center' as const, marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 700, color: '#0F1D2F', margin: '0 0 6px' },
  subtitle: { fontSize: 13, color: '#888', margin: 0 },
  // Overall card (Likert)
  overallCard: { background: '#fff', borderRadius: 10, border: '1px solid #e0e0e0', borderLeft: '4px solid', padding: '20px 24px', marginBottom: 24 },
  overallLabel: { fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  overallValue: { fontSize: 36, fontWeight: 800, marginBottom: 8 },
  overallMax: { fontSize: 18, fontWeight: 400, color: '#aaa' },
  overallBar: { height: 8, background: '#e8e8e8', borderRadius: 4, overflow: 'hidden' },
  // Bar chart (Likert)
  barChartContainer: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  barRow: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  barLabel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  barTitle: { fontSize: 14, fontWeight: 600, color: '#0F1D2F' },
  barValue: { fontSize: 14, fontWeight: 700, color: '#0F1D2F' },
  barTrack: { height: 12, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6, transition: 'width 0.5s ease' },
  // Dominant cards (OCAI)
  dominantRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  dominantCard: { background: '#fff', borderRadius: 10, border: '1px solid #e0e0e0', borderLeft: '4px solid', padding: '20px 24px' },
  dominantLabel: { fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  dominantValue: { fontSize: 22, fontWeight: 700, color: '#0F1D2F', marginBottom: 4 },
  dominantScore: { fontSize: 14, color: '#666' },
  // Chart
  chartCard: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '24px', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: '#0F1D2F', margin: '0 0 16px' },
  chartWrapper: { display: 'flex', justifyContent: 'center', padding: '16px 0' },
  legend: { display: 'flex', justifyContent: 'center', gap: 32, marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#555' },
  legendDot: { width: 14, height: 14, borderRadius: '50%' },
  // Table
  tableCard: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '24px', marginBottom: 24, overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: { textAlign: 'left' as const, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '2px solid #e0e0e0', background: '#fafafa' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  typeDot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 8, verticalAlign: 'middle' },
  // Descriptions
  descriptionsSection: { marginBottom: 24 },
  descGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  descCard: { background: '#fff', border: '1px solid #e0e0e0', borderTop: '3px solid', borderRadius: 10, padding: '20px' },
  descHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  descBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: 14 },
  descName: { fontSize: 16, fontWeight: 600, color: '#0F1D2F' },
  descText: { fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0 0 12px' },
  descScores: { display: 'flex', gap: 16, fontSize: 13, color: '#888' },
  // Actions
  actions: { display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 },
  backBtn: { padding: '10px 28px', fontSize: 14, fontWeight: 500, color: '#555', background: '#fff', border: '1px solid #d0d0d0', borderRadius: 8, cursor: 'pointer' },
  retakeBtn: { padding: '10px 28px', fontSize: 14, fontWeight: 600, color: '#fff', background: '#2E86AB', border: 'none', borderRadius: 8, cursor: 'pointer' },
};
