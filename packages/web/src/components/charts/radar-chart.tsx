'use client';

import { useState } from 'react';

interface RadarChartProps {
  current: { klan: number; adhokrasi: number; pazar: number; hiyerarsi: number };
  preferred: { klan: number; adhokrasi: number; pazar: number; hiyerarsi: number };
  size?: number;
  showLabels?: boolean;
  animated?: boolean;
}

const AXES = [
  { key: 'klan' as const, label: 'Klan', angle: -Math.PI / 2 },        // top
  { key: 'adhokrasi' as const, label: 'Adhokrasi', angle: 0 },          // right
  { key: 'pazar' as const, label: 'Pazar', angle: Math.PI / 2 },        // bottom
  { key: 'hiyerarsi' as const, label: 'Hiyerarşi', angle: Math.PI },    // left
];

const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0];

const PRIMARY = '#254E70';
const ACCENT = '#C33C54';
const FROSTED = '#8EE3EF';

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  maxRadius: number,
  data: { klan: number; adhokrasi: number; pazar: number; hiyerarsi: number },
) {
  return AXES.map((axis) => {
    const value = Math.min(Math.max(data[axis.key], 0), 100);
    const r = (value / 100) * maxRadius;
    const { x, y } = polarToCartesian(cx, cy, r, axis.angle);
    return `${x},${y}`;
  }).join(' ');
}

export function RadarChart({
  current,
  preferred,
  size = 300,
  showLabels = true,
  animated = true,
}: RadarChartProps) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    currentVal: number;
    preferredVal: number;
  }>({ visible: false, x: 0, y: 0, label: '', currentVal: 0, preferredVal: 0 });

  const viewBox = 400;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const maxRadius = 140;
  const labelOffset = 24;

  const currentPoints = buildPolygonPoints(cx, cy, maxRadius, current);
  const preferredPoints = buildPolygonPoints(cx, cy, maxRadius, preferred);

  // Calculate perimeter for stroke-dashoffset animation
  const perimeterEstimate = maxRadius * 2 * Math.PI;

  return (
    <div className="relative inline-block" style={{ width: '100%', maxWidth: size }}>
      <svg
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        className="h-auto w-full"
        role="img"
        aria-label="OCAI Kültür Değerlendirmesi Radar Grafiği"
      >
        <defs>
          <style>
            {animated
              ? `
              @keyframes radar-draw-in {
                from {
                  stroke-dashoffset: ${perimeterEstimate};
                }
                to {
                  stroke-dashoffset: 0;
                }
              }
              .radar-layer-current {
                animation: radar-draw-in 1.2s ease-out forwards;
              }
              .radar-layer-preferred {
                animation: radar-draw-in 1.4s ease-out 0.2s forwards;
              }
            `
              : ''}
          </style>
        </defs>

        {/* Grid lines */}
        {GRID_LEVELS.map((level) => {
          const r = level * maxRadius;
          const points = AXES.map((axis) => {
            const { x, y } = polarToCartesian(cx, cy, r, axis.angle);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}

        {/* Axis lines */}
        {AXES.map((axis) => {
          const { x, y } = polarToCartesian(cx, cy, maxRadius, axis.angle);
          return (
            <line
              key={axis.key}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}

        {/* Grid level labels (percentages) */}
        {GRID_LEVELS.map((level) => {
          const r = level * maxRadius;
          return (
            <text
              key={`label-${level}`}
              x={cx + 4}
              y={cy - r - 2}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="start"
            >
              {level * 100}
            </text>
          );
        })}

        {/* Current layer */}
        <polygon
          points={currentPoints}
          fill={PRIMARY}
          fillOpacity={0.3}
          stroke={PRIMARY}
          strokeWidth={2}
          className={animated ? 'radar-layer-current' : ''}
          strokeDasharray={animated ? perimeterEstimate : 'none'}
          strokeDashoffset={animated ? 0 : undefined}
        />

        {/* Preferred layer */}
        <polygon
          points={preferredPoints}
          fill={ACCENT}
          fillOpacity={0.3}
          stroke={ACCENT}
          strokeWidth={2}
          strokeDasharray={animated ? `6 4` : '6 4'}
          className={animated ? 'radar-layer-preferred' : ''}
        />

        {/* Data points (current) */}
        {AXES.map((axis) => {
          const value = current[axis.key];
          const r = (Math.min(Math.max(value, 0), 100) / 100) * maxRadius;
          const { x, y } = polarToCartesian(cx, cy, r, axis.angle);
          return (
            <circle
              key={`current-${axis.key}`}
              cx={x}
              cy={y}
              r={4}
              fill={PRIMARY}
              stroke="white"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Data points (preferred) */}
        {AXES.map((axis) => {
          const value = preferred[axis.key];
          const r = (Math.min(Math.max(value, 0), 100) / 100) * maxRadius;
          const { x, y } = polarToCartesian(cx, cy, r, axis.angle);
          return (
            <circle
              key={`preferred-${axis.key}`}
              cx={x}
              cy={y}
              r={4}
              fill={ACCENT}
              stroke="white"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Hover target zones (invisible, larger hit area) */}
        {AXES.map((axis) => {
          const { x, y } = polarToCartesian(cx, cy, maxRadius, axis.angle);
          return (
            <circle
              key={`hover-${axis.key}`}
              cx={x}
              cy={y}
              r={20}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() =>
                setTooltip({
                  visible: true,
                  x,
                  y,
                  label: axis.label,
                  currentVal: current[axis.key],
                  preferredVal: preferred[axis.key],
                })
              }
              onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
            />
          );
        })}

        {/* Axis labels */}
        {showLabels &&
          AXES.map((axis) => {
            const { x, y } = polarToCartesian(cx, cy, maxRadius + labelOffset, axis.angle);
            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            let dy = 0;
            if (axis.key === 'adhokrasi') {
              textAnchor = 'start';
              dy = 4;
            } else if (axis.key === 'hiyerarsi') {
              textAnchor = 'end';
              dy = 4;
            } else if (axis.key === 'klan') {
              dy = -4;
            } else if (axis.key === 'pazar') {
              dy = 14;
            }
            return (
              <text
                key={`axis-label-${axis.key}`}
                x={x}
                y={y}
                dy={dy}
                fontSize={13}
                fontWeight={600}
                fill="#334155"
                textAnchor={textAnchor}
              >
                {axis.label}
              </text>
            );
          })}

        {/* Tooltip */}
        {tooltip.visible && (
          <g>
            <rect
              x={tooltip.x - 70}
              y={tooltip.y - 52}
              width={140}
              height={44}
              rx={6}
              fill="white"
              stroke="#e2e8f0"
              strokeWidth={1}
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 34}
              fontSize={12}
              fontWeight={600}
              fill="#1e293b"
              textAnchor="middle"
            >
              {tooltip.label}
            </text>
            <text
              x={tooltip.x}
              y={tooltip.y - 18}
              fontSize={11}
              fill="#64748b"
              textAnchor="middle"
            >
              Mevcut: {tooltip.currentVal} | Tercih: {tooltip.preferredVal}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: PRIMARY, opacity: 0.6 }}
          />
          Mevcut
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-dashed"
            style={{ borderColor: ACCENT, backgroundColor: ACCENT, opacity: 0.6 }}
          />
          Tercih Edilen
        </div>
      </div>
    </div>
  );
}
