'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const MOCK_CAMPAIGNS = [
  { id: '1', name: '2025-2026 Kurumsal Kültür Değerlendirmesi', status: 'ACTIVE', modules: ['OCAI+', 'QCI', 'UWES', 'PKE', 'SPU'], invited: 450, completed: 328, responseRate: 73 },
  { id: '2', name: '360° Liderlik Değerlendirmesi — Dekanlık', status: 'ACTIVE', modules: ['360°'], invited: 35, completed: 22, responseRate: 63 },
  { id: '3', name: '2024-2025 Bahar Dönemi', status: 'COMPLETED', modules: ['OCAI+', 'QCI'], invited: 380, completed: 312, responseRate: 82 },
];

export function DashboardOverview() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kadir Has Üniversitesi</p>
        </div>
        <Button>+ Yeni Kampanya</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Aktif Kampanya', value: '2', icon: '🎯' },
          { label: 'Toplam Yanıt', value: '847', icon: '📝' },
          { label: 'Ort. Yanıt Oranı', value: '%73', icon: '📈' },
          { label: 'Üretilen Rapor', value: '12', icon: '📊' },
        ].map((s) => (
          <Card key={s.label} className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5">
              <span className="text-2xl">{s.icon}</span>
              <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaigns */}
      <Card>
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-foreground">Kampanyalar</h2>
        </div>
        <div className="divide-y">
          {MOCK_CAMPAIGNS.map((c) => (
            <div key={c.id} className="cursor-pointer px-6 py-4 transition-colors hover:bg-muted/30" onClick={() => setSelected(c.id === selected ? null : c.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{c.name}</h3>
                    <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                      {c.status === 'ACTIVE' ? 'Aktif' : 'Tamamlandı'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {c.modules.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">%{c.responseRate}</p>
                  <p className="text-xs text-muted-foreground">{c.completed}/{c.invited}</p>
                </div>
              </div>
              {selected === c.id && (
                <div className="mt-4 flex gap-2 border-t border-dashed pt-4">
                  <Button size="sm">Rapor Üret</Button>
                  <Button size="sm" variant="accent">Hatırlat</Button>
                  <Button size="sm" variant="outline">Detaylar</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
