import React, { useRef, useState } from 'react';
import { identifyCard } from '../api.js';
import { fileToBase64, resizeImage, SPORTS } from '../utils.js';
import { newId } from '../db.js';

const BLANK_FORM = {
  player: '', year: '', set: '', parallel: '', cardNumber: '',
  sport: 'Baseball', gradingCompany: '', grade: '',
  estimatedValue: '', purchasePrice: '', purchaseDate: '', purchaseSource: 'eBay',
  confidence: null, notes: ''
};

export default function CardCapture({ onSave }) {
  const fileInputRef = useRef(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [identified, setIdentified] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIdentified(false);
    const raw = await fileToBase64(file);
    const resized = await resizeImage(raw);
    setImageDataUrl(resized);
    setForm(BLANK_FORM);
  }

  async function handleIdentify() {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    try {
      const mediaType = imageDataUrl.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
      const base64 = imageDataUrl.split(',')[1];
      const result = await identifyCard(base64, mediaType);
      setForm((f) => ({
        ...f,
        player: result.player || '',
        year: result.year || '',
        set: result.set || '',
        parallel: result.parallel || '',
        cardNumber: result.cardNumber || '',
        sport: SPORTS.includes(result.sport) ? result.sport : 'Other',
        gradingCompany: result.gradingCompany || '',
        grade: result.grade || '',
        estimatedValue: result.estimatedValue ?? '',
        confidence: result.confidence || null,
        notes: result.notes || ''
      }));
      setIdentified(true);
    } catch (err) {
      setError(err.message || 'Could not identify this card. You can still fill it in manually below.');
      setIdentified(true); // let them proceed manually
    } finally {
      setLoading(false);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function reset() {
    setImageDataUrl(null);
    setForm(BLANK_FORM);
    setIdentified(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    if (!form.player) {
      setError('Give the card at least a player name before saving.');
      return;
    }
    const card = {
      id: newId(),
      imageDataUrl,
      player: form.player,
      year: form.year,
      set: form.set,
      parallel: form.parallel,
      cardNumber: form.cardNumber,
      sport: form.sport,
      gradingCompany: form.gradingCompany,
      grade: form.grade,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
      valueUpdatedAt: Date.now(),
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).getTime() : Date.now(),
      purchaseSource: form.purchaseSource,
      status: 'owned',
      soldPrice: null,
      soldDate: null,
      soldSource: null,
      confidence: form.confidence,
      notes: form.notes
    };
    await onSave(card);
    reset();
  }

  return (
    <div className="capture-screen">
      <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Add a card</span>

      {!imageDataUrl && (
        <div
          className="capture-drop"
          onClick={() => fileInputRef.current?.click()}
        >
          Tap to take a photo or choose one from your library.
          <br />Front of the card works best — back if the grade label is there.
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {imageDataUrl && (
        <div className="capture-preview">
          <img src={imageDataUrl} alt="Captured card" />
        </div>
      )}

      {imageDataUrl && !identified && (
        <button className="btn btn-brass" onClick={handleIdentify} disabled={loading} style={{ marginBottom: 10 }}>
          {loading ? 'Reading the card…' : 'Identify card & get value'}
        </button>
      )}

      {imageDataUrl && (
        <button className="btn btn-ghost" onClick={reset} style={{ marginBottom: 16 }}>
          Retake photo
        </button>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

      {identified && (
        <>
          {form.confidence && (
            <span className={`confidence-flag ${form.confidence}`}>
              {form.confidence} confidence match
            </span>
          )}
          {form.notes && <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: -4 }}>{form.notes}</p>}

          <div className="field-group">
            <label>Player</label>
            <input value={form.player} onChange={(e) => update('player', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Year</label>
              <input value={form.year} onChange={(e) => update('year', e.target.value)} />
            </div>
            <div className="field-group" style={{ flex: 2 }}>
              <label>Sport</label>
              <select value={form.sport} onChange={(e) => update('sport', e.target.value)}>
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field-group">
            <label>Set</label>
            <input value={form.set} onChange={(e) => update('set', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Parallel / #'d</label>
              <input value={form.parallel} onChange={(e) => update('parallel', e.target.value)} />
            </div>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Card #</label>
              <input value={form.cardNumber} onChange={(e) => update('cardNumber', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Grading co.</label>
              <input value={form.gradingCompany} onChange={(e) => update('gradingCompany', e.target.value)} placeholder="PSA / BGS / raw" />
            </div>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Grade</label>
              <input value={form.grade} onChange={(e) => update('grade', e.target.value)} />
            </div>
          </div>

          <div className="divider" />

          <div className="field-group">
            <label>Estimated market value ($)</label>
            <input type="number" value={form.estimatedValue} onChange={(e) => update('estimatedValue', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field-group" style={{ flex: 1 }}>
              <label>What you paid ($)</label>
              <input type="number" value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} />
            </div>
            <div className="field-group" style={{ flex: 1 }}>
              <label>Purchase date</label>
              <input type="date" value={form.purchaseDate} onChange={(e) => update('purchaseDate', e.target.value)} />
            </div>
          </div>
          <div className="field-group">
            <label>Bought from</label>
            <input value={form.purchaseSource} onChange={(e) => update('purchaseSource', e.target.value)} />
          </div>

          <button className="btn btn-brass" onClick={handleSave}>Save to vault</button>
        </>
      )}
    </div>
  );
}
