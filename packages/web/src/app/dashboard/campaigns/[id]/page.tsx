'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  modules: string[];
  targetGroups: string[];
  startedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  stats: {
    totalInvited: number;
    totalResponses: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    responseRate: number;
  };
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
  M1_OCAI: 'OCAI — Kültür Değerlendirme',
  M2_QCI: 'QCI — Kalite Kültürü',
  M3_MSAI: 'MSAI — Yönetici Değerlendirme',
  M4_UWES: 'UWES — İşe Bağlılık',
  M5_PKE: 'PKE — Paydaş Katılım',
  M6_SPU: 'SPU — Stratejik Plan Uyumu',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  function fetchCampaign() {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/campaigns/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchCampaign(); }, [params.id]);

  async function handleLaunch() {
    if (!confirm('Kampanyayı başlatmak istediğinizden emin misiniz? Tüm hedef katılımcılara davet gönderilecek.')) return;
    setLaunching(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/campaigns/${params.id}/launch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (res.ok) {
        setMessage(`Kampanya başlatıldı! ${json.data.tokensGenerated} davet üretildi, ${json.data.emailsSent} e-posta gönderildi.`);
        fetchCampaign();
      } else {
        setMessage(`Hata: ${json.error?.message}`);
      }
    } catch {
      setMessage('Bağlantı hatası');
    }
    setLaunching(false);
  }

  async function handleRemind() {
    setReminding(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/campaigns/${params.id}/remind`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (res.ok) {
        setMessage(`${json.data.remindersSent} hatırlatma gönderildi.`);
      } else {
        setMessage(`Hata: ${json.error?.message}`);
      }
    } catch {
      setMessage('Bağlantı hatası');
    }
    setReminding(false);
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/reports/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: params.id }),
      });
      const json = await res.json();

      if (res.ok) {
        setMessage('Rapor oluşturuldu! Raporlar sayfasından indirebilirsiniz.');
      } else {
        setMessage(`Hata: ${json.error?.message || 'Rapor oluşturulamadı'}`);
      }
    } catch {
      setMessage('Bağlantı hatası');
    }
    setGeneratingReport(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Yükleniyor...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#c62828' }}>Kampanya bulunamadı</div>;

  const status = STATUS_LABELS[data.status] || STATUS_LABELS.DRAFT;
  const s = data.stats;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={() => router.push('/dashboard/campaigns')} style={styles.backLink}>
            ← Kampanyalar
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F1D2F', margin: '8px 0 4px' }}>{data.name}</h1>
          {data.description && <p style={{ fontSize: 14, color: '#888', margin: 0 }}>{data.description}</p>}
        </div>
        <span style={{ ...styles.badge, color: status.color, background: status.bg, fontSize: 14 }}>
          {status.label}
        </span>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard label="Toplam Davet" value={s.totalInvited} color="#2E86AB" />
        <StatCard label="Tamamlanan" value={s.completed} color="#27AE60" />
        <StatCard label="Devam Eden" value={s.inProgress} color="#E67E22" />
        <StatCard label="Yanıt Oranı" value={`%${s.responseRate}`} color="#7B2D8E" />
      </div>

      {/* Response Rate Progress Bar */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Yanıt Durumu</h3>
        <div style={styles.rateBar}>
          <div style={{ ...styles.rateSegment, width: `${s.totalInvited > 0 ? (s.completed / s.totalInvited) * 100 : 0}%`, background: '#27AE60' }} />
          <div style={{ ...styles.rateSegment, width: `${s.totalInvited > 0 ? (s.inProgress / s.totalInvited) * 100 : 0}%`, background: '#E67E22' }} />
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 13 }}>
          <span style={{ color: '#27AE60' }}>■ Tamamlandı ({s.completed})</span>
          <span style={{ color: '#E67E22' }}>■ Devam Ediyor ({s.inProgress})</span>
          <span style={{ color: '#ccc' }}>■ Başlamadı ({s.notStarted})</span>
        </div>
      </div>

      {/* Module List */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Modüller</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(data.modules as string[]).map((m) => (
            <span key={m} style={styles.moduleBadge}>{MODULE_LABELS[m] || m}</span>
          ))}
        </div>
      </div>

      {/* Campaign Info */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Bilgiler</h3>
        <div style={styles.infoGrid}>
          <div><span style={styles.infoLabel}>Oluşturma</span><br />{new Date(data.createdAt).toLocaleDateString('tr-TR')}</div>
          <div><span style={styles.infoLabel}>Başlangıç</span><br />{data.startedAt ? new Date(data.startedAt).toLocaleDateString('tr-TR') : '—'}</div>
          <div><span style={styles.infoLabel}>Bitiş</span><br />{data.closesAt ? new Date(data.closesAt).toLocaleDateString('tr-TR') : '—'}</div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: message.startsWith('Hata') ? '#fef2f2' : '#f0fdf4',
          color: message.startsWith('Hata') ? '#991b1b' : '#166534',
          border: `1px solid ${message.startsWith('Hata') ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {message}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        {data.status === 'DRAFT' && (
          <button onClick={handleLaunch} disabled={launching} style={{ ...styles.launchBtn, opacity: launching ? 0.6 : 1 }}>
            {launching ? 'Başlatılıyor...' : 'Kampanyayı Başlat'}
          </button>
        )}
        {data.status === 'ACTIVE' && (
          <button onClick={handleRemind} disabled={reminding} style={{ ...styles.remindBtn, opacity: reminding ? 0.6 : 1 }}>
            {reminding ? 'Gönderiliyor...' : 'Hatırlatma Gönder'}
          </button>
        )}
        {(data.status === 'ACTIVE' || data.status === 'COMPLETED') && s.completed > 0 && (
          <button onClick={handleGenerateReport} disabled={generatingReport} style={{ ...styles.reportBtn, opacity: generatingReport ? 0.6 : 1 }}>
            {generatingReport ? 'Oluşturuluyor...' : 'PDF Rapor Oluştur'}
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ ...styles.statCard, borderTopColor: color }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backLink: {
    background: 'none', border: 'none', color: '#2E86AB', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', padding: 0,
  },
  badge: {
    display: 'inline-block', padding: '4px 14px', fontWeight: 600, borderRadius: 16,
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: {
    background: '#fff', border: '1px solid #e0e0e0', borderTop: '3px solid',
    borderRadius: 10, padding: '16px 20px',
  },
  card: {
    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
    padding: '20px 24px', marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#0F1D2F', margin: '0 0 12px' },
  rateBar: { height: 16, background: '#f0f0f0', borderRadius: 8, overflow: 'hidden', display: 'flex' },
  rateSegment: { height: '100%', transition: 'width 0.5s ease' },
  moduleBadge: {
    padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#2E86AB',
    background: '#E8F4FD', borderRadius: 8,
  },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 14, color: '#0F1D2F' },
  infoLabel: { fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  launchBtn: {
    padding: '12px 32px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#27AE60', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  remindBtn: {
    padding: '12px 32px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#E67E22', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  reportBtn: {
    padding: '12px 32px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#7B2D8E', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
};
