'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard,
  Send,
  BarChart3,
  Users2,
  Building2,
  UserSquare2,
  Layers,
  Target,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Settings
} from 'lucide-react';

const MiniSphere = dynamic(
  () => import('@/components/marketing/mini-sphere').then((m) => m.MiniSphere),
  { ssr: false, loading: () => <div style={{ width: 40, height: 40 }} /> }
);

const mainLinks = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Kampanyalar', icon: Send },
  { href: '/dashboard/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/dashboard/360', label: '360° Geri Bildirim', icon: UserSquare2 },
  { href: '/dashboard/gap-analysis', label: 'Gap Analizi', icon: Target },
];

const organizationLinks = [
  { href: '/dashboard/departments', label: 'Birimler', icon: Building2 },
  { href: '/dashboard/stakeholders', label: 'Paydaşlar', icon: Users2 },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: ShieldCheck },
];

const moduleLinks = [
  { href: '/survey/ocai', label: 'OCAI Modülü' },
  { href: '/survey/qci', label: 'QCI Modülü' },
  { href: '/survey/uwes', label: 'UWES Modülü' },
  { href: '/survey/pke', label: 'PKE Modülü' },
  { href: '/survey/spu', label: 'SPU Modülü' },
];

const SAGE_GREEN = '#b2ac88';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('token');
    router.replace('/auth/login');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#e5e7eb] bg-white transition-transform">
      <div className="flex h-full flex-col px-4 py-6">
        {/* Logo */}
        <div className="mb-8 px-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex-shrink-0" style={{ width: 40, height: 40 }}>
              <MiniSphere />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">CVF-QA</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          {/* Main Section */}
          <div>
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Platform
            </div>
            <div className="space-y-1">
              {mainLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive(link.href)
                      ? "bg-slate-50 text-slate-900 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <link.icon 
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      isActive(link.href) ? "text-[#b2ac88]" : "text-slate-400 group-hover:text-[#b2ac88]"
                    )}
                    style={isActive(link.href) ? { color: SAGE_GREEN } : {}}
                  />
                  {link.label}
                  {isActive(link.href) && (
                    <div 
                      className="ml-auto h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: SAGE_GREEN }}
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Organization Section */}
          <div>
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kurum Yönetimi
            </div>
            <div className="space-y-1">
              {organizationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive(link.href)
                      ? "bg-slate-50 text-slate-900 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <link.icon 
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      isActive(link.href) ? "text-[#b2ac88]" : "text-slate-400 group-hover:text-[#b2ac88]"
                    )}
                    style={isActive(link.href) ? { color: SAGE_GREEN } : {}}
                  />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Modules Section */}
          <div>
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Modüller
            </div>
            <div className="space-y-1">
              {moduleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {link.label}
                  <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            Çıkış Yap
          </button>
          
          <div className="mt-4 flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
              FC
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">Fatih Can</p>
              <p className="text-[10px] text-slate-400 truncate">Yönetici</p>
            </div>
            <Settings className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>
        </div>
      </div>
      
      {/* Structural Line (AegisAI Style) */}
      <div className="absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent opacity-50" />
    </aside>
  );
}
