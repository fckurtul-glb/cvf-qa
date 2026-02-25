'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Campaign { id: string; name: string; status: string; }
interface StakeholderData {
  group: string;
  groupName: string;
  participantCount: number;
  mean: number;
  answerCount: number;
}

const MODULE_LABELS: Record<string, string> = {
  M2_QCI: 'QCI', M3_MSAI: 'MSAI', M4_UWES: 'UWES', M5_PKE: 'PKE', M6_SPU: 'SPU',
};

export default function StakeholdersPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [stakeholders, setStakeholders] = useState<StakeholderData[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
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

  async function loadData() {
    if (!selectedCampaign) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setAnalyzing(true);
    const modQuery = selectedModule ? `?module=${selectedModule}` : '';
    try {
      const res = await fetch(`${API}/analytics/stakeholders/${selectedCampaign}${modQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setStakeholders(json.data.stakeholders || []);
        setTotalParticipants(json.data.totalParticipants || 0);
      }
    } catch { /* */ }
    setAnalyzing(false);
  }

  useEffect(() => {
    if (selectedCampaign) loadData();
  }, [selectedCampaign, selectedModule]);

  if (loading) return <div style={styles.loading}>Yükleniyor...</div>;

  const COLORS = ['#2E86AB', '#27AE60', '#E67E22', '#E74C3C', '#7B2D8E'];

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>Paydaş Grubu Karşılaştırma</h1>
      <p style={styles.subtitle}>
        Akademik, İdari, Öğrenci, Yönetim ve Dış Paydaş gruplarının skorlarını karşılaştırın.
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Kampanya</label>
          <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} style={styles.select}>
            <option value="">Kampanya seçin...</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Modül (Opsiyonel)</label>
          <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)} style={styles.select}>
            <option value="">Tümü</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {analyzing && <div style={styles.loading}>Analiz yapılıyor...</div>}

      {selectedCampaign && !analyzing && (
        <>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Toplam {totalParticipants} katılımcı
          </p>

          {stakeholders.length === 0 ? (
            <div style={styles.empty}>Yeterli paydaş grubu verisi bulunamadı.</div>
          ) : (
            <>
              {/* Kartlar */}
              <div style={styles.cardGrid}>
                {stakeholders.map((s, i) => (
                  <div key={s.group} style={styles.card}>
                    <div style={{
                      width: 8, height: '100%', position: 'absolute' as const,
                      left: 0, top: 0, borderRadius: '10px 0 0 10px',
                      background: COLORS[i % COLORS.length],
                    }} />
                    <div style={{ paddingLeft: 12 }}>
                      <div style={{ fontSize: 13, color: '#888' }}>{s.groupName}</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: '#0F1D2F' }}>{s.mean}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{s.participantCount} katılımcı</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablo */}
              <div style={styles.tableCard}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Paydaş Grubu</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Katılımcı</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Ortalama</th>
                      <th style={styles.th}>Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakeholders.map((s, i) => (
                      <tr key={s.group}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>
                          <span style={{
                            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                            background: COLORS[i % COLORS.length], marginRight: 8,
                          }} />
                          {s.groupName}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{s.participantCount}</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{s.mean}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 14, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{
                                width: `${(s.mean / 5) * 100}%`,
                                height: '100%',
                                background: COLORS[i % COLORS.length],
                                borderRadius: 4,
                              }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8 },
  select: {
    width: '100%', padding: '10px 12px', fontSize: 14,
    border: '1px solid #ddd', borderRadius: 8, background: '#fff',
  },
  cardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12, marginBottom: 24,
  },
  card: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
    padding: '16px 16px 16px 20px', position: 'relative' as const,
  },
  tableCard: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const, padding: '10px 12px', fontSize: 12, fontWeight: 600,
    color: '#888', borderBottom: '2px solid #e0e0e0', background: '#fafafa',
  },
  td: { padding: '12px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  empty: { padding: 40, textAlign: 'center', color: '#888', background: '#f8f9fa', borderRadius: 10 },
};
