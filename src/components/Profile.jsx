import React, { useState } from 'react';
import { updateTheme, logout } from '../auth.js';

// Preview colors here mirror the palette overrides in styles.css - kept as
// plain values since we're rendering swatches for themes that aren't the
// currently-applied one, so their CSS custom properties aren't live.
const THEMES = [
  { id: 'forest', name: 'Forest', felt: '#161D18', accent: '#C9A227' },
  { id: 'moss', name: 'Moss', felt: '#1A1F17', accent: '#ABA45A' },
  { id: 'slate', name: 'Slate', felt: '#171B1F', accent: '#7FA3B8' },
  { id: 'clay', name: 'Clay', felt: '#1D1714', accent: '#C98B5C' },
  { id: 'plum', name: 'Plum', felt: '#1B171C', accent: '#A87FA8' }
];

export default function Profile({ user, onThemeChange, onLoggedOut }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function pickTheme(themeId) {
    if (themeId === user.theme || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateTheme(themeId);
      onThemeChange(themeId);
    } catch (err) {
      setError(err.message || 'Could not save theme');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="capture-screen">
      <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Profile</span>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, margin: '2px 0 16px' }}>
        {user.username}
      </h2>

      <div className="field-group">
        <label>Color scheme</label>
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-swatch ${user.theme === t.id ? 'selected' : ''}`}
            style={{ background: t.felt }}
            onClick={() => pickTheme(t.id)}
            disabled={saving}
          >
            <div className="dot" style={{ background: t.accent }} />
            <div className="name" style={{ color: t.accent }}>{t.name}</div>
          </button>
        ))}
      </div>

      <div className="divider" />

      <button
        className="btn btn-ghost"
        onClick={async () => { await logout(); onLoggedOut(); }}
      >
        Log out
      </button>
    </div>
  );
}
