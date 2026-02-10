'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Giriş başarısız');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.data.accessToken);
      router.push('/dashboard');
    } catch {
      setError('Sunucuya bağlanılamadı');
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logo}>QA</div>
        <h1 style={styles.title}>CVF-QA</h1>
        <p style={styles.subtitle}>Kurumsal Kültür Değerlendirme Platformu</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>E-posta</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@kurum.edu.tr"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Şifre</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 karakter"
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e0e0e0',
    padding: '48px 40px',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #2E86AB, #3A9BC5)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    margin: '0 0 4px',
    color: '#0F1D2F',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    margin: '0 0 32px',
  },
  form: {
    textAlign: 'left',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    padding: '12px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #2E86AB, #3A9BC5)',
    border: 'none',
    borderRadius: 8,
  },
};
