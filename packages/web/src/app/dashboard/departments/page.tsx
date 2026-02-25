'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Campaign { id: string; name: string; status: string; }
interface DeptData {
  department: string;
  participantCount: number;
  mean: number;
  answerCount: number;
}

const MODULE_LABELS: Record<string, string> = {
  M2_QCI: 'QCI', M3_MSAI: 'MSAI', M4_UWES: 'UWES', M5_PKE: 'PKE', M6_SPU: 'SPU',
};

export default function DepartmentsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [departments, setDepartments] = useState<DeptData[]>([]);
  const [excludedCount, setExcludedCount] = useState(0);
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
      const res = await fetch(`${API}/analytics/departments/${selectedCampaign}${modQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setDepartments(json.data.departments || []);
        setExcludedCount(json.data.excludedDepartments || 0);
        setTotalParticipants(json.data.totalParticipants || 0);
      }
    } catch { /* */ }
    setAnalyzing(false);
  }

  useEffect(() => {
    if (selectedCampaign) loadData();
  }, [selectedCampaign, selectedModule]);

  if (loading) return <div style={styles.loading}>Yükleniyor...</div>;

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>Birim Bazlı Karşılaştırma</h1>
      <p style={styles.subtitle}>Birimlerin anket skorlarını karşılaştırın. Minimum 5 katılımcı kuralı uygulanır.</p>

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
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Toplam {totalParticipants} katılımcı
            {excludedCount > 0 && ` (${excludedCount} birim gizlilik nedeniyle hariç tutuldu)`}
          </p>

          {departments.length === 0 ? (
            <div style={styles.empty}>Yeterli veri bulunamadı veya hiçbir birimde 5+ katılımcı yok.</div>
          ) : (
            <div style={styles.card}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Birim</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Katılımcı</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Ortalama</th>
                    <th style={styles.th}>Skor Çubuğu</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.department}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{d.department}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{d.participantCount}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{d.mean}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 14, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${(d.mean / 5) * 100}%`,
                              height: '100%',
                              background: d.mean >= 4 ? '#27AE60' : d.mean >= 3 ? '#E67E22' : '#E74C3C',
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
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const, padding: '10px 12px', fontSize: 12, fontWeight: 600,
    color: '#888', borderBottom: '2px solid #e0e0e0', background: '#fafafa',
  },
  td: { padding: '12px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  empty: { padding: 40, textAlign: 'center', color: '#888', background: '#f8f9fa', borderRadius: 10 },
};
