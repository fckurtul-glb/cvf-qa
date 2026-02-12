'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

const MODULES = [
  { code: 'M1_OCAI', name: 'OCAI — Kültür Değerlendirme', desc: '24 soru, ipsatif' },
  { code: 'M2_QCI', name: 'QCI — Kalite Kültürü', desc: '30 soru, 5\'li Likert' },
  { code: 'M4_UWES', name: 'UWES — İşe Bağlılık', desc: '9 soru, 7\'li Likert' },
  { code: 'M5_PKE', name: 'PKE — Paydaş Katılım', desc: '20 soru, 5\'li Likert' },
  { code: 'M6_SPU', name: 'SPU — Stratejik Plan Uyumu', desc: '15 soru, 5\'li Likert' },
];

const TARGET_GROUPS = [
  { code: 'ACADEMIC', name: 'Akademik Personel' },
  { code: 'ADMINISTRATIVE', name: 'İdari Personel' },
  { code: 'STUDENT', name: 'Öğrenci' },
  { code: 'EXTERNAL', name: 'Dış Paydaş' },
  { code: 'ALUMNI', name: 'Mezun' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [closesAt, setClosesAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }
    setAuthChecked(true);
  }, [router]);

  function toggleModule(code: string) {
    setSelectedModules((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    );
  }

  function toggleGroup(code: string) {
    setSelectedGroups((prev) =>
      prev.includes(code) ? prev.filter((g) => g !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Kampanya adı gereklidir'); return; }
    if (selectedModules.length === 0) { setError('En az bir modül seçin'); return; }
    if (selectedGroups.length === 0) { setError('En az bir hedef grup seçin'); return; }
    if (!closesAt) { setError('Bitiş tarihi gereklidir'); return; }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          modules: selectedModules,
          targetGroups: selectedGroups,
          closesAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Oluşturma başarısız');
        setSubmitting(false);
        return;
      }

      router.push(`/dashboard/campaigns/${data.data.id}`);
    } catch {
      setError('Bağlantı hatası');
      setSubmitting(false);
    }
  }

  if (!authChecked) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>Yeni Kampanya Oluştur</h1>

        <form onSubmit={handleSubmit}>
          {/* Kampanya Adı */}
          <div style={styles.field}>
            <label style={styles.label}>Kampanya Adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ör: 2024 Bahar Kültür Değerlendirmesi"
              style={styles.input}
            />
          </div>

          {/* Açıklama */}
          <div style={styles.field}>
            <label style={styles.label}>Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kampanya hakkında kısa bilgi..."
              style={{ ...styles.input, minHeight: 80, resize: 'vertical' as const }}
            />
          </div>

          {/* Modül Seçimi */}
          <div style={styles.field}>
            <label style={styles.label}>Modül Seçimi *</label>
            <div style={styles.checkboxGrid}>
              {MODULES.map((m) => {
                const checked = selectedModules.includes(m.code);
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => toggleModule(m.code)}
                    style={{
                      ...styles.checkCard,
                      borderColor: checked ? '#2E86AB' : '#e0e0e0',
                      background: checked ? '#E8F4FD' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        ...styles.checkbox,
                        borderColor: checked ? '#2E86AB' : '#ccc',
                        background: checked ? '#2E86AB' : '#fff',
                      }}>
                        {checked && <span style={styles.checkmark}>✓</span>}
                      </span>
                      <span style={{ fontWeight: 600, color: '#0F1D2F' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hedef Gruplar */}
          <div style={styles.field}>
            <label style={styles.label}>Hedef Paydaş Grupları *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TARGET_GROUPS.map((g) => {
                const checked = selectedGroups.includes(g.code);
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => toggleGroup(g.code)}
                    style={{
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 500,
                      borderRadius: 20,
                      border: '2px solid',
                      borderColor: checked ? '#2E86AB' : '#e0e0e0',
                      background: checked ? '#2E86AB' : '#fff',
                      color: checked ? '#fff' : '#555',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bitiş Tarihi */}
          <div style={styles.field}>
            <label style={styles.label}>Bitiş Tarihi *</label>
            <input
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ ...styles.input, maxWidth: 250 }}
            />
          </div>

          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Actions */}
          <div style={styles.actions}>
            <button type="button" onClick={() => router.back()} style={styles.cancelBtn}>
              İptal
            </button>
            <button type="submit" disabled={submitting} style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Oluşturuluyor...' : 'Kampanya Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { padding: '24px 0' },
  container: { maxWidth: 700 },
  title: { fontSize: 24, fontWeight: 700, color: '#0F1D2F', margin: '0 0 28px' },
  field: { marginBottom: 24 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#0F1D2F', marginBottom: 8 },
  input: {
    width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #d0d0d0',
    borderRadius: 8, outline: 'none', color: '#0F1D2F', background: '#fff',
    boxSizing: 'border-box' as const,
  },
  checkboxGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  checkCard: {
    display: 'flex', flexDirection: 'column', padding: '12px 16px',
    borderRadius: 8, border: '2px solid', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s',
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, border: '2px solid',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 700 },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
    padding: '12px 16px', color: '#991b1b', fontSize: 14, marginBottom: 16,
  },
  actions: { display: 'flex', gap: 12, marginTop: 8 },
  cancelBtn: {
    padding: '10px 28px', fontSize: 14, fontWeight: 500, color: '#555',
    background: '#fff', border: '1px solid #d0d0d0', borderRadius: 8, cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 28px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#2E86AB', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
};
