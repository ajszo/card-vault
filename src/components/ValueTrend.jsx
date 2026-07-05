import React from 'react';
import { money } from '../utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Finds the latest history point that's at least `daysAgo` old, so we can
// compute a real % change - returns null if history doesn't go back that far
// yet (honest "not enough data" rather than a fake number).
function pointNDaysAgo(history, daysAgo) {
  const threshold = Date.now() - daysAgo * DAY_MS;
  let candidate = null;
  for (const point of history) {
    if (point.date <= threshold) candidate = point;
  }
  return candidate;
}

function pctChange(from, to) {
  if (!from) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}

function TrendBadge({ label, pct }) {
  if (pct === null) return null;
  const up = pct > 0;
  const flat = pct === 0;
  const color = flat ? 'var(--ink-dim)' : up ? '#4F8F5B' : 'var(--danger)';
  const icon = flat ? '➡️' : up ? '📈' : '📉';
  return (
    <span style={{ fontSize: 11, color, marginRight: 10 }}>
      {icon} {up ? '+' : ''}{pct}% {label}
    </span>
  );
}

// Real value history, built from actual refreshes over time - not the
// one-off LLM guess a static page would show. Needs at least 2 points to
// draw a line at all, and needs history old enough to compute 6mo/1yr change.
export default function ValueTrend({ history }) {
  if (!history || history.length < 2) {
    return (
      <p style={{ fontSize: 11.5, color: 'var(--ink-dim)', fontStyle: 'italic', marginBottom: 10 }}>
        Value trend builds up as you refresh this card's price over time.
      </p>
    );
  }

  const sorted = [...history].sort((a, b) => a.date - b.date);
  const values = sorted.map((p) => p.value);
  const latest = values[values.length - 1];

  const W = 300, H = 70, pad = 6;
  const n = sorted.length;
  let min = Math.min(...values) * 0.95;
  let max = Math.max(...values) * 1.05;
  if (min === max) max = min + 1;

  const x = (i) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (H - pad * 2);

  const linePts = sorted.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const fillPts = `${linePts} ${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} ${x(0).toFixed(1)},${(H - pad).toFixed(1)}`;
  const up = latest >= values[0];
  const lineColor = up ? '#4F8F5B' : 'var(--danger)';

  const trend6mo = pctChange(pointNDaysAgo(sorted, 182)?.value, latest);
  const trend1yr = pctChange(pointNDaysAgo(sorted, 365)?.value, latest);

  return (
    <div style={{ marginBottom: 14, padding: '10px 4px 2px' }}>
      <div style={{ fontSize: 11, color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Value trend
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 60, display: 'block' }}>
        <polygon points={fillPts} fill={lineColor} opacity={0.08} stroke="none" />
        <polyline points={linePts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(latest)} r="3.5" fill={lineColor} />
      </svg>
      <div style={{ marginTop: 6 }}>
        <TrendBadge label="6mo" pct={trend6mo} />
        <TrendBadge label="1yr" pct={trend1yr} />
        <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Current: <span style={{ color: 'var(--brass)' }}>{money(latest)}</span></span>
      </div>
    </div>
  );
}
