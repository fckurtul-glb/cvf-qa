import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CVF-QA | Kurumsal Kültür Değerlendirme Platformu',
  description: 'Yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#FBF9F4', color: '#0F1D2F' }}>
        {children}
      </body>
    </html>
  );
}
