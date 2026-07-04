import React from 'react';
import { money, dateStr } from '../utils.js';

// Shows the individual sold comps a price lookup was based on, each linking
// out to the actual listing so the number can be double-checked.
export default function CompsList({ comps }) {
  if (!comps || comps.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <span className="eyebrow" style={{ fontSize: 11 }}>Recent sold comps</span>
      <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0' }}>
        {comps.map((c, i) => (
          <li
            key={i}
            title={c.title || ''}
            style={{
              display: 'flex', justifyContent: 'space-between', gap: 8,
              padding: '5px 0', fontSize: 12.5, borderBottom: '1px solid var(--felt-line)'
            }}
          >
            <span style={{ color: 'var(--ink-dim)' }}>
              {dateStr(c.date ? new Date(c.date).getTime() : null)} · {c.source || 'Unknown source'}
            </span>
            {c.url
              ? <a href={c.url} target="_blank" rel="noopener noreferrer">{money(c.price)}</a>
              : <span>{money(c.price)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
