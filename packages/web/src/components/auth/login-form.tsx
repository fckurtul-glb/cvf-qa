'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/constants';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'İşlem başarısız');
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError('Sunucuya bağlanılamadı');
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-[400px]">
        <CardContent className="px-10 pb-10 pt-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">
            ✉️
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Bağlantı Gönderildi</h2>
          <p className="text-sm text-muted-foreground">
            <strong>{email}</strong> adresine giriş bağlantısı gönderdik. Lütfen e-postanızı kontrol edin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-[400px]">
      <CardContent className="px-10 pb-10 pt-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-[22px] font-bold text-white">
            QA
          </div>
          <h1 className="text-[28px] font-bold text-foreground">CVF-QA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            E-posta ile giriş yapın
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="magic-email">E-posta</Label>
            <Input
              id="magic-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@kurum.edu.tr"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Gönderiliyor...' : 'Giriş Bağlantısı Gönder'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
