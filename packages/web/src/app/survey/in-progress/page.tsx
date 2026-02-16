'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SurveyFlowController } from '@/components/survey/survey-flow-controller';
import { fetchAPI } from '@/hooks/use-api';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface SurveySession {
  responseId: string;
  campaignName: string;
  orgName: string;
  orgLogo?: string;
  modules: {
    code: string;
    name: string;
    format: 'ipsative' | 'likert_5' | 'likert_7' | 'likert_360';
    questions: any[];
  }[];
  estimatedMinutes: number;
  savedAnswers?: Record<string, any>;
  savedPosition?: { moduleIndex: number; questionIndex: number };
}

type PageState = 'loading' | 'ready' | 'error' | 'expired' | 'completed' | 'already_completed';

export default function SurveyInProgressPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || searchParams.get('t');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [session, setSession] = useState<SurveySession | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Token ile oturumu başlat
  useEffect(() => {
    if (!token) {
      setPageState('error');
      setErrorMessage('Geçersiz anket bağlantısı. Lütfen davetiye e-postanızdaki linki kullanın.');
      return;
    }

    async function startSession() {
      try {
        const res = await fetchAPI<{ success: boolean; data: SurveySession; error?: any }>(
          `/survey/start?t=${encodeURIComponent(token!)}`,
        );

        if (res.success && res.data) {
          setSession(res.data);
          setPageState('ready');
        } else {
          const code = res.error?.code;
          if (code === 'TOKEN_EXPIRED') {
            setPageState('expired');
          } else if (code === 'ALREADY_COMPLETED') {
            setPageState('already_completed');
          } else {
            setPageState('error');
            setErrorMessage(res.error?.message || 'Anket oturumu başlatılamadı.');
          }
        }
      } catch (err: any) {
        setPageState('error');
        setErrorMessage(err.message || 'Bağlantı hatası. Lütfen tekrar deneyin.');
      }
    }

    startSession();
  }, [token]);

  // Auto-save
  const handleSave = useCallback(
    async (data: { answers: Record<string, any>; moduleIndex: number; questionIndex: number }) => {
      if (!session) return;
      await fetchAPI(`/survey/save`, {
        method: 'POST',
        body: JSON.stringify({
          responseId: session.responseId,
          answers: data.answers,
          position: { moduleIndex: data.moduleIndex, questionIndex: data.questionIndex },
        }),
      });
    },
    [session],
  );

  // Final submit
  const handleSubmit = useCallback(
    async (answers: Record<string, any>) => {
      if (!session) return;
      try {
        await fetchAPI(`/survey/submit`, {
          method: 'POST',
          body: JSON.stringify({
            responseId: session.responseId,
            answers,
          }),
        });
        setPageState('completed');
      } catch (err: any) {
        throw new Error(err.message || 'Yanıtlar gönderilemedi. Lütfen tekrar deneyin.');
      }
    },
    [session],
  );

  // ── Loading ──
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-white" />
          <p className="mt-4 text-white/80">Anket yükleniyor...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (pageState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Bir Hata Oluştu</h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // ── Token Expired ──
  if (pageState === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto mb-4 text-5xl">⏰</div>
          <h2 className="text-xl font-bold text-foreground">Anket Süresi Dolmuş</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bu anket bağlantısının süresi dolmuştur. Yeni bir davetiye için kurum yöneticinizle
            iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  // ── Already Completed ──
  if (pageState === 'already_completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto mb-4 text-5xl">✅</div>
          <h2 className="text-xl font-bold text-foreground">Anket Zaten Tamamlanmış</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bu anket daha önce tamamlanmıştır. Her anket bağlantısı yalnızca bir kez
            kullanılabilir.
          </p>
        </div>
      </div>
    );
  }

  // ── Completed (after submit) ──
  if (pageState === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto mb-4 text-5xl">🎉</div>
          <h2 className="text-2xl font-display font-bold text-foreground">Teşekkürler!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tüm yanıtlarınız başarıyla kaydedildi. Katkınız için teşekkür ederiz.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">Bu sayfayı güvenle kapatabilirsiniz.</p>
        </div>
      </div>
    );
  }

  // ── Survey Flow ──
  if (!session) return null;

  return (
    <SurveyFlowController
      campaignName={session.campaignName}
      orgName={session.orgName}
      orgLogo={session.orgLogo}
      modules={session.modules}
      estimatedMinutes={session.estimatedMinutes}
      sessionId={session.responseId}
      savedAnswers={session.savedAnswers}
      savedPosition={session.savedPosition}
      onSave={handleSave}
      onSubmit={handleSubmit}
    />
  );
}
