import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, JetBrains_Mono, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Toaster } from '@/components/ui/toaster';

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CVF-QA | Kurumsal Kültür Değerlendirme Platformu',
    template: '%s | CVF-QA',
  },
  description: 'Yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cvf-qa.com.tr'),
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'CVF-QA',
    title: 'CVF-QA | Kurumsal Kültür Değerlendirme Platformu',
    description: 'Yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVF-QA | Kurumsal Kültür Değerlendirme Platformu',
    description: 'Yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cvf-qa.com.tr';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'CVF-QA',
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description: 'Yükseköğretim kurumları için bütünleşik kurumsal kültür değerlendirme ve YÖKAK akreditasyon destek platformu.',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'destek@cvf-qa.com.tr',
        contactType: 'customer support',
        availableLanguage: 'Turkish',
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'TR',
        addressLocality: 'İstanbul',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'CVF-QA',
      description: 'Yükseköğretim kurumları için kurumsal kültür değerlendirme platformu. 6 bilimsel ölçek, YÖKAK kanıt dosyası, 360° liderlik analizi.',
      url: baseUrl,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'TRY',
        availability: 'https://schema.org/InStock',
      },
      creator: { '@id': `${baseUrl}/#organization` },
      featureList: 'OCAI+ Kültür Profili, QCI-TR Kalite Kültürü, MSAI-YÖ 360° Liderlik, UWES-TR Çalışan Bağlılığı, PKE Paydaş Katılımı, SPU Stratejik Plan Uyumu',
      inLanguage: 'tr',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="canonical" href={process.env.NEXT_PUBLIC_APP_URL || 'https://cvf-qa.com.tr'} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${inter.variable} min-h-screen bg-background font-body antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
