'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ReportItem {
  id: string;
  campaignName: string;
  reportType: string;
  scope: string;
  generatedAt: string;
  expired: boolean;
}

interface CampaignOption {
  id: string;
  name: string;
  status: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  INSTITUTIONAL: 'Kurumsal',
  DEPARTMENT: 'Birim',
  INDIVIDUAL_360: '360° Bireysel',
  YOKAK_EVIDENCE: 'YÖKAK Kanıt',
  COMPARATIVE: 'Karşılaştırma',
};

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.replace('/auth/login'); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [reportsRes, campaignsRes] = await Promise.all([
        fetch(`${API}/reports`, { headers }).then((r) => r.json()),
        fetch(`${API}/campaigns`, { headers }).then((r) => r.json()),
      ]);
      setReports(reportsRes.data || []);
      setCampaigns((campaignsRes.data || []).filter((c: any) => c.status === 'ACTIVE' || c.status === 'COMPLETED'));
    } catch {
      setError('Veriler yüklenemedi');
    }
    setLoading(false);
  }

  async function handleGenerate() {
    if (!selectedCampaign) { setError('Lütfen bir kampanya seçin'); return; }
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API}/reports/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId: selectedCampaign }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Rapor oluşturulamadı');
        setGenerating(false);
        return;
      }

      setSuccessMsg('Rapor başarıyla oluşturuldu!');
      setSelectedCampaign('');
      await loadData();
    } catch {
      setError('Bağlantı hatası');
    }
    setGenerating(false);
  }

  async function handleDownload(reportId: string) {
    try {
      const res = await fetch(`${API}/reports/${reportId}/download`, { headers });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message || 'İndirme başarısız');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'rapor.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('İndirme hatası');
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Yükleniyor...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F1D2F', margin: '0 0 24px' }}>Raporlar</h1>

      {/* Generate Section */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Yeni Rapor Oluştur</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>
          Tamamlanmış yanıtları olan bir kampanya seçerek kurumsal rapor oluşturun.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={styles.label}>Kampanya</label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              style={styles.select}
            >
              <option value="">Kampanya seçin...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status === 'ACTIVE' ? 'Aktif' : 'Tamamlandı'})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedCampaign}
            style={{ ...styles.primaryBtn, opacity: generating || !selectedCampaign ? 0.5 : 1 }}
          >
            {generating ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}
      </div>

      {/* Reports List */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Oluşturulan Raporlar</h3>

        {reports.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 20 }}>
            Henüz oluşturulmuş rapor bulunmuyor.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kampanya</th>
                <th style={styles.th}>Tür</th>
                <th style={styles.th}>Tarih</th>
                <th style={styles.th}>Durum</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{r.campaignName}</td>
                  <td style={styles.td}>
                    <span style={styles.typeBadge}>{REPORT_TYPE_LABELS[r.reportType] || r.reportType}</span>
                  </td>
                  <td style={styles.td}>{new Date(r.generatedAt).toLocaleString('tr-TR')}</td>
                  <td style={styles.td}>
                    {r.expired ? (
                      <span style={{ color: '#c62828', fontWeight: 600, fontSize: 13 }}>Süresi Dolmuş</span>
                    ) : (
                      <span style={{ color: '#27AE60', fontWeight: 600, fontSize: 13 }}>Aktif</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    {!r.expired && (
                      <button
                        onClick={() => handleDownload(r.id)}
                        style={styles.downloadBtn}
                      >
                        PDF İndir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '20px 24px', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#0F1D2F', margin: '0 0 8px' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1D2F', marginBottom: 6 },
  select: { width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #d0d0d0', borderRadius: 8, background: '#fff', color: '#0F1D2F' },
  primaryBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600,
    color: '#fff', background: '#2E86AB', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13, marginTop: 12 },
  successBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#166534', fontSize: 13, marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: { textAlign: 'left' as const, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '2px solid #e0e0e0', background: '#fafafa' },
  td: { padding: '12px 14px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#7B2D8E', background: '#F3E8F9', borderRadius: 6 },
  downloadBtn: {
    padding: '6px 14px', fontSize: 12, fontWeight: 600,
    color: '#fff', background: '#27AE60', border: 'none', borderRadius: 6, cursor: 'pointer',
  },
};
