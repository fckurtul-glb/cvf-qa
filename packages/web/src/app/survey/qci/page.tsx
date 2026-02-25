'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import questionBank from '../../../data/question-bank.json';
import { LikertSurvey, type LikertQuestion } from '../../../components/survey/likert-survey';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const QCI = questionBank.modules.M2_QCI;

const QUESTIONS: LikertQuestion[] = QCI.subdimensions.flatMap((sub) =>
  sub.items.map((item) => ({
    id: item.id,
    text: item.text,
    subdimension: sub.id,
    subdimensionTitle: sub.title,
  })),
);

export default function QCISurveyPage() {
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
      body: JSON.stringify({ moduleCode: 'M2_QCI', answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Gönderim başarısız');
    }

    router.push(`/survey/result/${data.data.responseId}?module=QCI`);
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
      title={QCI.name}
      subtitle={`${QCI.source} · ${QCI.questionCount} Soru · 5'li Likert`}
      questions={QUESTIONS}
      scaleType="likert5"
      moduleCode="M2_QCI"
      accentColor="#2E86AB"
      onSubmit={handleSubmit}
    />
  );
}
