import React, { useState } from 'react';
import { money, dateStr } from '../utils.js';

export default function CardDetail({ card, onClose, onSave, onDelete }) {
  const [sellMode, setSellMode] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10));
  const [soldSource, setSoldSource] = useState('eBay');

  if (!card) return null;

  async function markSold() {
    await onSave({
      ...card,
      status: 'sold',
      soldPrice: soldPrice ? Number(soldPrice) : null,
      soldDate: new Date(soldDate).getTime(),
      soldSource
    });
    setSellMode(false);
    onClose();
  }

  async function reopen() {
    await onSave({ ...card, status: 'owned', soldPrice: null, soldDate: null, soldSource: null });
  }

  const profit = card.status === 'sold' && card.soldPrice != null && card.purchasePrice != null
    ? card.soldPrice - card.purchasePrice
    : null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {card.imageDataUrl && (
          <div className="capture-preview" style={{ marginBottom: card.backImageDataUrl ? 8 : 14, display: 'flex', gap: 8 }}>
            <img src={card.imageDataUrl} alt={card.player} style={{ flex: 1 }} />
            {card.backImageDataUrl && <img src={card.backImageDataUrl} alt={`${card.player} back`} style={{ flex: 1 }} />}
          </div>
        )}
        <h2>{card.player}</h2>
        <div className="meta-line">
          {[card.year, card.set, card.parallel, card.cardNumber && `#${card.cardNumber}`].filter(Boolean).join(' · ')}
        </div>

        {card.gradingCompany && (
          <div className="row-line"><span className="k">Grade</span><span className="v">{card.gradingCompany} {card.grade}</span></div>
        )}
        <div className="row-line"><span className="k">Sport</span><span className="v">{card.sport}</span></div>
        <div className="row-line"><span className="k">Estimated value</span><span className="v">{money(card.estimatedValue)}</span></div>

        <div className="divider" />

        <div className="row-line"><span className="k">Bought for</span><span className="v">{money(card.purchasePrice)}</span></div>
        <div className="row-line"><span className="k">Purchase date</span><span className="v">{dateStr(card.purchaseDate)}</span></div>
        <div className="row-line"><span className="k">Source</span><span className="v">{card.purchaseSource || '—'}</span></div>

        {card.status === 'sold' && (
          <>
            <div className="divider" />
            <div className="row-line"><span className="k">Sold for</span><span className="v">{money(card.soldPrice)}</span></div>
            <div className="row-line"><span className="k">Sold date</span><span className="v">{dateStr(card.soldDate)}</span></div>
            {profit !== null && (
              <div className="row-line">
                <span className="k">Profit / loss</span>
                <span className="v" style={{ color: profit >= 0 ? 'var(--stripe-baseball)' : 'var(--danger)' }}>
                  {profit >= 0 ? '+' : ''}{money(profit)}
                </span>
              </div>
            )}
          </>
        )}

        {card.notes && <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: 12 }}>{card.notes}</p>}

        <div className="divider" />

        {card.status === 'owned' && !sellMode && (
          <button className="btn btn-brass" onClick={() => setSellMode(true)} style={{ marginBottom: 10 }}>
            Mark as sold
          </button>
        )}

        {sellMode && (
          <div style={{ marginBottom: 10 }}>
            <div className="field-group">
              <label>Sold for ($)</label>
              <input type="number" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Sold date</label>
              <input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Sold via</label>
              <input value={soldSource} onChange={(e) => setSoldSource(e.target.value)} />
            </div>
            <button className="btn btn-brass" onClick={markSold}>Confirm sale</button>
          </div>
        )}

        {card.status === 'sold' && (
          <button className="btn btn-ghost" onClick={reopen} style={{ marginBottom: 10 }}>
            Undo sale / mark as owned again
          </button>
        )}

        <button className="btn btn-danger" onClick={() => { onDelete(card.id); onClose(); }}>
          Delete card
        </button>
      </div>
    </div>
  );
}
