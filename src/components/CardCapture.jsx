import React, { useRef, useState } from 'react';
import { identifyCard, priceCard } from '../api.js';
import { fileToBase64, resizeImage, SPORTS } from '../utils.js';
import { newId } from '../db.js';
import CompsList from './CompsList.jsx';
import ScarcityMeter from './ScarcityMeter.jsx';

const BLANK_FORM = {
  player: '', year: '', set: '', parallel: '', cardNumber: '',
  sport: 'Baseball', gradingCompany: '', grade: '',
  estimatedValue: '', purchasePrice: '', purchaseDate: '', purchaseSource: 'eBay',
  confidence: null, notes: '', comps: [], priceNotes: '',
  popCount: null, sales12mo: null, scarcityIndex: null
};

export default function CardCapture({ onSave }) {
  const fileInputRef = useRef(null);
  const backInputRef = useRef(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [rawFront, setRawFront] = useState(null);
  const [backImageDataUrl, setBackImageDataUrl] = useState(null);
  const [rawBack, setRawBack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [priceError, setPriceError] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [identified, setIdentified] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIdentified(false);
    const raw = await fileToBase64(file);
    setRawFront(raw);
    const resized = await resizeImage(raw);
    setImageDataUrl(resized);
    setForm(BLANK_FORM);
  }

  async function handleBackFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await fileToBase64(file);
    setRawBack(raw);
    const resized = await resizeImage(raw);
    setBackImageDataUrl(resized);
  }

  function removeBack() {
    setRawBack(null);
    setBackImageDataUrl(null);
    if (backInputRef.current) backInputRef.current.value = '';
  }

  async function handleIdentify() {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    setPriceError(null);
    let idResult;
    try {
      // Send a higher-res encode than what's stored/displayed, so the model
      // can read fine print (card numbers, serials, foil patterns).
      const frontForId = await resizeImage(rawFront, 1600, 0.92);
      const mediaType = frontForId.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
      const base64 = frontForId.split(',')[1];

      let backBase64, backMediaType;
      if (rawBack) {
        const backForId = await resizeImage(rawBack, 1600, 0.92);
        backMediaType = backForId.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
        backBase64 = backForId.split(',')[1];
      }

      idResult = await identifyCard(base64, mediaType, backBase64, backMediaType);
      setForm((f) => ({
        ...f,
        player: idResult.player || '',
        year: idResult.year || '',
        set: idResult.set || '',
        parallel: idResult.parallel || '',
        cardNumber: idResult.cardNumber || '',
        sport: SPORTS.includes(idResult.sport) ? idResult.sport : 'Other',
        gradingCompany: idResult.gradingCompany || '',
        grade: idResult.grade || '',
        confidence: idResult.confidence || null,
        notes: idResult.notes || ''
      }));
      setIdentified(true);
    } catch (err) {
      setError(err.message || 'Could not identify this card. You can still fill it in manually below.');
      setIdentified(true); // let them proceed manually
      setLoading(false);
      return;
    }
    setLoading(false);

    if (!idResult.player) return;
    setPricingLoading(true);
    try {
      const priceResult = await priceCard(idResult);
      setForm((f) => ({
        ...f,
        estimatedValue: priceResult.estimatedValue ?? '',
        comps: priceResult.comps || [],
        priceNotes: priceResult.notes || '',
        popCount: priceResult.popCount ?? null,
        sales12mo: priceResult.sales12mo ?? null,
        scarcityIndex: priceResult.scarcityIndex ?? null
      }));
    } catch (err) {
      setPriceError(err.message || 'Could not look up recent sales. You can still enter a value manually.');
    } finally {
      setPricingLoading(false);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function reset() {
    setImageDataUrl(null);
    setRawFront(null);
    setBackImageDataUrl(null);
    setRawBack(null);
    setForm(BLANK_FORM);
    setIdentified(false);
    setError(null);
    setPriceError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (backInputRef.current) backInputRef.current.value = '';
  }

  async function handleSave() {
    if (!form.player) {
      setError('Give the card at least a player name before saving.');
      return;
    }
    const estimatedValue = form.estimatedValue ? Number(form.estimatedValue) : null;
    const card = {
      id: newId(),
      imageDataUrl,
      backImageDataUrl: backImageDataUrl || null,
      player: form.player,
      year: form.year,
      set: form.set,
      parallel: form.parallel,
      cardNumber: form.cardNumber,
      sport: form.sport,
      gradingCompany: form.gradingCompany,
      grade: form.grade,
      estimatedValue,
      valueUpdatedAt: form.comps.length ? Date.now() : null,
      valueHistory: estimatedValue !== null ? [{ date: Date.now(), value: estimatedValue }] : [],
      priceComps: form.comps,
      priceNotes: form.priceNotes,
      popCount: form.popCount,
      sales12mo: form.sales12mo,
      scarcityIndex: form.scarcityIndex,
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
          <br />Start with the front — you can add a back photo next for better accuracy.
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
        <>
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleBackFile}
          />

          {!backImageDataUrl && (
            <button
              className="btn btn-ghost"
              onClick={() => backInputRef.current?.click()}
              style={{ marginBottom: 10 }}
            >
              + Add back of card (optional, improves accuracy)
            </button>
          )}

          {backImageDataUrl && (
            <div style={{ marginBottom: 10 }}>
              <div className="capture-preview">
                <img src={backImageDataUrl} alt="Captured card back" />
              </div>
              <button className="btn btn-ghost" onClick={removeBack}>Remove back photo</button>
            </div>
          )}

          <button className="btn btn-brass" onClick={handleIdentify} disabled={loading} style={{ marginBottom: 10 }}>
            {loading ? 'Reading the card…' : 'Identify card & get value'}
          </button>
        </>
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

          {pricingLoading && <p style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>Finding recent sold comps…</p>}
          {priceError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{priceError}</p>}

          <div className="field-group">
            <label>Estimated market value ($)</label>
            <input type="number" value={form.estimatedValue} onChange={(e) => update('estimatedValue', e.target.value)} />
          </div>
          {form.priceNotes && <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginTop: -4 }}>{form.priceNotes}</p>}
          {form.gradingCompany && (
            <ScarcityMeter index={form.scarcityIndex} popCount={form.popCount} sales12mo={form.sales12mo} compact />
          )}
          <CompsList comps={form.comps} />
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
