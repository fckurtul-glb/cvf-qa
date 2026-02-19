'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu, X, Building2 } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  roles?: string[]; // undefined = all authenticated users; otherwise only these roles
  icon?: 'building';
}

// Role-based navigation links
const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Genel Bakış' },
  { href: '/dashboard/campaigns', label: 'Kampanyalar', roles: ['ORG_ADMIN', 'UNIT_ADMIN', 'SUPER_ADMIN'] },
  { href: '/dashboard/reports', label: 'Raporlar', roles: ['ORG_ADMIN', 'UNIT_ADMIN', 'SUPER_ADMIN', 'VIEWER'] },
  { href: '/dashboard/360', label: '360°', roles: ['ORG_ADMIN', 'SUPER_ADMIN'] },
  { href: '/dashboard/gap-analysis', label: 'Gap', roles: ['ORG_ADMIN', 'SUPER_ADMIN'] },
  { href: '/dashboard/departments', label: 'Birimler', roles: ['ORG_ADMIN', 'UNIT_ADMIN', 'SUPER_ADMIN'] },
  { href: '/dashboard/stakeholders', label: 'Paydaşlar', roles: ['ORG_ADMIN', 'SUPER_ADMIN'] },
  // ORG_ADMIN self-service panel — prominent link with icon
  { href: '/dashboard/my-organization', label: 'Kurumum', roles: ['ORG_ADMIN'], icon: 'building' },
  // SUPER_ADMIN system management
  { href: '/dashboard/users', label: 'Kullanıcılar', roles: ['SUPER_ADMIN'] },
  { href: '/dashboard/organizations', label: 'Kurumlar', roles: ['SUPER_ADMIN'] },
];

const surveyLinks: NavLink[] = [
  { href: '/survey/ocai', label: 'OCAI' },
  { href: '/survey/qci', label: 'QCI' },
  { href: '/survey/uwes', label: 'UWES' },
  { href: '/survey/pke', label: 'PKE' },
  { href: '/survey/spu', label: 'SPU' },
];

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: 'Süper Admin',
  ORG_ADMIN: 'Kurum Yöneticisi',
  UNIT_ADMIN: 'Birim Yöneticisi',
  PARTICIPANT: 'Katılımcı',
  VIEWER: 'Görüntüleyici',
};

function getTokenPayload(): { sub: string; org: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const payload = getTokenPayload();
    if (payload?.role) setUserRole(payload.role);
  }, [pathname]); // re-read on route change in case token changes

  function handleLogout() {
    localStorage.removeItem('token');
    router.replace('/auth/login');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function canSee(link: NavLink): boolean {
    if (!link.roles) return true;
    if (!userRole) return false;
    return link.roles.includes(userRole);
  }

  const visibleNavLinks = navLinks.filter(canSee);
  // SUPER_ADMIN doesn't take surveys (they manage them)
  const visibleSurveyLinks = userRole !== 'SUPER_ADMIN' ? surveyLinks : [];
  const allVisibleLinks = [...visibleNavLinks, ...visibleSurveyLinks];

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-white/10 bg-primary">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-xs font-bold text-white">
                QA
              </div>
              <span className="text-base font-semibold text-white">CVF-QA</span>
            </Link>

            {mounted && (
              <div className="ml-2 hidden items-center gap-0.5 lg:flex flex-wrap">
                {allVisibleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-150 flex items-center gap-1',
                      link.icon === 'building'
                        ? isActive(link.href)
                          ? 'bg-white/20 text-white ring-1 ring-white/30'
                          : 'text-white/85 hover:bg-white/12 hover:text-white border border-white/25 mx-1'
                        : isActive(link.href)
                          ? 'bg-white/12 text-white'
                          : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                    )}
                  >
                    {link.icon === 'building' && <Building2 className="w-3.5 h-3.5" />}
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mounted && userRole && (
              <span className="hidden md:inline-block text-xs text-white/50 border border-white/15 rounded-full px-2.5 py-1 whitespace-nowrap">
                {ROLE_DISPLAY[userRole] || userRole}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="hidden rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/40 hover:text-white sm:block whitespace-nowrap"
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
      {mobileOpen && mounted && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-white/10 bg-primary p-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {allVisibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 flex items-center gap-2',
                  isActive(link.href)
                    ? 'bg-white/12 text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                )}
              >
                {link.icon === 'building' && <Building2 className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
            {userRole && (
              <p className="mt-2 text-xs text-white/40 px-3">{ROLE_DISPLAY[userRole] || userRole}</p>
            )}
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
