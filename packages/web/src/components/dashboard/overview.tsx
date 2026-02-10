'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const MOCK_CAMPAIGNS = [
  { id: '1', name: '2025-2026 Kurumsal Kültür Değerlendirmesi', status: 'ACTIVE', modules: ['OCAI+', 'QCI', 'UWES', 'PKE', 'SPU'], invited: 450, completed: 328, responseRate: 73 },
  { id: '2', name: '360° Liderlik Değerlendirmesi — Dekanlık', status: 'ACTIVE', modules: ['360°'], invited: 35, completed: 22, responseRate: 63 },
  { id: '3', name: '2024-2025 Bahar Dönemi', status: 'COMPLETED', modules: ['OCAI+', 'QCI'], invited: 380, completed: 312, responseRate: 82 },
];

export function DashboardOverview() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 bg-navy min-h-screen p-6 fixed left-0 top-0">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2E86AB] to-[#3A9BC5] flex items-center justify-center text-white font-bold text-xs">QA</div>
          <span className="text-lg font-bold text-white">CVF-QA</span>
        </div>
        <nav className="space-y-1">
          {['📊 Genel Bakış', '📋 Kampanyalar', '👥 Personel', '📄 Raporlar', '⚙️ Ayarlar'].map((item, i) => (
            <button key={item} className={cn('w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm', i === 0 ? 'bg-white/10 text-white font-medium' : 'text-white/50 hover:text-white/80')}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1D2F]">Dashboard</h1>
            <p className="text-sm text-[#0F1D2F]/40 mt-1">Kadir Has Üniversitesi</p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-[#2E86AB] to-[#3A9BC5] text-white text-sm font-semibold rounded-lg">+ Yeni Kampanya</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Aktif Kampanya', value: '2', icon: '🎯' },
            { label: 'Toplam Yanıt', value: '847', icon: '📝' },
            { label: 'Ort. Yanıt Oranı', value: '%73', icon: '📈' },
            { label: 'Üretilen Rapor', value: '12', icon: '📊' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-5 bg-white border">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-2xl font-bold text-[#0F1D2F] mt-2">{s.value}</p>
              <p className="text-xs text-[#0F1D2F]/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b"><h2 className="font-semibold text-[#0F1D2F]">Kampanyalar</h2></div>
          <div className="divide-y">
            {MOCK_CAMPAIGNS.map((c) => (
              <div key={c.id} className="px-6 py-4 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelected(c.id === selected ? null : c.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-[#0F1D2F]">{c.name}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                        {c.status === 'ACTIVE' ? 'Aktif' : 'Tamamlandı'}
                      </span>
                    </div>
                    <div className="flex gap-1">{c.modules.map((m) => <span key={m} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{m}</span>)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#0F1D2F]">%{c.responseRate}</p>
                    <p className="text-xs text-[#0F1D2F]/40">{c.completed}/{c.invited}</p>
                  </div>
                </div>
                {selected === c.id && (
                  <div className="mt-4 pt-4 border-t border-dashed flex gap-2">
                    <button className="px-3 py-1.5 text-xs bg-[#2E86AB] text-white rounded-lg">Rapor Üret</button>
                    <button className="px-3 py-1.5 text-xs bg-[#E8A838] text-[#0F1D2F] rounded-lg">Hatırlat</button>
                    <button className="px-3 py-1.5 text-xs bg-slate-100 text-[#0F1D2F] rounded-lg">Detaylar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
