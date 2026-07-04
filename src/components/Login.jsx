import React, { useState } from 'react';
import { login, signup } from '../auth.js';

export default function Login({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = mode === 'login' ? await login(username, passcode) : await signup(username, passcode);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="eyebrow">{mode === 'login' ? 'Sign in' : 'Create a profile'}</span>
        <h1>Card Vault</h1>
      </header>

      <form onSubmit={submit} style={{ padding: '0 16px' }}>
        <div className="field-group">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
          />
        </div>
        <div className="field-group">
          <label>Passcode</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

        <button className="btn btn-brass" type="submit" disabled={loading} style={{ marginBottom: 10 }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create profile'}
        </button>
      </form>

      <button
        className="btn btn-ghost"
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
        style={{ marginLeft: 16 }}
      >
        {mode === 'login' ? 'Need a profile? Create one' : 'Already have a profile? Sign in'}
      </button>
    </div>
  );
}
