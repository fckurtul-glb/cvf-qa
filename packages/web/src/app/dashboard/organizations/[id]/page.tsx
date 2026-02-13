'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Mail, UserPlus, XCircle, Clock, ShieldCheck,
  Settings2, MailCheck, Users, BarChart3, Pause, Trash2, RotateCcw, Save,
} from 'lucide-react';

const API = 'http://localhost:3001';

// ── Interfaces ──

interface OrgAdmin {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

interface OrgDetail {
  id: string;
  name: string;
  domain: string;
  packageTier: string;
  isActive: boolean;
  userCount: number;
  campaignCount: number;
  createdAt: string;
  updatedAt: string;
  admins: OrgAdmin[];
  pendingInvites: PendingInvite[];
}

interface Capabilities {
  allowedModules: string[];
  features: {
    assessment360: boolean;
    gapAnalysis: boolean;
    descriptiveAnalytics: boolean;
    departmentComparison: boolean;
    stakeholderComparison: boolean;
  };
  allowedReports: string[];
  limits: {
    maxUsers: number;
    maxCampaigns: number;
    maxParticipantsPerCampaign: number;
  };
}

interface CapabilitiesResponse {
  capabilities: Capabilities;
  tier: string;
  hasOverrides: boolean;
  tierDefaults: Capabilities;
}

interface EmailLog {
  id: string;
  toAddress: string;
  subject: string;
  template: string;
  status: string;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface EmailStats {
  period: string;
  total: number;
  sent: number;
  failed: number;
  queued: number;
  bounced: number;
  byTemplate: Record<string, number>;
}

interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stakeholderGroup: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  department: { id: string; name: string } | null;
}

interface OrgCampaign {
  id: string;
  name: string;
  status: string;
  startedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  _count: { tokens: number; responses: number };
}

// ── Constants ──

const TIER_MAP: Record<string, { label: string; className: string }> = {
  STARTER: { label: 'Starter', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  PROFESSIONAL: { label: 'Professional', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  ENTERPRISE: { label: 'Enterprise', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Sistem Yöneticisi',
  ORG_ADMIN: 'Kurum Yöneticisi',
  UNIT_ADMIN: 'Birim Yöneticisi',
  PARTICIPANT: 'Katılımcı',
  VIEWER: 'Görüntüleyici',
};

const ALL_MODULES = [
  { code: 'M1_OCAI', name: 'M1 — OCAI+' },
  { code: 'M2_QCI', name: 'M2 — QCI-TR' },
  { code: 'M3_MSAI', name: 'M3 — MSAI-YÖ (360°)' },
  { code: 'M4_UWES', name: 'M4 — UWES-TR' },
  { code: 'M5_PKE', name: 'M5 — PKE' },
  { code: 'M6_SPU', name: 'M6 — SPU' },
];

const ALL_REPORTS = [
  { code: 'INSTITUTIONAL', name: 'Kurumsal Rapor' },
  { code: 'DEPARTMENT', name: 'Birim Raporu' },
  { code: 'INDIVIDUAL_360', name: 'Bireysel 360° Rapor' },
  { code: 'YOKAK_EVIDENCE', name: 'YÖKAK Kanıt Raporu' },
  { code: 'COMPARATIVE', name: 'Karşılaştırmalı Rapor' },
];

const FEATURE_LABELS: Record<string, string> = {
  assessment360: '360° Değerlendirme',
  gapAnalysis: 'Açık Analizi',
  descriptiveAnalytics: 'Betimsel Analitik',
  departmentComparison: 'Birim Karşılaştırma',
  stakeholderComparison: 'Paydaş Karşılaştırma',
};

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  SENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  BOUNCED: 'bg-orange-100 text-orange-700 border-orange-200',
};

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-purple-100 text-purple-700 border-purple-200',
  ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TEMPLATE_LABELS: Record<string, string> = {
  'survey-invitation': 'Anket Daveti',
  'survey-reminder': 'Anket Hatırlatma',
  '360-invitation': '360° Daveti',
  'org-invitation': 'Kurum Daveti',
  'report-ready': 'Rapor Hazır',
};

// ── Helper ──

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

// ── Main Component ──

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ORG_ADMIN');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchOrg = useCallback(() => {
    const token = getToken();
    if (!token) { router.replace('/auth/login'); return; }

    fetch(`${API}/organizations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setOrg(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);

    try {
      const res = await fetch(`${API}/organizations/${id}/invite`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();

      if (json.success) {
        setInviteResult({ success: true, message: 'Davet gönderildi!', url: json.data.registerUrl });
        setInviteEmail('');
        fetchOrg();
      } else {
        setInviteResult({ success: false, message: json.error?.message || 'Hata oluştu' });
      }
    } catch {
      setInviteResult({ success: false, message: 'Sunucu hatası' });
    }
    setInviteLoading(false);
  }

  async function handleDeactivate() {
    if (!confirm('Bu kurumu pasifleştirmek istediğinize emin misiniz? Kurum kullanıcıları giriş yapamayacak.')) return;
    setDeactivating(true);

    try {
      const res = await fetch(`${API}/organizations/${id}/deactivate`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setOrg((prev) => prev ? { ...prev, isActive: false } : prev);
      }
    } catch { /* ignore */ }
    setDeactivating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Kurum bilgileri yükleniyor...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Kurum bulunamadı.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/organizations')}>Geri Dön</Button>
      </div>
    );
  }

  const tier = TIER_MAP[org.packageTier] || TIER_MAP.STARTER;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/organizations')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
        <Badge variant={org.isActive ? 'secondary' : 'destructive'} className={org.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
          {org.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="capabilities">Yetenekler</TabsTrigger>
          <TabsTrigger value="email-logs">E-posta Logları</TabsTrigger>
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="campaigns">Kampanyalar</TabsTrigger>
        </TabsList>

        {/* ══ TAB 1: GENEL ══ */}
        <TabsContent value="general" className="space-y-6">
          <GeneralTab
            org={org}
            tier={tier}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            inviteLoading={inviteLoading}
            inviteResult={inviteResult}
            deactivating={deactivating}
            onInvite={handleInvite}
            onDeactivate={handleDeactivate}
            onRevokeInvite={async (inviteId: string) => {
              if (!confirm('Bu daveti iptal etmek istediğinize emin misiniz?')) return;
              try {
                const res = await fetch(`${API}/organizations/${id}/invites/${inviteId}`, {
                  method: 'DELETE',
                  headers: authHeaders(),
                });
                const json = await res.json();
                if (json.success) fetchOrg();
              } catch { /* ignore */ }
            }}
          />
        </TabsContent>

        {/* ══ TAB 2: YETENEKLER ══ */}
        <TabsContent value="capabilities">
          <CapabilitiesTab orgId={id} />
        </TabsContent>

        {/* ══ TAB 3: E-POSTA LOGLARI ══ */}
        <TabsContent value="email-logs">
          <EmailLogsTab orgId={id} />
        </TabsContent>

        {/* ══ TAB 4: KULLANICILAR ══ */}
        <TabsContent value="users">
          <UsersTab orgId={id} />
        </TabsContent>

        {/* ══ TAB 5: KAMPANYALAR ══ */}
        <TabsContent value="campaigns">
          <CampaignsTab orgId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB 1: GENEL
// ════════════════════════════════════════════════════

function GeneralTab({
  org, tier, inviteEmail, setInviteEmail, inviteRole, setInviteRole,
  inviteLoading, inviteResult, deactivating, onInvite, onDeactivate, onRevokeInvite,
}: {
  org: OrgDetail;
  tier: { label: string; className: string };
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: string;
  setInviteRole: (v: string) => void;
  inviteLoading: boolean;
  inviteResult: { success: boolean; message: string; url?: string } | null;
  deactivating: boolean;
  onInvite: (e: React.FormEvent) => void;
  onDeactivate: () => void;
  onRevokeInvite: (inviteId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Kurum Bilgileri */}
      <Card>
        <CardHeader><CardTitle>Kurum Bilgileri</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Domain</p>
              <p className="font-medium">{org.domain}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paket</p>
              <Badge variant="outline" className={tier.className}>{tier.label}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Toplam Kullanıcı</p>
              <p className="font-medium">{org.userCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kampanya Sayısı</p>
              <p className="font-medium">{org.campaignCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Oluşturulma</p>
              <p className="font-medium">{new Date(org.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Son Güncelleme</p>
              <p className="font-medium">{new Date(org.updatedAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kurum Yöneticileri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Kurum Yöneticileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {org.admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Bu kuruma henüz yönetici atanmamış. Aşağıdaki formdan davet gönderebilirsiniz.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad / E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="hidden sm:table-cell">Son Giriş</TableHead>
                  <TableHead className="hidden sm:table-cell">Kayıt Tarihi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{admin.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={admin.role === 'ORG_ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                        {ROLE_LABELS[admin.role] || admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={admin.isActive ? 'secondary' : 'destructive'} className={admin.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                        {admin.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('tr-TR') : 'Hiç giriş yapmadı'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(admin.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bekleyen Davetler */}
      {org.pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Bekleyen Davetler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="hidden sm:table-cell">Son Geçerlilik</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[invite.role] || invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={invite.isExpired ? 'destructive' : 'outline'} className={invite.isExpired ? '' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                        {invite.isExpired ? 'Süresi Dolmuş' : 'Bekliyor'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {!invite.isExpired && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onRevokeInvite(invite.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Davet Gönder */}
      {org.isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Yönetici Davet Et
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="E-posta adresi"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ORG_ADMIN">Kurum Yöneticisi</option>
                <option value="UNIT_ADMIN">Birim Yöneticisi</option>
              </select>
              <Button type="submit" disabled={inviteLoading}>
                <Mail className="w-4 h-4 mr-2" />
                {inviteLoading ? 'Gönderiliyor...' : 'Davet Gönder'}
              </Button>
            </form>

            {inviteResult && (
              <div className={`mt-4 text-sm rounded-lg px-4 py-3 ${inviteResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <p>{inviteResult.message}</p>
                {inviteResult.url && (
                  <p className="mt-2 text-xs break-all opacity-75">Kayıt linki: {inviteResult.url}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tehlikeli İşlemler */}
      {org.isActive && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Tehlikeli İşlemler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Kurumu pasifleştirdiğinizde, bu kuruma ait kullanıcılar giriş yapamaz ve yeni kampanya oluşturulamaz.
            </p>
            <Button variant="destructive" onClick={onDeactivate} disabled={deactivating}>
              {deactivating ? 'Pasifleştiriliyor...' : 'Kurumu Pasifleştir'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB 2: YETENEKLER
// ════════════════════════════════════════════════════

function CapabilitiesTab({ orgId }: { orgId: string }) {
  const [data, setData] = useState<CapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Capabilities | null>(null);

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/organizations/${orgId}/capabilities`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setForm(structuredClone(json.data.capabilities));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchCapabilities(); }, [fetchCapabilities]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/organizations/${orgId}/capabilities`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setData((prev) => prev ? { ...prev, capabilities: json.data.capabilities, hasOverrides: true } : prev);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleReset() {
    if (!confirm('Tüm özelleştirmeleri sıfırlayıp tier varsayılanlarına dönmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`${API}/organizations/${orgId}/capabilities`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setData((prev) => prev ? { ...prev, capabilities: json.data.capabilities, hasOverrides: false } : prev);
        setForm(structuredClone(json.data.capabilities));
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse">Yetenekler yükleniyor...</div>;
  if (!data || !form) return <div className="py-8 text-center text-muted-foreground">Yetenek bilgisi alınamadı.</div>;

  const isOverridden = (path: string): boolean => {
    if (!data.hasOverrides) return false;
    // Simple check: compare current form value vs tier default
    const parts = path.split('.');
    let currentVal: any = form;
    let defaultVal: any = data.tierDefaults;
    for (const p of parts) {
      currentVal = currentVal?.[p];
      defaultVal = defaultVal?.[p];
    }
    return JSON.stringify(currentVal) !== JSON.stringify(defaultVal);
  };

  const overrideBorder = (path: string) => isOverridden(path) ? 'ring-2 ring-blue-300' : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Yetenek Yönetimi</h3>
          {data.hasOverrides && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Özelleştirilmiş</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Tier Varsayılanına Sıfırla
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Modüller */}
      <Card className={overrideBorder('allowedModules')}>
        <CardHeader><CardTitle className="text-base">İzin Verilen Modüller</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_MODULES.map((m) => (
              <label key={m.code} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowedModules.includes(m.code)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setForm({ ...form, allowedModules: [...form.allowedModules, m.code] });
                    } else {
                      setForm({ ...form, allowedModules: form.allowedModules.filter((c) => c !== m.code) });
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{m.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Özellikler */}
      <Card className={overrideBorder('features')}>
        <CardHeader><CardTitle className="text-base">Özellikler</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form.features as any)[key]}
                  onChange={(e) => {
                    setForm({ ...form, features: { ...form.features, [key]: e.target.checked } });
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rapor Türleri */}
      <Card className={overrideBorder('allowedReports')}>
        <CardHeader><CardTitle className="text-base">İzin Verilen Rapor Türleri</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_REPORTS.map((r) => (
              <label key={r.code} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowedReports.includes(r.code)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setForm({ ...form, allowedReports: [...form.allowedReports, r.code] });
                    } else {
                      setForm({ ...form, allowedReports: form.allowedReports.filter((c) => c !== r.code) });
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{r.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Limitler */}
      <Card className={overrideBorder('limits')}>
        <CardHeader><CardTitle className="text-base">Limitler</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Maks. Kullanıcı</label>
              <input
                type="number"
                value={form.limits.maxUsers}
                onChange={(e) => setForm({ ...form, limits: { ...form.limits, maxUsers: parseInt(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">-1 = sınırsız</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Maks. Kampanya</label>
              <input
                type="number"
                value={form.limits.maxCampaigns}
                onChange={(e) => setForm({ ...form, limits: { ...form.limits, maxCampaigns: parseInt(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">-1 = sınırsız</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Maks. Katılımcı / Kampanya</label>
              <input
                type="number"
                value={form.limits.maxParticipantsPerCampaign}
                onChange={(e) => setForm({ ...form, limits: { ...form.limits, maxParticipantsPerCampaign: parseInt(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB 3: E-POSTA LOGLARI
// ════════════════════════════════════════════════════

function EmailLogsTab({ orgId }: { orgId: string }) {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set('status', statusFilter);
    if (templateFilter) params.set('template', templateFilter);

    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/organizations/${orgId}/email-logs?${params}`, { headers: authHeaders() }),
        fetch(`${API}/organizations/${orgId}/email-logs/stats`, { headers: authHeaders() }),
      ]);
      const logsJson = await logsRes.json();
      const statsJson = await statsRes.json();

      if (logsJson.success) {
        setLogs(logsJson.data.logs);
        setTotal(logsJson.data.pagination.total);
      }
      if (statsJson.success) setStats(statsJson.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [orgId, page, statusFilter, templateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Toplam (30 gün)</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Gönderilen</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.sent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Başarısız</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Kuyrukta</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.queued}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Tüm Durumlar</option>
          <option value="QUEUED">Kuyrukta</option>
          <option value="SENT">Gönderildi</option>
          <option value="FAILED">Başarısız</option>
          <option value="BOUNCED">Geri Döndü</option>
        </select>
        <select
          value={templateFilter}
          onChange={(e) => { setTemplateFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Tüm Şablonlar</option>
          <option value="survey-invitation">Anket Daveti</option>
          <option value="survey-reminder">Anket Hatırlatma</option>
          <option value="360-invitation">360° Daveti</option>
          <option value="org-invitation">Kurum Daveti</option>
          <option value="report-ready">Rapor Hazır</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">E-posta logu bulunamadı.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Alıcı</TableHead>
                  <TableHead>Konu</TableHead>
                  <TableHead>Şablon</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-sm font-mono max-w-[200px] truncate">{log.toAddress}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{TEMPLATE_LABELS[log.template] || log.template}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={STATUS_COLORS[log.status] || ''}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Toplam {total} kayıt, sayfa {page}/{totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Önceki</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Sonraki</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB 4: KULLANICILAR
// ════════════════════════════════════════════════════

function UsersTab({ orgId }: { orgId: string }) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (roleFilter) params.set('role', roleFilter);
    if (activeFilter) params.set('isActive', activeFilter);

    try {
      const res = await fetch(`${API}/organizations/${orgId}/users?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
        setTotal(json.data.pagination.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [orgId, page, roleFilter, activeFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleToggle(userId: string, currentActive: boolean) {
    setToggling(userId);
    try {
      const res = await fetch(`${API}/organizations/${orgId}/users/${userId}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentActive } : u));
      }
    } catch { /* ignore */ }
    setToggling(null);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Tüm Roller</option>
          <option value="ORG_ADMIN">Kurum Yöneticisi</option>
          <option value="UNIT_ADMIN">Birim Yöneticisi</option>
          <option value="PARTICIPANT">Katılımcı</option>
          <option value="VIEWER">Görüntüleyici</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Tüm Durumlar</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
        <div className="ml-auto text-sm text-muted-foreground self-center">
          Toplam {total} kullanıcı
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Kullanıcı bulunamadı.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad / E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="hidden sm:table-cell">Son Giriş</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{user.department?.name || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.isActive ? 'secondary' : 'destructive'} className={user.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={user.isActive ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={toggling === user.id}
                        onClick={() => handleToggle(user.id, user.isActive)}
                      >
                        {toggling === user.id ? '...' : user.isActive ? 'Deaktive Et' : 'Aktifleştir'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Sayfa {page}/{totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Önceki</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Sonraki</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB 5: KAMPANYALAR
// ════════════════════════════════════════════════════

function CampaignsTab({ orgId }: { orgId: string }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      // Use the org detail to get campaigns or a dedicated endpoint
      // For now we use a simple query via the campaigns data available through org
      const res = await fetch(`${API}/organizations/${orgId}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        // We need to fetch campaigns separately. Let's use the campaigns count + a custom approach
        // Since there's no separate campaigns list endpoint for org, we'll show basic info
      }
    } catch { /* ignore */ }

    // Fetch campaigns from the org's perspective via Prisma — we need an API endpoint
    // For now, let's fetch the org detail which includes campaignCount,
    // and we can list campaigns from the SurveyCampaign model
    try {
      const res = await fetch(`${API}/organizations/${orgId}/campaigns?page=1&limit=50`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.data.campaigns);
      }
    } catch {
      // Fallback: campaigns endpoint might not exist yet in a standard route
      setCampaigns([]);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  async function handlePause(campaignId: string) {
    if (!confirm('Bu kampanyayı duraklatmak istediğinize emin misiniz?')) return;
    setPausing(campaignId);
    try {
      const res = await fetch(`${API}/organizations/${orgId}/campaigns/${campaignId}/pause`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, status: 'PAUSED' } : c));
      }
    } catch { /* ignore */ }
    setPausing(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Kampanyalar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Kampanya bulunamadı.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kampanya Adı</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead className="text-center">Davet</TableHead>
                  <TableHead className="text-center">Yanıt</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => {
                  const tokenCount = c._count?.tokens ?? c.tokenCount ?? 0;
                  const responseCount = c._count?.responses ?? c.responseCount ?? 0;
                  const responseRate = tokenCount > 0 ? Math.round((responseCount / tokenCount) * 100) : 0;

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={CAMPAIGN_STATUS_COLORS[c.status] || ''}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.startedAt ? new Date(c.startedAt).toLocaleDateString('tr-TR') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.closesAt ? new Date(c.closesAt).toLocaleDateString('tr-TR') : '—'}
                      </TableCell>
                      <TableCell className="text-center text-sm">{tokenCount}</TableCell>
                      <TableCell className="text-center text-sm">
                        {responseCount} <span className="text-muted-foreground">({responseRate}%)</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-yellow-700 hover:text-yellow-800"
                            disabled={pausing === c.id}
                            onClick={() => handlePause(c.id)}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            {pausing === c.id ? '...' : 'Duraklat'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
