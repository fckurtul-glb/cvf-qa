'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import questionBank from '../../../data/question-bank.json';
import { LikertSurvey, type LikertQuestion } from '../../../components/survey/likert-survey';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SPU = questionBank.modules.M6_SPU;

// SPU'nun subdimensions yapısı yok — düz items listesi
const QUESTIONS: LikertQuestion[] = SPU.items.map((item) => ({
  id: item.id,
  text: item.text,
  subdimension: 'SPU_general',
  subdimensionTitle: 'Stratejik Plan Uyumu',
}));

export default function SPUSurveyPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  async function handleSubmit(answers: Record<string, number>) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/survey/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ moduleCode: 'M6_SPU', answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Gönderim başarısız');
    }

    router.push(`/survey/result/${data.data.responseId}?module=SPU`);
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <LikertSurvey
      title={SPU.name}
      subtitle={`${SPU.source} · ${SPU.questionCount} Soru · 5'li Likert · Sadece Yönetim`}
      questions={QUESTIONS}
      scaleType="likert5"
      moduleCode="M6_SPU"
      accentColor="#27AE60"
      onSubmit={handleSubmit}
    />
  );
}
