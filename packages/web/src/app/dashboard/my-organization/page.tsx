'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, UserPlus, Trash2, Save, FileText,
  CheckSquare, Mail, Clock, XCircle,
} from 'lucide-react';

const API = 'http://localhost:3001';

// ── Interfaces ──

interface MyOrg {
  id: string;
  name: string;
  domain: string;
  packageTier: string;
  isActive: boolean;
  userCount: number;
  campaignCount: number;
  departmentCount: number;
  createdAt: string;
  settings?: { logoUrl?: string; [key: string]: unknown };
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

interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  parentDepartment: { id: string; name: string } | null;
  headUserId: string | null;
  userCount: number;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: unknown;
  timestamp: string;
  performedBy: { id: string; email: string; name: string | null } | null;
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

const ACTION_COLORS: Record<string, string> = {
  'user.activate': 'bg-emerald-50 text-emerald-700',
  'user.deactivate': 'bg-orange-50 text-orange-700',
  'user.bulk.activate': 'bg-emerald-50 text-emerald-700',
  'user.bulk.deactivate': 'bg-orange-50 text-orange-700',
  'user.role.change': 'bg-blue-50 text-blue-700',
  'department.create': 'bg-emerald-50 text-emerald-700',
  'department.update': 'bg-blue-50 text-blue-700',
  'department.delete': 'bg-red-50 text-red-700',
  'invite.revoke': 'bg-red-50 text-red-700',
  'campaign.pause': 'bg-yellow-50 text-yellow-700',
};

function getToken() {
  return localStorage.getItem('token');
}

function getTokenPayload(): { sub: string; org: string; role: string } | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

// ── Main Component ──

export default function MyOrganizationPage() {
  const router = useRouter();
  const [myOrg, setMyOrg] = useState<MyOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  const fetchMyOrg = useCallback(async () => {
    const token = getToken();
    if (!token) { router.replace('/auth/login'); return; }

    const payload = getTokenPayload();
    if (!payload) { router.replace('/auth/login'); return; }

    // Only ORG_ADMIN and SUPER_ADMIN can see this page
    if (!['ORG_ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      router.replace('/dashboard');
      return;
    }
    setUserRole(payload.role);

    try {
      const res = await fetch(`${API}/my-organization`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setMyOrg(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchMyOrg(); }, [fetchMyOrg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Kurum bilgileri yükleniyor...</div>
      </div>
    );
  }

  if (!myOrg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Kurum bilgisi alınamadı.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  const tier = TIER_MAP[myOrg.packageTier] || TIER_MAP.STARTER;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {myOrg.settings?.logoUrl ? (
              <img src={myOrg.settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-border bg-muted" />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">{myOrg.name}</h1>
            <Badge variant={myOrg.isActive ? 'secondary' : 'destructive'} className={myOrg.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
              {myOrg.isActive ? 'Aktif' : 'Pasif'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{myOrg.domain} · <Badge variant="outline" className={tier.className}>{tier.label}</Badge></p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{myOrg.userCount}</p>
            <p className="text-xs text-muted-foreground">Kullanıcı</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{myOrg.campaignCount}</p>
            <p className="text-xs text-muted-foreground">Kampanya</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{myOrg.departmentCount}</p>
            <p className="text-xs text-muted-foreground">Birim</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="departments">Birimler</TabsTrigger>
          <TabsTrigger value="invites">Davetler</TabsTrigger>
          <TabsTrigger value="audit-logs">Denetim</TabsTrigger>
        </TabsList>

        {/* ══ TAB 1: KULLANICILAR ══ */}
        <TabsContent value="users">
          <MyOrgUsersTab onRefreshOrg={fetchMyOrg} />
        </TabsContent>

        {/* ══ TAB 2: BİRİMLER ══ */}
        <TabsContent value="departments">
          <MyOrgDepartmentsTab />
        </TabsContent>

        {/* ══ TAB 3: DAVETLER ══ */}
        <TabsContent value="invites">
          <MyOrgInvitesTab />
        </TabsContent>

        {/* ══ TAB 4: DENETİM ══ */}
        <TabsContent value="audit-logs">
          <MyOrgAuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════════════
// KULLANICILAR TAB
// ════════════════════════════════════════════════════

function MyOrgUsersTab({ onRefreshOrg }: { onRefreshOrg: () => void }) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ success: boolean; message: string } | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (roleFilter) params.set('role', roleFilter);
    if (activeFilter) params.set('isActive', activeFilter);

    try {
      const res = await fetch(`${API}/my-organization/users?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
        setTotal(json.data.pagination.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, roleFilter, activeFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleToggle(userId: string, currentActive: boolean) {
    setToggling(userId);
    try {
      const res = await fetch(`${API}/my-organization/users/${userId}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentActive } : u));
        onRefreshOrg();
      }
    } catch { /* ignore */ }
    setToggling(null);
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setReassigning(userId);
    try {
      const res = await fetch(`${API}/my-organization/users/${userId}/role`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch { /* ignore */ }
    setReassigning(null);
  }

  async function handleBulk(action: 'activate' | 'deactivate') {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} kullanıcıyı ${action === 'activate' ? 'aktifleştirmek' : 'deaktive etmek'} istediğinize emin misiniz?`)) return;
    setBulkLoading(true);
    setBulkMsg(null);
    try {
      const res = await fetch(`${API}/my-organization/users/bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action, userIds: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        setBulkMsg({ success: true, message: `${json.data.count} kullanıcı güncellendi` });
        await fetchUsers();
        onRefreshOrg();
      } else {
        setBulkMsg({ success: false, message: json.error?.message || 'İşlem başarısız' });
      }
    } catch {
      setBulkMsg({ success: false, message: 'Sunucu hatası' });
    }
    setBulkLoading(false);
  }

  function toggleSelect(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map((u) => u.id)));
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Tüm Roller</option>
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
        <div className="ml-auto text-sm text-muted-foreground">Toplam {total} kullanıcı</div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">{selectedIds.size} kullanıcı seçili</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => handleBulk('activate')}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              Aktifleştir
            </Button>
            <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => handleBulk('deactivate')}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50">
              Deaktive Et
            </Button>
          </div>
        </div>
      )}

      {bulkMsg && (
        <div className={`text-sm rounded-lg px-4 py-2 ${bulkMsg.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {bulkMsg.message}
        </div>
      )}

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
                  <TableHead className="w-10">
                    <input type="checkbox" checked={selectedIds.size === users.length && users.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                  </TableHead>
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
                  <TableRow key={user.id} className={selectedIds.has(user.id) ? 'bg-blue-50/50' : ''}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelect(user.id)} className="rounded border-gray-300"
                        disabled={user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN'}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {reassigning === user.id ? (
                        <span className="text-xs text-muted-foreground">...</span>
                      ) : user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN' ? (
                        <Badge variant="outline" className={user.role === 'ORG_ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-border bg-background"
                        >
                          <option value="UNIT_ADMIN">Birim Yöneticisi</option>
                          <option value="PARTICIPANT">Katılımcı</option>
                          <option value="VIEWER">Görüntüleyici</option>
                        </select>
                      )}
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
                      {user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN' && (
                        <Button
                          variant={user.isActive ? 'destructive' : 'outline'}
                          size="sm"
                          disabled={toggling === user.id}
                          onClick={() => handleToggle(user.id, user.isActive)}
                        >
                          {toggling === user.id ? '...' : user.isActive ? 'Deaktive Et' : 'Aktifleştir'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Sayfa {page}/{totalPages}</p>
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
// BİRİMLER TAB
// ════════════════════════════════════════════════════

function MyOrgDepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/my-organization/departments`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setDepartments(json.data.departments);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  function startEdit(dept: Department) {
    setEditingId(dept.id);
    setFormName(dept.name);
    setFormParentId(dept.parentDepartmentId ?? '');
    setShowForm(true);
    setMsg(null);
  }

  function startCreate() {
    setEditingId(null);
    setFormName('');
    setFormParentId('');
    setShowForm(true);
    setMsg(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormParentId('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setMsg(null);

    try {
      const body: Record<string, unknown> = { name: formName.trim() };
      if (formParentId) body.parentDepartmentId = formParentId;

      const url = editingId
        ? `${API}/my-organization/departments/${editingId}`
        : `${API}/my-organization/departments`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const json = await res.json();

      if (json.success) {
        setMsg({ success: true, message: editingId ? 'Birim güncellendi' : 'Birim oluşturuldu' });
        cancelForm();
        await fetchDepartments();
      } else {
        setMsg({ success: false, message: json.error?.message || 'Hata oluştu' });
      }
    } catch {
      setMsg({ success: false, message: 'Sunucu hatası' });
    }
    setSaving(false);
  }

  async function handleDelete(dept: Department) {
    if (!confirm(`"${dept.name}" birimini silmek istediğinize emin misiniz?`)) return;
    setMsg(null);
    try {
      const res = await fetch(`${API}/my-organization/departments/${dept.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ success: true, message: 'Birim silindi' });
        await fetchDepartments();
      } else {
        setMsg({ success: false, message: json.error?.message || 'Silinemedi' });
      }
    } catch {
      setMsg({ success: false, message: 'Sunucu hatası' });
    }
  }

  const availableParents = departments.filter((d) => d.id !== editingId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Birim Yönetimi</h3>
          <span className="text-sm text-muted-foreground">({departments.length} birim)</span>
        </div>
        {!showForm && (
          <Button size="sm" onClick={startCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Yeni Birim
          </Button>
        )}
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-2 ${msg.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {msg.message}
        </div>
      )}

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Birimi Düzenle' : 'Yeni Birim Oluştur'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Birim Adı *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="örn. Mühendislik Fakültesi"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Üst Birim (Opsiyonel)</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">— Üst birim yok —</option>
                  {availableParents.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={cancelForm}>İptal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Henüz birim oluşturulmamış. "Yeni Birim" butonunu kullanın veya CSV içe aktarma yapın.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Birim Adı</TableHead>
                  <TableHead>Üst Birim</TableHead>
                  <TableHead className="text-center">Kullanıcı</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dept.parentDepartment?.name || '—'}</TableCell>
                    <TableCell className="text-center text-sm">{dept.userCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(dept)}>Düzenle</Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(dept)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
// DAVETLER TAB
// ════════════════════════════════════════════════════

function MyOrgInvitesTab() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/my-organization/invites`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setInvites(json.data.invites);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`${API}/my-organization/invites`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail, role: 'UNIT_ADMIN' }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteMsg({ success: true, message: 'Davet gönderildi!', url: json.data.registerUrl });
        setInviteEmail('');
        await fetchInvites();
      } else {
        setInviteMsg({ success: false, message: json.error?.message || 'Davet gönderilemedi' });
      }
    } catch {
      setInviteMsg({ success: false, message: 'Sunucu hatası' });
    }
    setInviteLoading(false);
  }

  async function handleRevoke(inviteId: string) {
    if (!confirm('Bu daveti iptal etmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`${API}/my-organization/invites/${inviteId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) await fetchInvites();
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Birim Yöneticisi Davet Et */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Birim Yöneticisi Davet Et
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Kurumunuza Birim Yöneticisi rolünde yeni kullanıcı davet edebilirsiniz. Davet linki 7 gün geçerlidir.
          </p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-posta adresi"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" disabled={inviteLoading}>
              <Mail className="w-4 h-4 mr-2" />
              {inviteLoading ? 'Gönderiliyor...' : 'Davet Gönder'}
            </Button>
          </form>
          {inviteMsg && (
            <div className={`mt-4 text-sm rounded-lg px-4 py-3 ${inviteMsg.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <p>{inviteMsg.message}</p>
              {inviteMsg.url && (
                <p className="mt-2 text-xs break-all opacity-75">Kayıt linki: {inviteMsg.url}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bekleyen Davetler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Bekleyen Davetler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>
          ) : invites.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Bekleyen davet bulunmuyor.</div>
          ) : (
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
                {invites.map((invite) => (
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
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleRevoke(invite.id)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
// DENETİM TAB
// ════════════════════════════════════════════════════

function MyOrgAuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (resourceTypeFilter) params.set('resourceType', resourceTypeFilter);

    try {
      const res = await fetch(`${API}/my-organization/audit-logs?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setTotal(json.data.pagination.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, resourceTypeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Denetim Kayıtları</h3>
        <span className="text-sm text-muted-foreground">({total} kayıt)</span>
      </div>

      <div className="flex gap-3">
        <select
          value={resourceTypeFilter}
          onChange={(e) => { setResourceTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Tüm Kaynaklar</option>
          <option value="user">Kullanıcı</option>
          <option value="department">Birim</option>
          <option value="invite">Davet</option>
          <option value="campaign">Kampanya</option>
        </select>
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Denetim kaydı bulunamadı.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Yapan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded ${ACTION_COLORS[log.action] || 'bg-gray-50 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.resourceType || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {log.performedBy ? (
                        <div>
                          <p className="font-medium">{log.performedBy.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{log.performedBy.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sistem</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Sayfa {page}/{totalPages}</p>
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
