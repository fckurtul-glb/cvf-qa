'use client';

import { useRouter } from 'next/navigation';

export default function CompletePage() {
  const router = useRouter();

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.icon}>&#10003;</div>
        <h1 style={styles.title}>Teşekkürler!</h1>
        <p style={styles.message}>
          OCAI anketiniz başarıyla kaydedildi. Yanıtlarınız anonim olarak değerlendirilecektir.
        </p>
        <button onClick={() => router.push('/dashboard')} style={styles.btn}>
          Panoya Dön
        </button>
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
    textAlign: 'center' as const,
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 16,
    padding: '48px 40px',
    maxWidth: 440,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#e8f5e9',
    color: '#2e7d32',
    fontSize: 32,
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0F1D2F',
    margin: '0 0 12px',
  },
  message: {
    fontSize: 15,
    color: '#666',
    lineHeight: 1.6,
    margin: '0 0 28px',
  },
  btn: {
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#2E86AB',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
