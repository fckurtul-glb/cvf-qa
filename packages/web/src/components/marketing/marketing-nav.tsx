'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40);
  });

  return (
    <motion.nav
      className="fixed left-0 right-0 top-0 z-50 backdrop-blur-md transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: scrolled ? 'linear-gradient(135deg, #254E70, #1a3a55)' : 'rgba(255,255,255,0.1)',
              color: 'white',
            }}
          >
            QA
          </div>
          <span
            className="text-lg font-semibold transition-colors duration-300"
            style={{ color: scrolled ? '#1e293b' : 'white' }}
          >
            CVF-QA
          </span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {[
            { href: '/cozumler', label: 'Çözümler' },
            { href: '/fiyatlandirma', label: 'Fiyatlandırma' },
            { href: '/hakkimizda', label: 'Hakkımızda' },
            { href: '/blog', label: 'Blog' },
            { href: '/iletisim', label: 'İletişim' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200"
              style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.65)' }}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/auth/login"
            className="text-sm transition-colors duration-200"
            style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.65)' }}
          >
            Giriş Yap
          </Link>

          <Link
            href="/demo"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{
              background: scrolled ? '#254E70' : 'rgba(142,227,239,0.15)',
              border: scrolled ? 'none' : '1px solid rgba(142,227,239,0.3)',
            }}
          >
            Demo
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
