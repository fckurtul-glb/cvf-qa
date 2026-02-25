'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Organization {
  id: string;
  name: string;
  domain: string;
  packageTier: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

const TIER_MAP: Record<string, { label: string; className: string }> = {
  STARTER: { label: 'Starter', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  PROFESSIONAL: { label: 'Professional', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  ENTERPRISE: { label: 'Enterprise', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function OrganizationsListPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/auth/login'); return; }

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);

    fetch(`${API}/organizations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setOrganizations(json.data?.organizations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router, debouncedSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Kurumlar yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Kurumlar</h1>
        <Button onClick={() => router.push('/dashboard/organizations/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kurum
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Kurum ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground">Henüz kurum oluşturulmamış.</p>
            <Button onClick={() => router.push('/dashboard/organizations/new')}>
              İlk Kurumu Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurum Adı</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                <TableHead className="text-center">Kullanıcı</TableHead>
                <TableHead className="hidden lg:table-cell">Oluşturulma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => {
                const tier = TIER_MAP[org.packageTier] || TIER_MAP.STARTER;
                return (
                  <TableRow
                    key={org.id}
                    onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground">{org.domain}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tier.className}>{tier.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={org.isActive ? 'secondary' : 'destructive'} className={org.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                        {org.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{org.userCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {new Date(org.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
