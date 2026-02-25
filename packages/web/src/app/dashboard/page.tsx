'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stakeholderGroup: string;
  organization: { id: string; name: string };
  department: { id: string; name: string } | null;
  lastLoginAt: string;
  createdAt: string;
}

interface DashboardStats {
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalResponses: number;
    avgResponseRate: number;
  };
  dailyTrend: { date: string; count: number }[];
  activeCampaigns: { id: string; name: string; totalInvited: number; totalResponses: number; rate: number }[];
  latestResponses: { id: string; campaignName: string; completedAt: string; modules: string[] }[];
}

const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI', M2_QCI: 'QCI', M4_UWES: 'UWES', M5_PKE: 'PKE', M6_SPU: 'SPU',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/auth/me`, { headers }).then((r) => r.json()),
      fetch(`${API}/analytics/dashboard`, { headers }).then((r) => r.json()).catch(() => ({ data: null })),
    ])
      .then(([userJson, dashJson]) => {
        if (!userJson.data) {
          localStorage.removeItem('token');
          router.replace('/auth/login');
          return;
        }
        setUser(userJson.data);
        setDashboard(dashJson.data || null);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/auth/login');
      });
  }, [router]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Yükleniyor...</div>;
  if (!user) return null;

  const s = dashboard?.stats;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F1D2F', margin: '0 0 4px' }}>
          Hoş geldiniz{user.name ? `, ${user.name}` : ''}
        </h1>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>{user.organization.name}</p>
      </div>

      {/* 4 Stats Cards */}
      {s && (
        <div style={styles.statsGrid}>
          <StatCard label="Toplam Kampanya" value={s.totalCampaigns} color="#2E86AB" />
          <StatCard label="Aktif Kampanya" value={s.activeCampaigns} color="#27AE60" />
          <StatCard label="Toplam Yanıt" value={s.totalResponses} color="#7B2D8E" />
          <StatCard label="Ort. Yanıt Oranı" value={`%${s.avgResponseRate}`} color="#E67E22" />
        </div>
      )}

      {/* Daily Trend Chart (simple bar chart) */}
      {dashboard?.dailyTrend && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Son 7 Gün Yanıt Trendi</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {dashboard.dailyTrend.map((d) => {
              const maxCount = Math.max(...dashboard.dailyTrend.map((t) => t.count), 1);
              const height = Math.max((d.count / maxCount) * 100, 4);
              const dayLabel = new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' });
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F1D2F' }}>{d.count}</span>
                  <div style={{
                    width: '100%', height: `${height}%`, background: 'linear-gradient(180deg, #2E86AB, #3A9BC5)',
                    borderRadius: '4px 4px 0 0', minHeight: 4,
                  }} />
                  <span style={{ fontSize: 11, color: '#888' }}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Campaigns Table */}
      {dashboard?.activeCampaigns && dashboard.activeCampaigns.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Aktif Kampanyalar</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kampanya</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Davet</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Yanıt</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Oran</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.activeCampaigns.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/dashboard/campaigns/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{c.totalInvited}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{c.totalResponses}</td>
                  <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: '#27AE60' }}>%{c.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Latest Responses */}
      {dashboard?.latestResponses && dashboard.latestResponses.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Son Yanıtlar</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dashboard.latestResponses.map((r) => (
              <div key={r.id} style={styles.responseItem}>
                <div>
                  <span style={{ fontWeight: 600, color: '#0F1D2F', fontSize: 14 }}>{r.campaignName}</span>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {r.modules.map((m) => (
                      <span key={m} style={styles.moduleBadge}>{MODULE_LABELS[m] || m}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {r.completedAt ? new Date(r.completedAt).toLocaleString('tr-TR') : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ ...styles.statCard, borderTopColor: color }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', border: '1px solid #e0e0e0', borderTop: '3px solid', borderRadius: 10, padding: '16px 20px' },
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '20px 24px', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#0F1D2F', margin: '0 0 16px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #e0e0e0', background: '#fafafa' },
  td: { padding: '12px 14px', borderBottom: '1px solid #f0f0f0', color: '#0F1D2F' },
  responseItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  moduleBadge: { display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#2E86AB', background: '#E8F4FD', borderRadius: 6 },
};
