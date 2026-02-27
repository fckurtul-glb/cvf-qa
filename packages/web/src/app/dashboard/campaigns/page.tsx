'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Users,
  BarChart3,
  ArrowUpRight,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = 'http://localhost:3001';
const SAGE_GREEN = '#b2ac88';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  modules: string[];
  targetGroups: string[];
  startedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  totalInvited: number;
  totalResponses: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Taslak', color: '#64748b', bg: '#f1f5f9' },
  SCHEDULED: { label: 'Planlandı', color: '#b45309', bg: '#fef3c7' },
  ACTIVE: { label: 'Aktif', color: '#059669', bg: '#ecfdf5' },
  PAUSED: { label: 'Duraklatıldı', color: '#dc2626', bg: '#fef2f2' },
  COMPLETED: { label: 'Tamamlandı', color: '#2563eb', bg: '#eff6ff' },
  ARCHIVED: { label: 'Arşivlendi', color: '#475569', bg: '#f8fafc' },
};

const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI',
  M2_QCI: 'QCI',
  M3_MSAI: 'MSAI',
  M4_UWES: 'UWES',
  M5_PKE: 'PKE',
  M6_SPU: 'SPU',
};

export default function CampaignsListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setCampaigns(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#b2ac88]" />
        <p className="text-sm font-medium text-slate-500">Kampanyalar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b2ac88]">
            <div className="h-1 w-1 rounded-full bg-[#b2ac88]" />
            Veri Toplama
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Kampanyalar</h1>
          <p className="text-sm text-slate-500 font-medium">Kurum içi değerlendirme ve anket süreçlerini yönetin.</p>
        </div>

        <button 
          onClick={() => router.push('/dashboard/campaigns/new')}
          className="flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: SAGE_GREEN, boxShadow: `0 8px 20px ${SAGE_GREEN}40` }}
        >
          <Plus className="h-4 w-4" />
          Yeni Kampanya
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#b2ac88] transition-colors" />
          <input 
            type="text"
            placeholder="Kampanya adına göre ara..."
            className="w-full rounded-2xl border border-slate-100 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-[#b2ac88]/30 focus:ring-4 focus:ring-[#b2ac88]/5 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Filtrele
          </button>
          <div className="h-8 w-[1px] bg-slate-100" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {campaigns.length} SONUÇ
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kampanya</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Durum</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Metrikler</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Performans</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarih</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
                        <Plus className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">Henüz bir kampanya bulunmuyor.</p>
                      <button 
                        onClick={() => router.push('/dashboard/campaigns/new')}
                        className="text-xs font-bold uppercase tracking-widest text-[#b2ac88] hover:underline"
                      >
                        İLK KAMPANYANI OLUŞTUR
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const status = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;
                  const rate = c.totalInvited > 0
                    ? Math.round((c.totalResponses / c.totalInvited) * 100)
                    : 0;
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => router.push(`/dashboard/campaigns/${c.id}`)} 
                      className="group cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-[#b2ac88] transition-colors">{c.name}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(c.modules as string[]).slice(0, 3).map((m) => (
                              <span key={m} className="rounded-md bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase border border-slate-100">
                                {MODULE_LABELS[m] || m}
                              </span>
                            ))}
                            {c.modules.length > 3 && (
                              <span className="text-[9px] font-bold text-slate-400">+{c.modules.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span 
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                          style={{ color: status.color, backgroundColor: status.bg }}
                        >
                          <div className="h-1 w-1 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            {c.totalInvited}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <Send className="h-3.5 w-3.5 text-slate-400" />
                            {c.totalResponses}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2 items-center">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div 
                              className="h-full transition-all duration-1000 ease-out"
                              style={{ 
                                width: `${rate}%`, 
                                backgroundColor: rate > 70 ? '#10b981' : rate > 30 ? SAGE_GREEN : '#f43f5e' 
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-900">%{rate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {c.closesAt ? new Date(c.closesAt).toLocaleDateString('tr-TR') : 'Açık'}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">BİTİŞ TARİHİ</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
