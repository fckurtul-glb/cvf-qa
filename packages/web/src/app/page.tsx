export default function HomePage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, #2E86AB, #3A9BC5)',
          color: 'white', fontWeight: 'bold', fontSize: 24, marginBottom: 16,
        }}>QA</div>
        <h1 style={{ fontSize: 36, margin: '0 0 8px', color: '#0F1D2F' }}>CVF-QA</h1>
        <p style={{ fontSize: 18, color: '#666', margin: 0 }}>Kurumsal Kültür Değerlendirme Platformu</p>
      </div>

      <div style={{
        background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12,
        padding: 24, marginBottom: 24, textAlign: 'center',
      }}>
        <h2 style={{ color: '#2e7d32', margin: '0 0 8px' }}>✅ Faz 0 Tamamlandı</h2>
        <p style={{ margin: 0, color: '#333' }}>Frontend çalışıyor. Bir sonraki adım: Faz 1 — OCAI Anket Motoru</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <StatusCard title="Frontend" url="localhost:3000" status="running" />
        <StatusCard title="API" url="localhost:3001/health" status="check" />
        <StatusCard title="PostgreSQL" url="localhost:5432" status="docker" />
        <StatusCard title="Redis" url="localhost:6379" status="docker" />
        <StatusCard title="Mailpit" url="localhost:8025" status="docker" />
        <StatusCard title="MinIO" url="localhost:9001" status="docker" />
      </div>

      <div style={{ marginTop: 40, background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 16px' }}>📋 Faz 1 Yapılacaklar</h3>
        <ul style={{ lineHeight: 2, paddingLeft: 20 }}>
          <li>Auth sistemi (email + şifre girişi)</li>
          <li>CSV ile personel yükleme</li>
          <li>M1 OCAI ipsatif anket widget&apos;ı (100 puan dağıtma)</li>
          <li>Anket linki üretme ve doldurma akışı</li>
          <li>Yanıtları DB&apos;ye kaydetme</li>
          <li>Basit radar chart sonuç ekranı</li>
        </ul>
      </div>
    </div>
  );
}

function StatusCard({ title, url, status }: { title: string; url: string; status: string }) {
  const color = status === 'running' ? '#2e7d32' : '#1565c0';
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#888' }}>{url}</div>
      <div style={{ fontSize: 11, color, fontWeight: 500, marginTop: 4 }}>
        {status === 'running' ? '● Çalışıyor' : status === 'docker' ? '🐳 Docker' : '🔗 Kontrol Et'}
      </div>
    </div>
  );
}
