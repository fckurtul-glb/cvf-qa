'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LikertWidgetProps {
  questionNumber: number;
  questionText: string;
  dimension: string;
  scaleMin: number;
  scaleMax: number;
  scaleLabels?: Record<number, string>;
  initialValue?: number;
  onAnswer: (value: number) => void;
}

const DEFAULT_LABELS_5: Record<number, string> = {
  1: 'Kesinlikle Katılmıyorum',
  2: 'Katılmıyorum',
  3: 'Kararsızım',
  4: 'Katılıyorum',
  5: 'Kesinlikle Katılıyorum',
};

const DEFAULT_LABELS_7: Record<number, string> = {
  0: 'Hiçbir zaman',
  1: 'Neredeyse hiçbir zaman',
  2: 'Nadiren',
  3: 'Bazen',
  4: 'Sıklıkla',
  5: 'Çok sıklıkla',
  6: 'Her zaman',
};

export function LikertWidget({
  questionNumber,
  questionText,
  dimension,
  scaleMin,
  scaleMax,
  scaleLabels,
  initialValue,
  onAnswer,
}: LikertWidgetProps) {
  const [selected, setSelected] = useState<number | null>(initialValue ?? null);

  const range = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
  const labels = scaleLabels ?? (scaleMax === 5 ? DEFAULT_LABELS_5 : scaleMax === 6 ? DEFAULT_LABELS_7 : {});

  const handleSelect = (value: number) => {
    setSelected(value);
    onAnswer(value);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Soru Başlığı */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy text-white text-sm font-bold">
            {questionNumber}
          </span>
          <span className="text-xs font-medium text-navy/40 uppercase tracking-wider">
            {dimension}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-navy leading-snug">{questionText}</h3>
      </div>

      {/* Desktop: Yatay butonlar */}
      <div className="hidden md:flex items-stretch gap-2">
        {range.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              selected === value
                ? 'border-accent bg-accent/10 shadow-md shadow-accent/10 scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-accent/40 hover:bg-accent/5'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold transition-colors',
                selected === value ? 'bg-accent text-white' : 'bg-slate-100 text-navy/60'
              )}
            >
              {value}
            </span>
            {labels[value] && (
              <span
                className={cn(
                  'text-xs text-center leading-tight transition-colors',
                  selected === value ? 'text-accent font-medium' : 'text-navy/40'
                )}
              >
                {labels[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Mobil: Dikey liste */}
      <div className="md:hidden space-y-2">
        {range.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
              selected === value
                ? 'border-accent bg-accent/10'
                : 'border-slate-200 bg-white active:bg-accent/5'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold shrink-0',
                selected === value ? 'bg-accent text-white' : 'bg-slate-100 text-navy/60'
              )}
            >
              {value}
            </span>
            <span
              className={cn(
                'text-sm text-left',
                selected === value ? 'text-accent font-medium' : 'text-navy/60'
              )}
            >
              {labels[value] || `Puan ${value}`}
            </span>
          </button>
        ))}
      </div>

      {/* Seçim onay göstergesi */}
      {selected !== null && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            ✓ Yanıtınız: {selected} {labels[selected] ? `— ${labels[selected]}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
