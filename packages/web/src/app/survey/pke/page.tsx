'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import questionBank from '../../../data/question-bank.json';
import { LikertSurvey, type LikertQuestion } from '../../../components/survey/likert-survey';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PKE = questionBank.modules.M5_PKE;

const QUESTIONS: LikertQuestion[] = PKE.subdimensions.flatMap((sub) =>
  sub.items.map((item) => ({
    id: item.id,
    text: item.text,
    subdimension: sub.id,
    subdimensionTitle: sub.title,
  })),
);

export default function PKESurveyPage() {
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
      body: JSON.stringify({ moduleCode: 'M5_PKE', answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Gönderim başarısız');
    }

    router.push(`/survey/result/${data.data.responseId}?module=PKE`);
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
      title={PKE.name}
      subtitle={`${PKE.source} · ${PKE.questionCount} Soru · 5'li Likert`}
      questions={QUESTIONS}
      scaleType="likert5"
      moduleCode="M5_PKE"
      accentColor="#E67E22"
      onSubmit={handleSubmit}
    />
  );
}
