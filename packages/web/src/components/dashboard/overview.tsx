'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MOCK_CAMPAIGNS = [
  { id: '1', name: '2025-2026 Kurumsal Kültür Değerlendirmesi', status: 'ACTIVE', modules: ['OCAI+', 'QCI', 'UWES', 'PKE', 'SPU'], invited: 450, completed: 328, responseRate: 73 },
  { id: '2', name: '360° Liderlik Değerlendirmesi — Dekanlık', status: 'ACTIVE', modules: ['360°'], invited: 35, completed: 22, responseRate: 63 },
  { id: '3', name: '2024-2025 Bahar Dönemi', status: 'COMPLETED', modules: ['OCAI+', 'QCI'], invited: 380, completed: 312, responseRate: 82 },
];

const moduleResponseData = [
  { name: 'OCAI+', rate: 78 },
  { name: 'QCI-TR', rate: 72 },
  { name: 'UWES-TR', rate: 85 },
  { name: 'PKE', rate: 65 },
  { name: 'SPU', rate: 70 },
];

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

function StatCard({
  label,
  value,
  prefix,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
}) {
  const animatedValue = useCountUp(value);

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        {icon}
        <p className="mt-2 text-2xl font-bold text-foreground">
          {prefix}
          {animatedValue}
          {suffix}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

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
        <StatCard
          label="Aktif Kampanya"
          value={2}
          icon={<Target className="h-6 w-6 text-accent" />}
        />
        <StatCard
          label="Toplam Yanıt"
          value={847}
          icon={<FileText className="h-6 w-6 text-primary" />}
        />
        <StatCard
          label="Ort. Yanıt Oranı"
          value={73}
          prefix="%"
          icon={<TrendingUp className="h-6 w-6 text-secondary" />}
        />
        <StatCard
          label="Üretilen Rapor"
          value={12}
          icon={<BarChart3 className="h-6 w-6 text-frosted" />}
        />
      </div>

      {/* Module Response Rates Bar Chart */}
      <Card>
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-foreground">Modül Bazlı Yanıt Oranları</h2>
        </div>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={moduleResponseData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(v: number) => `%${v}`}
              />
              <Tooltip
                formatter={(value) => [`%${value}`, 'Yanıt Oranı']}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar
                dataKey="rate"
                fill="#254E70"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
