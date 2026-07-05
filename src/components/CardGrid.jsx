import React from 'react';
import { money, stripeVar, scarcityTier } from '../utils.js';

export function StatsBar({ cards }) {
  const owned = cards.filter((c) => c.status === 'owned');
  const sold = cards.filter((c) => c.status === 'sold');

  const totalValue = owned.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  const totalInvested = owned.reduce((sum, c) => sum + (c.purchasePrice || 0), 0);
  const realized = sold.reduce((sum, c) => sum + ((c.soldPrice || 0) - (c.purchasePrice || 0)), 0);

  return (
    <div className="stats-strip">
      <div className="stat-cell">
        <div className="value">{owned.length}</div>
        <div className="label">Cards owned</div>
      </div>
      <div className="stat-cell">
        <div className="value">{money(totalValue)}</div>
        <div className="label">Vault value</div>
      </div>
      <div className={`stat-cell profit ${realized < 0 ? 'negative' : ''}`}>
        <div className="value">{realized >= 0 ? '+' : ''}{money(realized)}</div>
        <div className="label">Realized P/L</div>
      </div>
    </div>
  );
}

function CardTile({ card, onOpen }) {
  return (
    <div className={`card-tile ${card.status === 'sold' ? 'sold' : ''} ${card.gradingCompany ? 'foil' : ''}`} onClick={() => onOpen(card)}>
      <div className="stripe" style={{ background: stripeVar(card.sport) }} />
      <div className="thumb">
        {card.imageDataUrl && <img src={card.imageDataUrl} alt={card.player} />}
      </div>
      <div className="info">
        <div className="player">{card.player || 'Unnamed card'}</div>
        <div className="meta">{[card.year, card.set].filter(Boolean).join(' · ') || '—'}</div>
        <div className="value">{card.estimateType === 'unconfirmed' ? '~' : ''}{money(card.estimatedValue)}</div>
        {card.gradingCompany && card.scarcityIndex !== null && card.scarcityIndex !== undefined && (
          <div style={{ fontSize: 10, marginTop: 3, color: scarcityTier(card.scarcityIndex).color }}>
            {card.scarcityIndex.toFixed(1)}% {scarcityTier(card.scarcityIndex).icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardGrid({ cards, onOpen }) {
  if (cards.length === 0) {
    return (
      <div className="binder-grid">
        <div className="empty-state">No cards here yet. Add one from the Capture tab.</div>
      </div>
    );
  }
  return (
    <div className="binder-grid">
      {cards.map((c) => <CardTile key={c.id} card={c} onOpen={onOpen} />)}
    </div>
  );
}
