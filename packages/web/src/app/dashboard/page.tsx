'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Send, 
  BarChart3, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = 'http://localhost:3001';
const SAGE_GREEN = '#b2ac88';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stakeholderGroup: string;
  organization: { id: string; name: string };
  department: { id: string; name: string } | null;
  lastLoginAt: string;
  createdAt: string;
}

interface DashboardStats {
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalResponses: number;
    avgResponseRate: number;
  };
  dailyTrend: { date: string; count: number }[];
  activeCampaigns: { id: string; name: string; totalInvited: number; totalResponses: number; rate: number }[];
  latestResponses: { id: string; campaignName: string; completedAt: string; modules: string[] }[];
}

const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI', M2_QCI: 'QCI', M4_UWES: 'UWES', M5_PKE: 'PKE', M6_SPU: 'SPU',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/auth/me`, { headers }).then((r) => r.json()),
      fetch(`${API}/analytics/dashboard`, { headers }).then((r) => r.json()).catch(() => ({ data: null })),
    ])
      .then(([userJson, dashJson]) => {
        if (!userJson.data) {
          localStorage.removeItem('token');
          router.replace('/auth/login');
          return;
        }
        setUser(userJson.data);
        setDashboard(dashJson.data || null);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/auth/login');
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#b2ac88]" />
        <p className="text-sm font-medium text-slate-500">Sistem verileri hazırlanıyor...</p>
      </div>
    );
  }

  if (!user) return null;

  const s = dashboard?.stats;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Context */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b2ac88]">
          <div className="h-1 w-1 rounded-full bg-[#b2ac88]" />
          Yönetim Paneli
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Hoş geldiniz{user.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-sm text-slate-500 font-medium">{user.organization.name} — Kalite Güvence ve Akreditasyon Takibi</p>
      </div>

      {/* 4 Stats Cards */}
      {s && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            label="Toplam Kampanya" 
            value={s.totalCampaigns} 
            icon={Send} 
            trend="+2 bu ay"
          />
          <StatCard 
            label="Aktif Kampanya" 
            value={s.activeCampaigns} 
            icon={Calendar}
            status="active"
          />
          <StatCard 
            label="Toplam Yanıt" 
            value={s.totalResponses} 
            icon={Users}
            trend="+124 yeni"
          />
          <StatCard 
            label="Ort. Yanıt Oranı" 
            value={`%${s.avgResponseRate}`} 
            icon={TrendingUp}
            isPercentage
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Daily Trend Chart (Left/Main) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Yanıt Trendi</h3>
                <p className="text-xs font-medium text-slate-400">Son 7 günlük katılım yoğunluğu</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                GÜNLÜK VERİ
              </div>
            </div>

            <div className="flex items-end gap-3 h-48">
              {dashboard?.dailyTrend.map((d) => {
                const maxCount = Math.max(...dashboard.dailyTrend.map((t) => t.count), 1);
                const height = Math.max((d.count / maxCount) * 100, 8);
                const dayLabel = new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' });
                return (
                  <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-3">
                    <div 
                      className="w-full rounded-xl transition-all duration-500 ease-out group-hover:opacity-80"
                      style={{ 
                        height: `${height}%`, 
                        backgroundColor: d.count > 0 ? SAGE_GREEN : '#f1f5f9',
                        boxShadow: d.count > 0 ? `0 4px 12px ${SAGE_GREEN}40` : 'none'
                      }} 
                    />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-slate-900">{d.count}</span>
                      <span className="text-[10px] font-medium uppercase text-slate-400">{dayLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Campaigns Table */}
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md overflow-hidden">
            <div className="border-b border-slate-50 p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Aktif Kampanyalar</h3>
              <button className="text-[10px] font-bold uppercase tracking-widest text-[#b2ac88] hover:underline">
                Tümünü Gör
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kampanya Adı</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Hedef</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Katılım</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Performans</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.activeCampaigns.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => router.push(`/dashboard/campaigns/${c.id}`)} 
                      className="group cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-bold text-slate-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-500">{c.totalInvited}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-500">{c.totalResponses}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#b2ac88]/10 px-3 py-1 text-[11px] font-bold text-[#b2ac88]">
                          %{c.rate}
                          <ArrowUpRight className="h-3 w-3" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Style (Right side of page) - Latest Activity */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="mb-6 text-lg font-bold text-slate-900">Son Aktiviteler</h3>
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-[1px] before:bg-slate-100">
              {dashboard?.latestResponses.map((r) => (
                <div key={r.id} className="relative pl-8 group">
                  <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-200 group-hover:bg-[#b2ac88] transition-colors shadow-sm" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#b2ac88] transition-colors">
                      Yeni Yanıt Alındı
                    </span>
                    <p className="text-[11px] font-medium text-slate-400 truncate">
                      {r.campaignName}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {r.modules.map((m) => (
                        <span key={m} className="rounded-md bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase border border-slate-100">
                          {MODULE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400">
                      <BarChart3 className="h-3 w-3" />
                      {r.completedAt ? new Date(r.completedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-200 overflow-hidden relative group">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#b2ac88]/20 blur-2xl group-hover:bg-[#b2ac88]/30 transition-all duration-700" />
            <div className="relative z-10">
              <h4 className="text-sm font-bold uppercase tracking-widest text-[#b2ac88]">Hızlı Erişim</h4>
              <p className="mt-2 text-xl font-bold">Raporlar Hazır</p>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-medium">
                Son kampanya analizleri tamamlandı. Birim bazlı raporları şimdi inceleyin.
              </p>
              <button className="mt-6 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-white/90">
                Raporlara Git
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  status,
  isPercentage 
}: { 
  label: string; 
  value: string | number; 
  icon: any;
  trend?: string;
  status?: 'active' | 'idle';
  isPercentage?: boolean;
}) {
  return (
    <div className="group relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <div 
          className="flex h-10 w-10 items-center justify-center rounded-2xl transition-colors duration-300"
          style={{ backgroundColor: `${SAGE_GREEN}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: SAGE_GREEN }} />
        </div>
        {status === 'active' && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            AKTİF
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{value}</span>
          {trend && (
            <span className="text-[10px] font-bold text-[#b2ac88]">
              {trend}
            </span>
          )}
        </div>
      </div>
      
      {/* Structural accent */}
      <div className="absolute bottom-4 right-6 opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowUpRight className="h-4 w-4 text-slate-200" />
      </div>
    </div>
  );
}
