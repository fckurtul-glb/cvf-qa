'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry veya benzeri hata izleme entegrasyonu buraya eklenecek
    console.error('[CVF-QA Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Bir hata oluştu</h2>
          <p className="text-sm text-muted-foreground">
            Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin veya ana sayfaya dönün.
          </p>
          {error.digest && (
            <p className="rounded bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
              Hata Kodu: {error.digest}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tekrar Dene
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => (window.location.href = '/')}
            >
              <Home className="h-4 w-4" />
              Ana Sayfa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
