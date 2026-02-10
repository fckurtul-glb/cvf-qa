'use client';
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
export function RadarChart({ size = 300 }: { size?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { /* D3 radar chart implementation */ }, [size]);
  return <svg ref={ref} width={size} height={size} />;
}
