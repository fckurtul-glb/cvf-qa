'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/dashboard', label: 'Genel Bakış' },
  { href: '/dashboard/campaigns', label: 'Kampanyalar' },
  { href: '/dashboard/reports', label: 'Raporlar' },
  { href: '/dashboard/360', label: '360°' },
  { href: '/dashboard/gap-analysis', label: 'Gap' },
  { href: '/dashboard/departments', label: 'Birimler' },
  { href: '/dashboard/stakeholders', label: 'Paydaşlar' },
  { href: '/dashboard/users', label: 'Kullanıcılar' },
];

const surveyLinks = [
  { href: '/survey/ocai', label: 'OCAI' },
  { href: '/survey/qci', label: 'QCI' },
  { href: '/survey/uwes', label: 'UWES' },
  { href: '/survey/pke', label: 'PKE' },
  { href: '/survey/spu', label: 'SPU' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem('token');
    router.replace('/auth/login');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const allLinks = [...navLinks, ...surveyLinks];

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-white/10 bg-primary">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-white">
                QA
              </div>
              <span className="text-base font-semibold text-white">CVF-QA</span>
            </Link>

            <div className="ml-4 hidden items-center gap-1 lg:flex">
              {allLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
                    isActive(link.href)
                      ? 'bg-white/12 text-white'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="hidden rounded-md border border-white/20 px-4 py-1.5 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/40 hover:text-white sm:block"
            >
              Çıkış Yap
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Menü"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-white/10 bg-primary p-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive(link.href)
                    ? 'bg-white/12 text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                )}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="mt-2 rounded-md border border-white/20 px-3 py-2 text-left text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/40 hover:text-white"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </>
  );
}
