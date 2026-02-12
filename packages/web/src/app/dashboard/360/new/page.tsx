'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const PERSPECTIVES = [
  { value: 'SELF', label: 'Öz Değerlendirme', desc: 'Yöneticinin kendisi' },
  { value: 'SUBORDINATE', label: 'Ast', desc: 'Yöneticiye bağlı çalışanlar' },
  { value: 'PEER', label: 'Eşdüzey', desc: 'Aynı seviyedeki meslektaşlar' },
  { value: 'SUPERIOR', label: 'Üst', desc: 'Yöneticinin üstleri' },
] as const;

interface RaterEntry {
  userId: string;
  perspective: string;
}

export default function New360Page() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [raters, setRaters] = useState<RaterEntry[]>([]);
  const [newRaterUser, setNewRaterUser] = useState('');
  const [newRaterPerspective, setNewRaterPerspective] = useState('SUBORDINATE');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    Promise.all([
      fetch(`${API}/campaigns`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([campJson, userJson]) => {
        setCampaigns((campJson.data || []).filter((c: Campaign) => ['ACTIVE', 'DRAFT', 'SCHEDULED'].includes(c.status)));
        setUsers(userJson.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  function addRater() {
    if (!newRaterUser) return;
    if (raters.some((r) => r.userId === newRaterUser)) {
      setError('Bu kullanıcı zaten eklenmiş');
      return;
    }
    setRaters([...raters, { userId: newRaterUser, perspective: newRaterPerspective }]);
    setNewRaterUser('');
    setError('');
  }

  function removeRater(idx: number) {
    setRaters(raters.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!selectedCampaign || !selectedManager) {
      setError('Kampanya ve yönetici seçimi zorunludur');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setSubmitting(true);
    setError('');

    try {
      // 1. Konfigürasyon oluştur
      const configRes = await fetch(`${API}/360`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaign, managerId: selectedManager }),
      });
      const configJson = await configRes.json();

      if (!configJson.success) {
        setError(configJson.error?.message || 'Konfigürasyon oluşturulamadı');
        setSubmitting(false);
        return;
      }

      const configId = configJson.data.id;

      // 2. Değerlendiricileri ata
      if (raters.length > 0) {
        const ratersRes = await fetch(`${API}/360/${configId}/raters`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raters }),
        });
        const ratersJson = await ratersRes.json();

        if (!ratersJson.success) {
          setError(ratersJson.error?.message || 'Değerlendiriciler atanamadı');
          setSubmitting(false);
          return;
        }
      }

      router.push(`/dashboard/360/${configId}`);
    } catch {
      setError('Bir hata oluştu');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={styles.loading}>Yükleniyor...</div>;
  }

  const managerUser = users.find((u) => u.id === selectedManager);

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>Yeni 360° Değerlendirme</h1>

      {error && <div style={styles.error}>{error}</div>}

      {/* Kampanya Seçimi */}
      <div style={styles.section}>
        <label style={styles.label}>Kampanya</label>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          style={styles.select}
        >
          <option value="">Kampanya seçin...</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Yönetici Seçimi */}
      <div style={styles.section}>
        <label style={styles.label}>Değerlendirilecek Yönetici</label>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          style={styles.select}
        >
          <option value="">Yönetici seçin...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
          ))}
        </select>
      </div>

      {/* Değerlendirici Ekleme */}
      <div style={styles.section}>
        <label style={styles.label}>Değerlendiriciler</label>
        <div style={styles.raterAddRow}>
          <select
            value={newRaterUser}
            onChange={(e) => setNewRaterUser(e.target.value)}
            style={{ ...styles.select, flex: 2 }}
          >
            <option value="">Kişi seçin...</option>
            {users
              .filter((u) => u.id !== selectedManager)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
          </select>
          <select
            value={newRaterPerspective}
            onChange={(e) => setNewRaterPerspective(e.target.value)}
            style={{ ...styles.select, flex: 1 }}
          >
            {PERSPECTIVES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button onClick={addRater} style={styles.addBtn}>Ekle</button>
        </div>

        {raters.length > 0 && (
          <div style={styles.raterList}>
            {raters.map((r, idx) => {
              const user = users.find((u) => u.id === r.userId);
              const perspective = PERSPECTIVES.find((p) => p.value === r.perspective);
              return (
                <div key={idx} style={styles.raterItem}>
                  <span style={styles.raterName}>{user?.name || user?.email || r.userId}</span>
                  <span style={styles.perspectiveBadge}>{perspective?.label}</span>
                  <button onClick={() => removeRater(idx)} style={styles.removeBtn}>Kaldır</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Perspektif özeti */}
        {raters.length > 0 && (
          <div style={styles.perspectiveSummary}>
            {PERSPECTIVES.map((p) => {
              const count = raters.filter((r) => r.perspective === p.value).length;
              return (
                <div key={p.value} style={styles.perspectiveItem}>
                  <span style={{ fontWeight: 600 }}>{p.label}:</span> {count} kişi
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Oluştur */}
      <div style={styles.actions}>
        <button onClick={() => router.back()} style={styles.cancelBtn}>İptal</button>
        <button onClick={handleSubmit} disabled={submitting} style={styles.submitBtn}>
          {submitting ? 'Oluşturuluyor...' : 'Değerlendirme Oluştur'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  wrapper: { padding: '24px 0', maxWidth: 720 },
  title: { fontSize: 24, fontWeight: 700, color: '#0F1D2F', margin: '0 0 24px 0' },
  error: {
    padding: '10px 16px', marginBottom: 16, background: '#FDEDEC', color: '#E74C3C',
    borderRadius: 8, fontSize: 14,
  },
  section: { marginBottom: 24 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8 },
  select: {
    width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd',
    borderRadius: 8, background: '#fff', color: '#333',
  },
  raterAddRow: { display: 'flex', gap: 8, alignItems: 'center' },
  addBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#27AE60', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  raterList: { marginTop: 12, display: 'flex', flexDirection: 'column' as const, gap: 6 },
  raterItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
    background: '#f8f9fa', borderRadius: 8, fontSize: 14,
  },
  raterName: { flex: 1, fontWeight: 500 },
  perspectiveBadge: {
    padding: '2px 10px', fontSize: 12, fontWeight: 600,
    color: '#2E86AB', background: '#E8F4FD', borderRadius: 12,
  },
  removeBtn: {
    padding: '4px 12px', fontSize: 12, color: '#E74C3C', background: 'transparent',
    border: '1px solid #E74C3C', borderRadius: 6, cursor: 'pointer',
  },
  perspectiveSummary: {
    marginTop: 12, display: 'flex', gap: 16, padding: '10px 14px',
    background: '#E8F4FD', borderRadius: 8, fontSize: 13, color: '#2E86AB',
  },
  perspectiveItem: {},
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 },
  cancelBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#666',
    background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#2E86AB', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
};
