import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
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
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'CVF-QA',
  description: 'Yükseköğretim kurumları için kurumsal kültür değerlendirme platformu',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://cvf-qa.com.tr',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'TRY',
    availability: 'https://schema.org/InStock',
  },
  creator: {
    '@type': 'Organization',
    name: 'CVF-QA',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://cvf-qa.com.tr',
  },
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
      <body className={`${playfair.variable} ${dmSans.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-body antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
