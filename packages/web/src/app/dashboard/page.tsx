'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('unauthorized');
        return res.json();
      })
      .then((data) => {
        setUser(data.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/auth/login');
      });
  }, [router]);

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <p style={{ color: '#888' }}>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Süper Yönetici',
    ORG_ADMIN: 'Kurum Yöneticisi',
    UNIT_ADMIN: 'Birim Yöneticisi',
    PARTICIPANT: 'Katılımcı',
    VIEWER: 'İzleyici',
  };

  const stakeholderLabels: Record<string, string> = {
    ACADEMIC: 'Akademik',
    ADMINISTRATIVE: 'İdari',
    STUDENT: 'Öğrenci',
    EXTERNAL: 'Dış Paydaş',
    ALUMNI: 'Mezun',
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Hoş geldiniz{user.name ? `, ${user.name}` : ''}
            </h1>
            <p style={styles.subtitle}>{user.organization.name}</p>
          </div>
        </div>

        <div style={styles.grid}>
          <InfoCard label="E-posta" value={user.email} />
          <InfoCard label="Rol" value={roleLabels[user.role] || user.role} />
          <InfoCard label="Paydaş Grubu" value={stakeholderLabels[user.stakeholderGroup] || user.stakeholderGroup} />
          <InfoCard label="Birim" value={user.department?.name || 'Atanmamış'} />
          <InfoCard label="Son Giriş" value={new Date(user.lastLoginAt).toLocaleString('tr-TR')} />
          <InfoCard label="Kayıt Tarihi" value={new Date(user.createdAt).toLocaleString('tr-TR')} />
        </div>

        <div style={styles.notice}>
          <strong>Faz 1 — Geliştirme Devam Ediyor</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            Anket kampanyaları, CSV kullanıcı yükleme ve OCAI modülü bu panodan yönetilecek.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  container: {
    width: '100%',
    maxWidth: 720,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    margin: '0 0 4px',
    color: '#0F1D2F',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
    marginBottom: 32,
  },
  infoCard: {
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e0e0e0',
    padding: '18px 20px',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: 500,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#0F1D2F',
    fontWeight: 500,
  },
  notice: {
    background: '#fff8e1',
    border: '1px solid #ffe082',
    borderRadius: 10,
    padding: '20px 24px',
    color: '#5d4037',
    fontSize: 15,
  },
};
