'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, FileText, TrendingUp, BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchAuthAPI } from '@/hooks/use-api';
import { useAuth } from '@/hooks/use-auth';
import { MODULE_LABELS, CAMPAIGN_STATUS_MAP } from '@/lib/constants';

interface Campaign {
  id: string;
  name: string;
  status: string;
  modules: string[];
  totalInvited: number;
  totalResponses: number;
  startedAt: string | null;
  closesAt: string | null;
}

interface DashboardStats {
  activeCampaigns: number;
  totalResponses: number;
  avgResponseRate: number;
  totalReports: number;
  moduleStats: { name: string; count: number }[];
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
  loading,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  const animatedValue = useCountUp(value);

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        {icon}
        {loading ? (
          <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-2 text-2xl font-bold text-foreground">
            {prefix}
            {animatedValue}
            {suffix}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function CampaignSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            <div className="flex gap-1">
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [campaignsRes, statsRes] = await Promise.all([
          fetchAuthAPI<{ success: boolean; data: Campaign[] }>('/campaigns'),
          fetchAuthAPI<{ success: boolean; data: DashboardStats }>('/campaigns/dashboard-stats'),
        ]);

        if (campaignsRes.success) setCampaigns(campaignsRes.data);
        if (statsRes.success) setStats(statsRes.data);
      } catch (err: any) {
        setError(err.message || 'Veriler yüklenirken hata oluştu');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const moduleChartData =
    stats?.moduleStats.map((m) => ({
      name: MODULE_LABELS[m.name] || m.name,
      rate: m.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.organization?.name ?? ''}
          </p>
        </div>
        <Button>+ Yeni Kampanya</Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="ml-auto"
          >
            Tekrar Dene
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aktif Kampanya"
          value={stats?.activeCampaigns ?? 0}
          icon={<Target className="h-6 w-6 text-accent" />}
          loading={loading}
        />
        <StatCard
          label="Toplam Yanıt"
          value={stats?.totalResponses ?? 0}
          icon={<FileText className="h-6 w-6 text-primary" />}
          loading={loading}
        />
        <StatCard
          label="Ort. Yanıt Oranı"
          value={stats?.avgResponseRate ?? 0}
          prefix="%"
          icon={<TrendingUp className="h-6 w-6 text-secondary" />}
          loading={loading}
        />
        <StatCard
          label="Üretilen Rapor"
          value={stats?.totalReports ?? 0}
          icon={<BarChart3 className="h-6 w-6 text-frosted" />}
          loading={loading}
        />
      </div>

      {/* Module Response Rates Bar Chart */}
      {moduleChartData.length > 0 && (
        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-foreground">Modül Bazlı Yanıt Sayıları</h2>
          </div>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={moduleChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value}`, 'Yanıt']}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="rate" fill="#254E70" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Campaigns */}
      <Card>
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-foreground">Kampanyalar</h2>
        </div>

        {loading ? (
          <CampaignSkeleton />
        ) : campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Target className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              Henüz kampanya oluşturulmamış
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              İlk kampanyanızı oluşturmak için &quot;Yeni Kampanya&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {campaigns.map((c) => {
              const responseRate =
                c.totalInvited > 0
                  ? Math.round((c.totalResponses / c.totalInvited) * 100)
                  : 0;
              const statusConfig = CAMPAIGN_STATUS_MAP[c.status];
              const modules = (c.modules as string[]) ?? [];

              return (
                <div
                  key={c.id}
                  className="cursor-pointer px-6 py-4 transition-colors hover:bg-muted/30"
                  onClick={() => setSelected(c.id === selected ? null : c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{c.name}</h3>
                        {statusConfig && (
                          <Badge
                            variant={statusConfig.variant}
                            className={cn('text-xs', statusConfig.className)}
                          >
                            {statusConfig.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {modules.map((m) => (
                          <Badge key={m} variant="outline" className="text-xs">
                            {MODULE_LABELS[m] || m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">%{responseRate}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.totalResponses}/{c.totalInvited}
                      </p>
                    </div>
                  </div>
                  {selected === c.id && (
                    <div className="mt-4 flex gap-2 border-t border-dashed pt-4">
                      <Button size="sm">Rapor Üret</Button>
                      <Button size="sm" variant="accent">
                        Hatırlat
                      </Button>
                      <Button size="sm" variant="outline">
                        Detaylar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
