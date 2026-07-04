import React, { useEffect, useMemo, useState } from 'react';
import CardCapture from './components/CardCapture.jsx';
import CardGrid, { StatsBar } from './components/CardGrid.jsx';
import CardDetail from './components/CardDetail.jsx';
import Ledger from './components/Ledger.jsx';
import Login from './components/Login.jsx';
import { getAllCards, saveCard, deleteCard } from './db.js';
import { SPORTS } from './utils.js';
import { fetchCurrentUser, logout } from './auth.js';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking session, null = logged out
  const [tab, setTab] = useState('collection'); // collection | capture | ledger
  const [cards, setCards] = useState([]);
  const [sportFilter, setSportFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [openCard, setOpenCard] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    getAllCards().then((c) => { setCards(c); setLoaded(true); });
  }, []);

  async function handleSaveCard(card) {
    const saved = await saveCard(card);
    setCards((prev) => {
      const others = prev.filter((c) => c.id !== saved.id);
      return [saved, ...others].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    });
    if (openCard && openCard.id === saved.id) setOpenCard(saved);
    setTab('collection');
  }

  async function handleDeleteCard(id) {
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (sportFilter !== 'All' && c.sport !== sportFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${c.player} ${c.year} ${c.set} ${c.parallel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cards, sportFilter, search]);

  if (user === undefined) {
    return <div className="app" />;
  }

  if (!user) {
    return <Login onAuthed={setUser} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="eyebrow">Est. this season</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{user.username}'s Card Vault</h1>
          <button
            className="btn btn-ghost"
            style={{ padding: '3px 10px', fontSize: 12 }}
            onClick={async () => { await logout(); setUser(null); }}
          >
            Log out
          </button>
        </div>
      </header>

      {tab === 'collection' && (
        <>
          <StatsBar cards={cards} />
          <div className="chip-row">
            {['All', ...SPORTS].map((s) => (
              <button
                key={s}
                className={`chip ${sportFilter === s ? 'active' : ''}`}
                onClick={() => setSportFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="search-box">
            <input
              placeholder="Search player, year, set…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {loaded && <CardGrid cards={filteredCards} onOpen={setOpenCard} />}
        </>
      )}

      {tab === 'capture' && <CardCapture onSave={handleSaveCard} />}

      {tab === 'ledger' && <Ledger cards={cards} />}

      {openCard && (
        <CardDetail
          card={openCard}
          onClose={() => setOpenCard(null)}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
        />
      )}

      <nav className="tab-bar">
        <button className={`tab-btn ${tab === 'collection' ? 'active' : ''}`} onClick={() => setTab('collection')}>
          <span className="icon">🗂️</span>Vault
        </button>
        <button className={`tab-btn ${tab === 'capture' ? 'active' : ''}`} onClick={() => setTab('capture')}>
          <span className="icon">📷</span>Add card
        </button>
        <button className={`tab-btn ${tab === 'ledger' ? 'active' : ''}`} onClick={() => setTab('ledger')}>
          <span className="icon">📒</span>Ledger
        </button>
      </nav>
    </div>
  );
}
