'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  department: string | null;
  stakeholderGroup: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface ImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export default function UsersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  function getHeaders() {
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchUsers(page = 1) {
    try {
      const res = await fetch(`${API}/users?page=${page}&limit=50`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/auth/login');
          return;
        }
        throw new Error('Kullanıcılar yüklenemedi');
      }
      const data = await res.json();
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    fetchUsers();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setImportResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/users/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Yükleme başarısız');
        return;
      }

      setImportResult(data.data);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <p style={{ color: '#888' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Kullanıcı Yönetimi</h1>
            <p style={styles.subtitle}>CSV ile toplu kullanıcı yükleyin ve mevcut kullanıcıları görüntüleyin</p>
          </div>
        </div>

        {/* CSV Yükleme Bölümü */}
        <div style={styles.uploadSection}>
          <div style={styles.uploadInfo}>
            <strong>CSV ile Kullanıcı Yükle</strong>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666' }}>
              CSV formatı: <code style={styles.code}>ad,soyad,email,birim,unvan</code>
            </p>
          </div>
          <div style={styles.uploadActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              style={{ display: 'none' }}
              id="csv-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                ...styles.uploadBtn,
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Yükleniyor...' : 'CSV Dosyası Seç'}
            </button>
          </div>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Import Sonucu */}
        {importResult && (
          <div style={styles.resultBox}>
            <div style={styles.resultHeader}>
              <strong>Yükleme Tamamlandı</strong>
            </div>
            <div style={styles.resultStats}>
              <div style={styles.stat}>
                <span style={styles.statNum}>{importResult.totalRows}</span>
                <span style={styles.statLabel}>Toplam Satır</span>
              </div>
              <div style={styles.stat}>
                <span style={{ ...styles.statNum, color: '#2e7d32' }}>{importResult.created}</span>
                <span style={styles.statLabel}>Oluşturuldu</span>
              </div>
              <div style={styles.stat}>
                <span style={{ ...styles.statNum, color: '#e65100' }}>{importResult.skipped}</span>
                <span style={styles.statLabel}>Atlandı</span>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div style={styles.errorList}>
                <strong style={{ fontSize: 13 }}>Hatalar:</strong>
                {importResult.errors.map((err, i) => (
                  <div key={i} style={styles.errorItem}>
                    Satır {err.row}: {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kullanıcı Tablosu */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ad Soyad</th>
                <th style={styles.th}>E-posta</th>
                <th style={styles.th}>Birim</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Paydaş Grubu</th>
                <th style={styles.th}>Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '40px 16px' }}>
                    Henüz kullanıcı bulunmuyor. CSV dosyası yükleyerek başlayın.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{user.name || '—'}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.department || '—'}</td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{roleLabels[user.role] || user.role}</span>
                    </td>
                    <td style={styles.td}>{stakeholderLabels[user.stakeholderGroup] || user.stakeholderGroup}</td>
                    <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {pagination && pagination.totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={{
                ...styles.pageBtn,
                opacity: pagination.page <= 1 ? 0.4 : 1,
              }}
            >
              Önceki
            </button>
            <span style={{ fontSize: 14, color: '#666' }}>
              {pagination.page} / {pagination.totalPages} ({pagination.total} kullanıcı)
            </span>
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              style={{
                ...styles.pageBtn,
                opacity: pagination.page >= pagination.totalPages ? 0.4 : 1,
              }}
            >
              Sonraki
            </button>
          </div>
        )}

        {pagination && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#999', marginTop: 8 }}>
            Toplam {pagination.total} kullanıcı
          </p>
        )}
      </div>
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
    maxWidth: 960,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    margin: '0 0 4px',
    color: '#0F1D2F',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    margin: 0,
  },
  uploadSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 20,
  },
  uploadInfo: {
    fontSize: 15,
    color: '#0F1D2F',
  },
  uploadActions: {
    display: 'flex',
    gap: 12,
  },
  uploadBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#2E86AB',
    border: 'none',
    borderRadius: 8,
  },
  code: {
    background: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '16px 20px',
    color: '#991b1b',
    fontSize: 14,
    marginBottom: 20,
  },
  resultBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 20,
  },
  resultHeader: {
    fontSize: 15,
    color: '#166534',
    marginBottom: 16,
  },
  resultStats: {
    display: 'flex',
    gap: 32,
    marginBottom: 12,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  statNum: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0F1D2F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  errorList: {
    marginTop: 12,
    padding: '12px 16px',
    background: '#fff5f5',
    borderRadius: 6,
    fontSize: 13,
    color: '#991b1b',
  },
  errorItem: {
    padding: '4px 0',
  },
  tableContainer: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  },
  th: {
    textAlign: 'left' as const,
    padding: '12px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    borderBottom: '1px solid #e0e0e0',
    background: '#fafafa',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    color: '#0F1D2F',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 500,
    background: '#e8f4fd',
    color: '#2E86AB',
    borderRadius: 12,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  pageBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
    background: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
