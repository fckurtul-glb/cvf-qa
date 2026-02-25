'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Campaign { id: string; name: string; status: string; }
interface GapData {
  culture: string;
  cultureName: string;
  mevcut: number;
  tercih: number;
  gap: number;
  severity: string;
}
interface DimensionData {
  id: string;
  title: string;
  cultures: Record<string, { mevcut: number; tercih: number; gap: number }>;
}

const SEVERITY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  low: { bg: '#EAFAF1', color: '#27AE60', label: 'Düşük' },
  medium: { bg: '#FFF5EB', color: '#E67E22', label: 'Orta' },
  high: { bg: '#FDEDEC', color: '#E74C3C', label: 'Yüksek' },
};

export default function GapAnalysisPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [gaps, setGaps] = useState<GapData[]>([]);
  const [dimensions, setDimensions] = useState<DimensionData[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        setCampaigns((json.data || []).filter((c: Campaign) => ['ACTIVE', 'COMPLETED'].includes(c.status)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function loadGap(campaignId: string) {
    const token = localStorage.getItem('token');
    if (!token) return;

    setAnalyzing(true);
    setSelectedCampaign(campaignId);

    try {
      const res = await fetch(`${API}/analytics/gap/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setGaps(json.data.gaps || []);
        setDimensions(json.data.dimensions || []);
        setResponseCount(json.data.responseCount || 0);
      }
    } catch { /* */ }
    setAnalyzing(false);
  }

  if (loading) return <div style={styles.loading}>Yükleniyor...</div>;

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>OCAI Gap Analizi</h1>
      <p style={styles.subtitle}>Mevcut ve tercih edilen kültür profili arasındaki farkları analiz edin.</p>

      <div style={styles.section}>
        <label style={styles.label}>Kampanya Seçin</label>
        <select
          value={selectedCampaign}
          onChange={(e) => loadGap(e.target.value)}
          style={styles.select}
        >
          <option value="">Kampanya seçin...</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {analyzing && <div style={styles.loading}>Analiz yapılıyor...</div>}

      {gaps.length > 0 && !analyzing && (
        <>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            {responseCount} yanıt analiz edildi
          </p>

          {/* Genel Gap Tablosu */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Genel Kültür Gap'leri</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Kültür Tipi</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Mevcut</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Tercih Edilen</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Gap</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Düzey</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => {
                  const sev = SEVERITY_COLORS[g.severity] || SEVERITY_COLORS.low;
                  return (
                    <tr key={g.culture}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{g.cultureName} ({g.culture})</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{g.mevcut}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{g.tercih}</td>
                      <td style={{
                        ...styles.td, textAlign: 'center', fontWeight: 700,
                        color: g.gap > 0 ? '#27AE60' : g.gap < 0 ? '#E74C3C' : '#333',
                      }}>
                        {g.gap > 0 ? '+' : ''}{g.gap}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sev.color, background: sev.bg }}>
                          {sev.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual Gap Bars */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Gap Görselleştirme</h2>
            {gaps.map((g) => (
              <div key={g.culture} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{g.cultureName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 60, fontSize: 12, color: '#888' }}>Mevcut</span>
                  <div style={{ flex: 1, height: 16, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${g.mevcut}%`, height: '100%', background: '#2E86AB', borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 40, fontSize: 13, fontWeight: 600 }}>{g.mevcut}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 60, fontSize: 12, color: '#888' }}>Tercih</span>
                  <div style={{ flex: 1, height: 16, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${g.tercih}%`, height: '100%', background: '#27AE60', borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 40, fontSize: 13, fontWeight: 600 }}>{g.tercih}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Boyut Bazlı Detay */}
          {dimensions.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Boyut Bazlı Gap Detayı</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Boyut</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Klan</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Adhokrasi</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Pazar</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Hiyerarşi</th>
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((d) => (
                    <tr key={d.id}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{d.title}</td>
                      {['A', 'B', 'C', 'D'].map((alt) => {
                        const g = d.cultures[alt];
                        return (
                          <td key={alt} style={{
                            ...styles.td, textAlign: 'center', fontSize: 13,
                            color: g?.gap > 0 ? '#27AE60' : g?.gap < 0 ? '#E74C3C' : '#333',
                          }}>
                            {g ? `${g.gap > 0 ? '+' : ''}${g.gap}` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  wrapper: { padding: '24px 0' },
  title: { fontSize: 24, fontWeight: 700, color: '#0F1D2F', margin: '0 0 8px 0' },
  subtitle: { fontSize: 14, color: '#888', margin: '0 0 24px 0' },
  section: { marginBottom: 24 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8 },
  select: {
    width: '100%', maxWidth: 400, padding: '10px 12px', fontSize: 14,
    border: '1px solid #ddd', borderRadius: 8, background: '#fff',
  },
  card: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
    padding: 20, marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#0F1D2F', margin: '0 0 12px 0' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const, padding: '10px 12px', fontSize: 12, fontWeight: 600,
    color: '#888', borderBottom: '2px solid #e0e0e0', background: '#fafafa',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
};
