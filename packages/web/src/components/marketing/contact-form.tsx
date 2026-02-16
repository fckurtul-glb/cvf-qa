'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchAPI } from '@/hooks/use-api';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('loading');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      institution: formData.get('institution') as string,
      phone: (formData.get('phone') as string) || undefined,
    };

    try {
      await fetchAPI('/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setFormState('success');
    } catch (err: any) {
      setFormState('error');
      setErrorMessage(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  return (
    <section className="py-20" id="iletisim">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-lg">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-2xl">Demo Talep Formu</CardTitle>
              <CardDescription>
                Bilgilerinizi bırakın, en kısa sürede sizinle iletişime geçelim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formState === 'success' ? (
                <div className="rounded-xl bg-primary/10 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xl text-primary">
                    ✓
                  </div>
                  <p className="font-medium text-primary">Talebiniz alındı!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    En kısa sürede sizinle iletişime geçeceğiz.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input id="name" name="name" required placeholder="Prof. Dr. ..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="isim@universite.edu.tr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Kurum</Label>
                    <Input
                      id="institution"
                      name="institution"
                      required
                      placeholder="Üniversite adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon (Opsiyonel)</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="05XX XXX XX XX" />
                  </div>

                  {formState === 'error' && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={formState === 'loading'}>
                    {formState === 'loading' ? 'Gönderiliyor...' : 'Demo Talep Et'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
