'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  modules: string[];
  targetGroups: string[];
  startedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  totalInvited: number;
  totalResponses: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Taslak', color: '#666', bg: '#f0f0f0' },
  SCHEDULED: { label: 'Planlandı', color: '#E67E22', bg: '#FFF5EB' },
  ACTIVE: { label: 'Aktif', color: '#27AE60', bg: '#EAFAF1' },
  PAUSED: { label: 'Duraklatıldı', color: '#E74C3C', bg: '#FDEDEC' },
  COMPLETED: { label: 'Tamamlandı', color: '#2E86AB', bg: '#E8F4FD' },
  ARCHIVED: { label: 'Arşivlendi', color: '#999', bg: '#f5f5f5' },
};

const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI',
  M2_QCI: 'QCI',
  M3_MSAI: 'MSAI',
  M4_UWES: 'UWES',
  M5_PKE: 'PKE',
  M6_SPU: 'SPU',
};

export default function CampaignsListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setCampaigns(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div style={styles.loading}>Kampanyalar yükleniyor...</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Kampanyalar</h1>
        <button onClick={() => router.push('/dashboard/campaigns/new')} style={styles.createBtn}>
          + Yeni Kampanya
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: 16, color: '#888' }}>Henüz kampanya oluşturulmamış.</p>
          <button onClick={() => router.push('/dashboard/campaigns/new')} style={styles.createBtn}>
            İlk Kampanyayı Oluştur
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kampanya Adı</th>
                <th style={styles.th}>Durum</th>
                <th style={styles.th}>Modüller</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Davet</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Yanıt</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Oran</th>
                <th style={styles.th}>Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const status = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;
                const rate = c.totalInvited > 0
                  ? Math.round((c.totalResponses / c.totalInvited) * 100)
                  : 0;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}
                    style={styles.row}
                  >
                    <td style={{ ...styles.td, fontWeight: 600 }}>{c.name}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(c.modules as string[]).map((m) => (
                          <span key={m} style={styles.moduleBadge}>{MODULE_LABELS[m] || m}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{c.totalInvited}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{c.totalResponses}</td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>%{rate}</td>
                    <td style={{ ...styles.td, fontSize: 13, color: '#888' }}>
                      {c.closesAt ? new Date(c.closesAt).toLocaleDateString('tr-TR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  wrapper: { padding: '24px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: '#0F1D2F', margin: 0 },
  createBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#2E86AB', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  empty: { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  tableWrapper: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #e0e0e0', background: '#fafafa',
  },
  td: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  row: { cursor: 'pointer', transition: 'background 0.1s' },
  badge: {
    display: 'inline-block', padding: '3px 10px', fontSize: 12, fontWeight: 600, borderRadius: 12,
  },
  moduleBadge: {
    display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 600,
    color: '#2E86AB', background: '#E8F4FD', borderRadius: 6,
  },
};
