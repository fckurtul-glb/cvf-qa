'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Giriş başarısız');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.data.accessToken);
      toast({ title: 'Giriş başarılı', description: 'Yönlendiriliyorsunuz...' });
      router.push('/dashboard');
    } catch {
      setError('Sunucuya bağlanılamadı');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-background">
      <Card className="w-full max-w-[400px]">
        <CardContent className="pt-12 pb-10 px-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold text-[22px] mb-4">
              QA
            </div>
            <h1 className="text-[28px] font-bold text-foreground">CVF-QA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kurumsal Kültür Değerlendirme Platformu
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@kurum.edu.tr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 karakter"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-2.5">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Spinner className="mr-2" />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
