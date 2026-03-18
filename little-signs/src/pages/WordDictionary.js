import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './WordDictionary.css';

const DRIVE_API_KEY  = process.env.REACT_APP_DRIVE_API_KEY || '';
const ROOT_FOLDER_ID = '1U-Pr4r1-cupgNOOq9NH_uTsQnPSVEKco';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const driveEmbed     = (id) => `https://drive.google.com/file/d/${id}/preview`;

export default function WordDictionary() {
  const { user, authFetch } = useAuth();  // ← ADD THIS

  const [allWords,     setAllWords]     = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [activeLetter, setActiveLetter] = useState('ALL');
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selected,     setSelected]     = useState(null);
  const [particles,    setParticles]    = useState([]);
  const [configured,   setConfigured]   = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setParticles(Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      dur: 4 + Math.random() * 8,
      delay: Math.random() * 6,
      color: ['#9d4dff','#ff4d9e','#00e5ff','#ffeb4d','#4BB543'][Math.floor(Math.random() * 5)],
    })));
    setConfigured(
      DRIVE_API_KEY !== 'YOUR_GOOGLE_API_KEY' &&
      ROOT_FOLDER_ID !== 'YOUR_ROOT_FOLDER_ID'
    );
  }, []);

  const fetchFolder = useCallback(async (folderId) => {
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${DRIVE_API_KEY}&pageSize=1000`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
    const data = await res.json();
    return data.files || [];
  }, []);

  const loadDictionary = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const root    = await fetchFolder(ROOT_FOLDER_ID);
      const words   = [];
      const folders = root.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      const files   = root.filter(f => f.mimeType.startsWith('video/') || f.name.endsWith('.mp4'));

      if (folders.length > 0) {
        const results = await Promise.allSettled(
          folders.map(async (folder) => {
            const letter = folder.name.toUpperCase().charAt(0);
            const items  = await fetchFolder(folder.id);
            return items
              .filter(f => f.mimeType.startsWith('video/') || f.name.endsWith('.mp4'))
              .map(f => ({ id: f.id, name: f.name.replace(/\.[^.]+$/, ''), letter }));
          })
        );
        results.forEach(r => { if (r.status === 'fulfilled') words.push(...r.value); });
      } else {
        files.forEach(f => {
          const name   = f.name.replace(/\.[^.]+$/, '');
          const letter = name.charAt(0).toUpperCase();
          words.push({ id: f.id, name, letter });
        });
      }
      words.sort((a, b) => a.name.localeCompare(b.name));
      setAllWords(words);
      setFiltered(words);
    } catch (err) {
      setError(err.message || 'Failed to load dictionary');
    } finally {
      setLoading(false);
    }
  }, [configured, fetchFolder]);

  useEffect(() => { loadDictionary(); }, [loadDictionary]);

  useEffect(() => {
    let list = allWords;
    if (activeLetter !== 'ALL') list = list.filter(w => w.letter === activeLetter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(w => w.name.toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [allWords, activeLetter, search]);

  // ── Track word view ────────────────────────────────────────────────────────
  const trackWordView = useCallback((word) => {
    if (!user || !authFetch) return;
    authFetch('/learner/progress', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type:   'dictionary',
        is_correct:  true,
        confidence:  1.0,
        score_delta: 1,
        letter:      word.letter,
        word_name:   word.name,   // extra context
      }),
    }).catch(console.error);
  }, [user, authFetch]);

  // ── Select word + track ───────────────────────────────────────────────────
  const handleWordSelect = useCallback((word) => {
    if (selected?.id === word.id) {
      setSelected(null);
      return;
    }
    setSelected(word);
    trackWordView(word);  // ← TRACK IT
  }, [selected, trackWordView]);

  const handleLetterClick = (letter) => {
    setActiveLetter(letter);
    setSearch('');
    setSelected(null);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setActiveLetter('ALL');
  };

  const letterCounts = ALPHABET.reduce((acc, l) => {
    acc[l] = allWords.filter(w => w.letter === l).length;
    return acc;
  }, {});

  return (
    <div className="wd-root">
      <div className="wd-nebula">
        {particles.map(p => (
          <div key={p.id} className="wd-particle" style={{
            left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size,
            background:p.color,
            animationDuration:`${p.dur}s`,
            animationDelay:`${p.delay}s`,
          }}/>
        ))}
        <div className="wd-glow wd-g1"/>
        <div className="wd-glow wd-g2"/>
        <div className="wd-glow wd-g3"/>
      </div>

      <header className="wd-header">
        <Link to="/home" className="wd-back">← Home</Link>
        <div className="wd-header-center">
          <h1 className="wd-title">📖 ISL Word Dictionary</h1>
          <p className="wd-subtitle">Official ISLRTC Sign Language Videos</p>
        </div>
        <div className="wd-header-right">
          {allWords.length > 0 && (
            <div className="wd-count-pill">{allWords.length} words</div>
          )}
        </div>
      </header>

      {!configured && (
        <div className="wd-setup-banner">
          <div className="wd-setup-inner">
            <div className="wd-setup-icon">⚙️</div>
            <div>
              <h3>Setup Required</h3>
              <p>Open <code>WordDictionary.js</code> and fill in your Google Drive API key and folder ID.</p>
            </div>
          </div>
        </div>
      )}

      <div className="wd-body">
        <div className="wd-left">
          <div className="wd-search-wrap">
            <span className="wd-search-icon">🔍</span>
            <input
              ref={searchRef}
              type="text"
              className="wd-search"
              placeholder="Search any ISL word..."
              value={search}
              onChange={handleSearch}
            />
            {search && (
              <button className="wd-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <div className="wd-alpha-wrap">
            <button
              className={`wd-alpha-btn ${activeLetter === 'ALL' ? 'active' : ''}`}
              onClick={() => handleLetterClick('ALL')}
            >ALL</button>
            {ALPHABET.map(l => (
              <button
                key={l}
                className={`wd-alpha-btn ${activeLetter === l ? 'active' : ''} ${letterCounts[l] === 0 ? 'empty' : ''}`}
                onClick={() => handleLetterClick(l)}
              >
                {l}
                {letterCounts[l] > 0 && <span className="wd-alpha-count">{letterCounts[l]}</span>}
              </button>
            ))}
          </div>

          <div className="wd-results-info">
            {loading ? <span>Loading dictionary...</span> : (
              <span>{filtered.length === 0 ? 'No words found' : `${filtered.length} word${filtered.length !== 1 ? 's' : ''}`}</span>
            )}
          </div>

          {loading && (
            <div className="wd-loading">
              <div className="wd-spinner"/>
              <p>Loading dictionary from Google Drive...</p>
            </div>
          )}

          {error && (
            <div className="wd-error">
              <div>⚠️ {error}</div>
              <button onClick={loadDictionary}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <div className="wd-word-grid">
              {filtered.map(word => (
                <button
                  key={word.id}
                  className={`wd-word-btn ${selected?.id === word.id ? 'active' : ''}`}
                  onClick={() => handleWordSelect(word)}  // ← uses new handler
                >
                  <span className="wd-word-letter">{word.letter}</span>
                  <span className="wd-word-name">{word.name}</span>
                  {selected?.id === word.id && <span className="wd-word-playing">▶</span>}
                </button>
              ))}
              {filtered.length === 0 && !loading && configured && (
                <div className="wd-empty">
                  <div className="wd-empty-icon">🔍</div>
                  <p>No words found for "{search || activeLetter}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="wd-right">
          {!selected ? (
            <div className="wd-player-idle">
              <div className="wd-idle-orb">
                <div className="wd-idle-ring wd-r1"/>
                <div className="wd-idle-ring wd-r2"/>
                <div className="wd-idle-ring wd-r3"/>
                <div className="wd-idle-core">📖</div>
              </div>
              <h3 className="wd-idle-title">Select a Word</h3>
              <p className="wd-idle-sub">
                {configured
                  ? 'Choose any word to watch the official ISL tutor video'
                  : 'Configure your Google Drive API key to load the ISLRTC dictionary'}
              </p>
            </div>
          ) : (
            <div className="wd-player-active">
              <div className="wd-player-header">
                <div className="wd-player-word-wrap">
                  <div className="wd-player-letter-badge">{selected.letter}</div>
                  <div>
                    <h2 className="wd-player-word">{selected.name}</h2>
                    <div className="wd-player-label">ISL Sign — ISLRTC Official</div>
                  </div>
                </div>
                <button className="wd-player-close" onClick={() => setSelected(null)}>✕</button>
              </div>

              <div className="wd-video-wrap">
                <iframe
                  key={selected.id}
                  src={driveEmbed(selected.id)}
                  className="wd-video"
                  allow="autoplay"
                  allowFullScreen
                  title={`ISL sign for ${selected.name}`}
                />
              </div>

              <div className="wd-player-actions">
                <a
                  href={`https://drive.google.com/file/d/${selected.id}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="wd-action-btn"
                >↗ Open Full Screen</a>
                <Link to="/sentence-builder" className="wd-action-btn secondary">
                  ✍️ Practice Spelling
                </Link>
              </div>

              <div className="wd-related">
                <div className="wd-related-label">More words with "{selected.letter}":</div>
                <div className="wd-related-chips">
                  {allWords
                    .filter(w => w.letter === selected.letter && w.id !== selected.id)
                    .slice(0, 8)
                    .map(w => (
                      <button key={w.id} className="wd-related-chip"
                        onClick={() => handleWordSelect(w)}>
                        {w.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
