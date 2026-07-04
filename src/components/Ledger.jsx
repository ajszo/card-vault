import React from 'react';
import { money, dateStr } from '../utils.js';

export default function Ledger({ cards }) {
  const events = [];
  cards.forEach((c) => {
    if (c.purchaseDate) {
      events.push({ type: 'buy', date: c.purchaseDate, card: c, amount: c.purchasePrice });
    }
    if (c.status === 'sold' && c.soldDate) {
      const profit = (c.soldPrice || 0) - (c.purchasePrice || 0);
      events.push({ type: 'sell', date: c.soldDate, card: c, amount: c.soldPrice, profit });
    }
  });
  events.sort((a, b) => b.date - a.date);

  if (events.length === 0) {
    return <div className="ledger-screen"><p style={{ color: 'var(--ink-dim)' }}>No buys or sales logged yet.</p></div>;
  }

  return (
    <div className="ledger-screen">
      <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Ledger</span>
      {events.map((e, i) => (
        <div className="ledger-entry" key={i}>
          <div>
            <div className="who">{e.card.player}</div>
            <div className="when">
              {e.type === 'buy' ? `Bought · ${e.card.purchaseSource || '—'}` : `Sold · ${e.card.soldSource || '—'}`}
              {' · '}{dateStr(e.date)}
            </div>
          </div>
          <div className={`amt ${e.type} ${e.type === 'sell' ? (e.profit >= 0 ? 'profit' : 'loss') : ''}`}>
            {e.type === 'buy' ? `-${money(e.amount)}` : (
              <>
                {money(e.amount)}
                <div style={{ fontSize: 11 }}>
                  {e.profit >= 0 ? '+' : ''}{money(e.profit)}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
