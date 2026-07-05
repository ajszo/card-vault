import React, { useState } from 'react';
import { money, dateStr } from '../utils.js';
import { priceCard } from '../api.js';
import CompsList from './CompsList.jsx';
import ScarcityMeter from './ScarcityMeter.jsx';
import ValueTrend from './ValueTrend.jsx';

export default function CardDetail({ card, onClose, onSave, onDelete }) {
  const [sellMode, setSellMode] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10));
  const [soldSource, setSoldSource] = useState('eBay');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  if (!card) return null;

  async function refreshValue() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const priceResult = await priceCard(card);
      // A confirmed or unconfirmed estimate both count as a real refresh; only
      // a total lookup failure (no value at all) leaves the card unchanged.
      const succeeded = priceResult.estimatedValue != null;
      const history = card.valueHistory || [];
      await onSave({
        ...card,
        estimatedValue: priceResult.estimatedValue ?? card.estimatedValue,
        estimateType: priceResult.estimateType ?? card.estimateType,
        priceComps: priceResult.comps || [],
        priceNotes: priceResult.notes || '',
        popCount: priceResult.popCount ?? null,
        sales12mo: priceResult.sales12mo ?? null,
        scarcityIndex: priceResult.scarcityIndex ?? null,
        valueUpdatedAt: succeeded ? Date.now() : card.valueUpdatedAt,
        // Only log a new point when this refresh actually produced a fresh
        // value (confirmed or unconfirmed) - a failed lookup that falls back
        // to the old value isn't a real new data point for the trend.
        valueHistory: succeeded ? [...history, { date: Date.now(), value: priceResult.estimatedValue }] : history
      });
    } catch (err) {
      setRefreshError(err.message || 'Could not refresh the value right now.');
    } finally {
      setRefreshing(false);
    }
  }

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
        <div className="row-line">
          <span className="k">Estimated value</span>
          <span className="v">
            {money(card.estimatedValue)}
            {card.estimateType === 'unconfirmed' && (
              <span style={{ display: 'block', fontFamily: 'var(--font-body)', color: 'var(--danger)', fontSize: 10.5, textAlign: 'right' }}>
                unconfirmed estimate
              </span>
            )}
          </span>
        </div>
        {card.valueUpdatedAt && (
          <div className="row-line"><span className="k">Priced</span><span className="v">{dateStr(card.valueUpdatedAt)}</span></div>
        )}

        <button className="btn btn-ghost" onClick={refreshValue} disabled={refreshing} style={{ marginBottom: 8 }}>
          {refreshing ? 'Finding recent sales…' : 'Refresh value'}
        </button>
        {refreshError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{refreshError}</p>}
        {card.priceNotes && <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: -4 }}>{card.priceNotes}</p>}
        <ValueTrend history={card.valueHistory} />
        {card.gradingCompany && (
          <ScarcityMeter index={card.scarcityIndex} popCount={card.popCount} sales12mo={card.sales12mo} />
        )}
        <CompsList comps={card.priceComps} />

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
