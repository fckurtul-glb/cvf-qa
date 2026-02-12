'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

interface Config360 {
  id: string;
  campaignName: string;
  managerName: string;
  managerId: string;
  status: string;
  createdAt: string;
  raterCount: number;
  completedCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Bekliyor', color: '#E67E22', bg: '#FFF5EB' },
  IN_PROGRESS: { label: 'Devam Ediyor', color: '#2E86AB', bg: '#E8F4FD' },
  COMPLETED: { label: 'Tamamlandı', color: '#27AE60', bg: '#EAFAF1' },
};

export default function Assessment360ListPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<Config360[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/360`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setConfigs(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div style={styles.loading}>360° değerlendirmeler yükleniyor...</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>360° Değerlendirmeler</h1>
        <button onClick={() => router.push('/dashboard/360/new')} style={styles.createBtn}>
          + Yeni 360° Değerlendirme
        </button>
      </div>

      {configs.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: 16, color: '#888' }}>Henüz 360° değerlendirme oluşturulmamış.</p>
          <button onClick={() => router.push('/dashboard/360/new')} style={styles.createBtn}>
            İlk Değerlendirmeyi Oluştur
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Yönetici</th>
                <th style={styles.th}>Kampanya</th>
                <th style={styles.th}>Durum</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Değerlendirici</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Tamamlanan</th>
                <th style={styles.th}>Oluşturma</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => {
                const status = STATUS_LABELS[c.status] || STATUS_LABELS.PENDING;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/dashboard/360/${c.id}`)}
                    style={styles.row}
                  >
                    <td style={{ ...styles.td, fontWeight: 600 }}>{c.managerName}</td>
                    <td style={styles.td}>{c.campaignName}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{c.raterCount}</td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>
                      {c.completedCount}/{c.raterCount}
                    </td>
                    <td style={{ ...styles.td, fontSize: 13, color: '#888' }}>
                      {new Date(c.createdAt).toLocaleDateString('tr-TR')}
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
  empty: { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 },
  tableWrapper: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const, padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#888',
    textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '2px solid #e0e0e0', background: '#fafafa',
  },
  td: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  row: { cursor: 'pointer', transition: 'background 0.1s' },
  badge: {
    display: 'inline-block', padding: '3px 10px', fontSize: 12, fontWeight: 600, borderRadius: 12,
  },
};
