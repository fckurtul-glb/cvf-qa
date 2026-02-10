'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface IpsativeOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
  cultureLabel: string;
  color: string;
}

interface IpsativeWidgetProps {
  questionNumber: number;
  questionTitle: string;
  options: IpsativeOption[];
  perspective: 'current' | 'preferred';
  initialValues?: { A: number; B: number; C: number; D: number };
  onComplete: (values: { A: number; B: number; C: number; D: number }) => void;
  onAutoSave?: (values: { A: number; B: number; C: number; D: number }) => void;
}

const TOTAL = 100;

const CULTURE_COLORS = {
  A: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', fill: 'bg-blue-500' },
  B: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', fill: 'bg-amber-500' },
  C: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', fill: 'bg-red-500' },
  D: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', fill: 'bg-slate-500' },
};

export function IpsativeWidget({
  questionNumber,
  questionTitle,
  options,
  perspective,
  initialValues,
  onComplete,
  onAutoSave,
}: IpsativeWidgetProps) {
  const [values, setValues] = useState<{ A: number; B: number; C: number; D: number }>(
    initialValues ?? { A: 25, B: 25, C: 25, D: 25 }
  );

  const total = values.A + values.B + values.C + values.D;
  const remaining = TOTAL - total;
  const isValid = total === TOTAL;

  // Auto-save her 30 saniye
  useEffect(() => {
    if (!onAutoSave) return;
    const timer = setInterval(() => onAutoSave(values), 30_000);
    return () => clearInterval(timer);
  }, [values, onAutoSave]);

  const handleChange = useCallback((key: 'A' | 'B' | 'C' | 'D', newValue: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
    setValues((prev) => ({ ...prev, [key]: clamped }));
  }, []);

  const handleIncrement = useCallback((key: 'A' | 'B' | 'C' | 'D', delta: number) => {
    setValues((prev) => {
      const newVal = Math.max(0, Math.min(100, prev[key] + delta));
      return { ...prev, [key]: newVal };
    });
  }, []);

  const statusColor = remaining === 0 ? 'text-green-600 bg-green-50' : remaining > 0 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  const statusIcon = remaining === 0 ? '✓' : remaining > 0 ? '↓' : '↑';

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Soru Başlığı */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy text-white text-sm font-bold">
            {questionNumber}
          </span>
          <span className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full',
            perspective === 'current' ? 'bg-accent/10 text-accent' : 'bg-gold/20 text-gold-dark'
          )}>
            {perspective === 'current' ? 'MEVCUT DURUM' : 'TERCİH EDİLEN'}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-navy leading-snug">{questionTitle}</h3>
        <p className="text-sm text-navy/50 mt-1">
          Toplam 100 puanı aşağıdaki 4 seçenek arasında dağıtın.
        </p>
      </div>

      {/* Toplam Göstergesi */}
      <div className={cn('flex items-center justify-between px-4 py-2 rounded-lg mb-4 transition-colors', statusColor)}>
        <span className="text-sm font-medium">
          Toplam: <strong>{total}</strong> / 100
        </span>
        <span className="text-sm">
          {statusIcon} {remaining === 0 ? 'Hazır' : remaining > 0 ? `${remaining} puan kaldı` : `${Math.abs(remaining)} puan fazla`}
        </span>
      </div>

      {/* Seçenekler */}
      <div className="space-y-3">
        {options.map((option) => {
          const c = CULTURE_COLORS[option.key];
          const pct = values[option.key];

          return (
            <div
              key={option.key}
              className={cn('rounded-xl border-2 p-4 transition-all', c.bg, c.border)}
            >
              {/* Seçenek Metni */}
              <div className="flex items-start gap-3 mb-3">
                <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold shrink-0', c.fill)}>
                  {option.key}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy leading-relaxed">{option.text}</p>
                  <p className={cn('text-xs mt-1 opacity-60', c.text)}>{option.cultureLabel}</p>
                </div>
              </div>

              {/* Slider + Input + Butonlar */}
              <div className="flex items-center gap-3">
                {/* Mobil: ± butonlar */}
                <button
                  type="button"
                  onClick={() => handleIncrement(option.key, -5)}
                  className="md:hidden w-8 h-8 rounded-lg bg-white border border-slate-200 text-navy font-bold text-sm hover:bg-slate-50 active:scale-95 transition"
                  aria-label={`${option.key} seçeneğini 5 azalt`}
                >
                  −
                </button>

                {/* Slider (desktop) */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) => handleChange(option.key, Number(e.target.value))}
                  className="hidden md:block flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-navy"
                  aria-label={`${option.key} puanı`}
                />

                {/* Progress bar (mobil) */}
                <div className="md:hidden flex-1 h-3 bg-white rounded-full overflow-hidden border">
                  <div
                    className={cn('h-full rounded-full transition-all duration-200', c.fill)}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleIncrement(option.key, 5)}
                  className="md:hidden w-8 h-8 rounded-lg bg-white border border-slate-200 text-navy font-bold text-sm hover:bg-slate-50 active:scale-95 transition"
                  aria-label={`${option.key} seçeneğini 5 artır`}
                >
                  +
                </button>

                {/* Sayısal Input */}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) => handleChange(option.key, Number(e.target.value))}
                  className={cn(
                    'w-16 h-10 text-center text-lg font-bold rounded-lg border-2 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
                    c.border, c.text, 'focus:ring-accent'
                  )}
                  aria-label={`${option.key} puan girişi`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Devam Butonu */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!isValid}
          onClick={() => isValid && onComplete(values)}
          className={cn(
            'px-8 py-3 rounded-xl font-semibold text-white transition-all',
            isValid
              ? 'bg-gradient-to-r from-accent to-accent-light hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]'
              : 'bg-slate-300 cursor-not-allowed'
          )}
        >
          {isValid ? 'Sonraki Soru →' : `${Math.abs(remaining)} puan ${remaining > 0 ? 'eksik' : 'fazla'}`}
        </button>
      </div>
    </div>
  );
}
