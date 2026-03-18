import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ISLLibrary.css';

const LIBRARY_DATA = {
  Maths: [
    { id: 'v4Msfk4kDQo', title: 'Number Properties - Associative' },
    { id: 'cwA_q-hjCLw', title: 'Basic Geometrical Ideas - Straight Angle' },
    { id: '2lDwGej4mLg', title: 'Basic Geometrical Ideas - Circle' },
    { id: 'lY9btE3gK0c', title: 'Basic Geometrical Ideas - Reflex Angle' },
    { id: 'SsOGclonK-M', title: 'Basic Geometrical Ideas - Vertex' },
    { id: 'vUylkFh1434', title: 'Basic Geometrical Ideas - Acute Angle' },
    { id: 'oKOt_zF5tdw', title: 'Basic Geometrical Ideas - Arms' },
  ],
  English: [
    { id: 'WRubImpAXHE', title: 'English Concepts - Part 1' },
    { id: 'syNERDRrTAE', title: 'English Concepts - Part 2' },
    { id: 'THOC6x15CaE', title: 'English Concepts - Part 3' },
    { id: 'Vqie6B4jPD0', title: 'English Concepts - Part 4' },
    { id: 'E_gm6ysZP9Y', title: 'English Concepts - Part 5' },
    { id: 'TLbEBqp-RGI', title: 'English Concepts - Part 6' },
    { id: 'WrT4-AtWaxY', title: 'English Concepts - Part 7' },
  ],
  History: [
    { id: 'lzul8cnDIf0', title: 'History Concepts - Part 1' },
    { id: 'i1ve1mva9w4', title: 'History Concepts - Part 2' },
    { id: 'zQ6PD1QeXK0', title: 'History Concepts - Part 3' },
    { id: 'g2eGsBdbqes', title: 'History Concepts - Part 4' },
    { id: 'OedfaxjeFQA', title: 'History Concepts - Part 5' },
    { id: '7KYq8DvAnwY', title: 'History Concepts - Part 6' },
  ],
  Science: [
    { id: 'NOW8jZ8tUmM', title: 'Science Concepts - Part 1' },
    { id: '37DUnw7VMHs', title: 'Science Concepts - Part 2' },
    { id: 'AUelwhztcDE', title: 'Science Concepts - Part 3' },
    { id: 'bztyJfp2Nag', title: 'Science Concepts - Part 4' },
    { id: 'vmTqTXjfbZc', title: 'Science Concepts - Part 5' },
    { id: 'LPjEL6HT2fw', title: 'Science Concepts - Part 6' },
  ],
  Geography: [
    { id: '3uzqiCaCZJo', title: 'Geography Concepts - Part 1' },
    { id: 'H6_vJvKM63E', title: 'Geography Concepts - Part 2' },
    { id: '45NjHcX_L8w', title: 'Geography Concepts - Part 3' },
    { id: 'OwP2F4WVaHs', title: 'Geography Concepts - Part 4' },
    { id: 'iDgKptjdJMg', title: 'Geography Concepts - Part 5' },
    { id: 'ap4WYZBw_k4', title: 'Geography Concepts - Part 6' },
    { id: 'Wc1o3f7qbbw', title: 'Geography Concepts - Part 7' },
  ],
  Civics: [
    { id: 'fb1bIhDo8S4', title: 'Civics Concepts - Part 1' },
    { id: 'LmYTm7MU4vA', title: 'Civics Concepts - Part 2' },
    { id: 'w_FKZNl_RdU', title: 'Civics Concepts - Part 3' },
    { id: 'XNCPvww81B0', title: 'Civics Concepts - Part 4' },
    { id: 'B-9PJ-jGZ54', title: 'Civics Concepts - Part 5' },
    { id: '8aIYlVugjiU', title: 'Civics Concepts - Part 6' },
    { id: 'PaVAif2s0Oo', title: 'Civics Concepts - Part 7' },
    { id: '57LdVre8igU', title: 'Civics Concepts - Part 8' },
  ],
};

const SUBJECTS = [
  { id: 'Maths',     color: '#ff6b6b', glow: 'rgba(255,107,107,0.4)' },
  { id: 'Science',   color: '#48dbfb', glow: 'rgba(72,219,251,0.4)'  },
  { id: 'English',   color: '#ff9ff3', glow: 'rgba(255,159,243,0.4)' },
  { id: 'History',   color: '#ffd32a', glow: 'rgba(255,211,42,0.4)'  },
  { id: 'Geography', color: '#0be881', glow: 'rgba(11,232,129,0.4)'  },
  { id: 'Civics',    color: '#a29bfe', glow: 'rgba(162,155,254,0.4)' },
];

const toEmbed = (id) => `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
const toThumb = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
const toGif   = (id) => `/images/gifs/${id}.gif`;

export default function ISLLibrary() {
  const { authFetch, user } = useAuth();
  const starsRef = useRef(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    const c = starsRef.current;
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 150; i++) {
      const s = document.createElement('div');
      s.className = 'lib-star';
      const sz = Math.random() * 1.8;
      s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${2+Math.random()*5}s;animation-delay:${Math.random()*5}s;`;
      c.appendChild(s);
    }
  }, []);

  const trackView = (subjectId) => {
    if (!user || !authFetch) return;
    authFetch('/learner/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: 'dictionary', is_correct: true,
        confidence: 1.0, score_delta: 1,
        letter: subjectId[0], word_name: subjectId,
      }),
    }).catch(console.error);
  };

  const handleSubject = (sub) => {
    setActiveSubject(sub);
    setSelectedVideo(null);
    trackView(sub.id);
  };

  const active    = activeSubject ? SUBJECTS.find(s => s.id === activeSubject.id) : null;
  const videos    = activeSubject ? LIBRARY_DATA[activeSubject.id] || [] : [];
  const totalVids = Object.values(LIBRARY_DATA).flat().length;

  return (
    <div className="lib-root">
      <div className="lib-stars" ref={starsRef} />
      <div className="lib-nebula">
        <div className="lib-orb lib-o1" />
        <div className="lib-orb lib-o2" />
        <div className="lib-orb lib-o3" />
      </div>

      {/* ── Header ── */}
      <header className="lib-header">
        <Link to="/home" className="lib-back">← Home</Link>
        <div className="lib-hc">
          <h1 className="lib-logo">📚 ISL Learning Library</h1>
          <p className="lib-tagline">Official ISLRTC Educational Videos · {totalVids} Videos · 6 Subjects</p>
        </div>
        <Link to="/word-dictionary" className="lib-dictbtn">📖 Dictionary →</Link>
      </header>

      {/* ── Main ── */}
      <div className="lib-main">

        {/* LEFT SIDEBAR */}
        <aside className="lib-sidebar">
          <p className="lib-sidebar-label">Subjects</p>

          {SUBJECTS.map((sub, i) => (
            <button
              key={sub.id}
              className={`lib-srow ${activeSubject?.id === sub.id ? 'lib-srow--active' : ''}`}
              style={{ '--c': sub.color, '--g': sub.glow, animationDelay: `${i*0.06}s` }}
              onClick={() => handleSubject(sub)}
            >
              <div className="lib-srow-gif">
                <img src={toGif(sub.id)} alt={sub.id} />
              </div>
              <span className="lib-srow-name">{sub.id}</span>
              <span className="lib-srow-count">{LIBRARY_DATA[sub.id].length}</span>
              {activeSubject?.id === sub.id && <span className="lib-srow-bar" />}
            </button>
          ))}

          <Link to="/word-dictionary" className="lib-dictrow">
            <div className="lib-dictrow-gif">
              <span>📖</span>
            </div>
            <div>
              <div className="lib-dictrow-name">Word Dictionary</div>
              <div className="lib-dictrow-sub">1000+ ISLRTC signs</div>
            </div>
            <span className="lib-dictrow-arrow">→</span>
          </Link>
        </aside>

        {/* RIGHT CONTENT */}
        <section className="lib-content">

          {!activeSubject ? (
            /* ── IDLE ── */
            <div className="lib-idle">
              <div className="lib-idle-orb">
                <div className="lib-idle-r1" /><div className="lib-idle-r2" /><div className="lib-idle-r3" />
                <div className="lib-idle-core">📚</div>
              </div>
              <h2 className="lib-idle-h">Select a Subject</h2>
              <p className="lib-idle-p">Choose any subject from the sidebar to watch official ISLRTC sign language lessons</p>
              <div className="lib-idle-pills">
                {SUBJECTS.map(s => (
                  <button key={s.id} className="lib-idle-pill" style={{ '--c': s.color }}
                    onClick={() => handleSubject(s)}>
                    <img src={toGif(s.id)} alt={s.id} className="lib-pill-gif" />
                    {s.id}
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* ── PLAYER VIEW ── */
            <div className="lib-player">

              {/* Subject hero */}
              <div className="lib-hero" style={{ '--c': active?.color, '--g': active?.glow }}>
                <img src={toGif(active?.id)} alt="" className="lib-hero-gif" />
                <div className="lib-hero-mask" />
                <div className="lib-hero-info">
                  <h2 className="lib-hero-name">{active?.id}</h2>
                  <p className="lib-hero-meta">ISLRTC Official · {videos.length} Videos · Class VI · Indian Sign Language</p>
                </div>
                <div className="lib-hero-badge">{videos.length} videos</div>
              </div>

              {/* Embed player */}
              {selectedVideo && (
                <div className="lib-embed">
                  <div className="lib-embed-bar">
                    <span className="lib-embed-title">▶ {selectedVideo.title}</span>
                    <button className="lib-embed-x" onClick={() => setSelectedVideo(null)}>✕</button>
                  </div>
                  <div className="lib-embed-box">
                    <iframe
                      key={selectedVideo.id}
                      src={toEmbed(selectedVideo.id)}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Video grid */}
              <div className="lib-vgrid">
                {videos.map((v, i) => (
                  <button
                    key={v.id}
                    className={`lib-vcard ${selectedVideo?.id === v.id ? 'lib-vcard--active' : ''}`}
                    style={{ '--c': active?.color, animationDelay: `${i * 0.05}s` }}
                    onClick={() => setSelectedVideo(v)}
                  >
                    <div className="lib-vcard-thumb">
                      <img src={toThumb(v.id)} alt={v.title} />
                      <div className="lib-vcard-overlay">
                        <span className="lib-vcard-play">
                          {selectedVideo?.id === v.id ? '▶' : '▷'}
                        </span>
                      </div>
                      <span className="lib-vcard-num">{String(i+1).padStart(2,'0')}</span>
                    </div>
                    <div className="lib-vcard-info">
                      <p className="lib-vcard-title">{v.title}</p>
                      <p className="lib-vcard-sub">ISLRTC · ISL · Class VI</p>
                    </div>
                    {selectedVideo?.id === v.id && (
                      <div className="lib-vcard-bars">
                        <span/><span/><span/>
                      </div>
                    )}
                  </button>
                ))}
              </div>

            </div>
          )}
        </section>
      </div>
    </div>
  );
}
