import React from 'react';
import { scarcityTier, scarcityBarWidth } from '../utils.js';

// Scarcity Index = 12-month sales / population count. Shown compact on card
// tiles and the capture form, or with the full formula breakdown in detail.
export default function ScarcityMeter({ index, popCount, sales12mo, compact = false }) {
  const tier = scarcityTier(index);
  const display = index === null || index === undefined ? 'N/A' : `${index.toFixed(1)}%`;

  return (
    <div style={{ marginBottom: compact ? 6 : 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: compact ? 10 : 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
          Scarcity Index™
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 11.5 : 13, fontWeight: 700, color: tier.color }}>
          {display} {tier.icon} {tier.label}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--felt-line)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${scarcityBarWidth(index)}%`, background: tier.color, borderRadius: 3 }} />
      </div>
      {!compact && index !== null && index !== undefined && (
        <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 6, fontStyle: 'italic' }}>
          {sales12mo} sales (12mo) ÷ {popCount} pop = {display}
        </p>
      )}
    </div>
  );
}
