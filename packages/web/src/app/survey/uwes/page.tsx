'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import questionBank from '../../../data/question-bank.json';
import { LikertSurvey, type LikertQuestion } from '../../../components/survey/likert-survey';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const UWES = questionBank.modules.M4_UWES;

const QUESTIONS: LikertQuestion[] = UWES.subdimensions.flatMap((sub) =>
  sub.items.map((item) => ({
    id: item.id,
    text: item.text,
    subdimension: sub.id,
    subdimensionTitle: sub.title,
  })),
);

export default function UWESSurveyPage() {
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
      body: JSON.stringify({ moduleCode: 'M4_UWES', answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Gönderim başarısız');
    }

    router.push(`/survey/result/${data.data.responseId}?module=UWES`);
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
      title={UWES.name}
      subtitle={`${UWES.source} · ${UWES.questionCount} Soru · 7'li Likert (0-6)`}
      questions={QUESTIONS}
      scaleType="likert7"
      moduleCode="M4_UWES"
      accentColor="#7B2D8E"
      onSubmit={handleSubmit}
    />
  );
}
