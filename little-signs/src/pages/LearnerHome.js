import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LearnerHome.css';

const PLANETS = [
  {
    id: 'alphabet',
    to: '/alphabet',
    emoji: '🔤',
    title: 'Alphabet Detection',
    subtitle: 'ISL Fingerspelling A–Z',
    desc: 'Show hand signs to the camera. AI detects your ISL letters in real-time with live feedback.',
    color1: '#9d4dff',
    color2: '#4d79ff',
    glow: '#9d4dff',
    tag: '🤖 AI Powered',
  },
  {
    id: 'numbers',
    to: '/numbers',
    emoji: '🔢',
    title: 'Number Signs',
    subtitle: 'Learn 0–9 in ISL',
    desc: 'Interactive number cards and a quiz to master ISL number signs from 0 to 9.',
    color1: '#ff8c4d',
    color2: '#ffeb4d',
    glow: '#ff8c4d',
    tag: '🎮 Interactive',
  },
  {
    id: 'word-dictionary',
    to: '/word-dictionary',
    emoji: '📖',
    title: 'ISL Word Dictionary',
    subtitle: 'Official ISLRTC Videos',
    desc: 'Thousands of ISL word signs with official government tutor videos. Search any word instantly.',
    color1: '#00e5ff',
    color2: '#4BB543',
    glow: '#00e5ff',
    tag: '🏛️ ISLRTC Official',
  },
  {
    id: 'sentence',
    to: '/sentence-builder',
    emoji: '✍️',
    title: 'Sentence Builder',
    subtitle: 'Sign → Words → Voice',
    desc: 'Sign letters continuously, auto-form words and sentences, then hear them spoken aloud.',
    color1: '#ff4d9e',
    color2: '#9d4dff',
    glow: '#ff4d9e',
    tag: '⚡ Real-time',
  },
];

export default function LearnerHome() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const starsRef  = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [showNav, setShowNav] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Generate starfield
  useEffect(() => {
    const c = starsRef.current;
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 300; i++) {
      const s = document.createElement('div');
      s.className = 'lh-star';
      const sz  = Math.random() * 2.5;
      const dur = (2 + Math.random() * 7) + 's';
      s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${dur};animation-delay:${Math.random()*7}s;`;
      c.appendChild(s);
    }
  }, []);

  return (
    <div className="lh-root">
      {/* Stars */}
      <div className="lh-stars" ref={starsRef} />

      {/* Nebula glows */}
      <div className="lh-nebula">
        <div className="lh-glow lh-g1" />
        <div className="lh-glow lh-g2" />
        <div className="lh-glow lh-g3" />
        <div className="lh-glow lh-g4" />
      </div>

      {/* Shooting stars */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="lh-shoot" style={{
          top: `${5 + i * 18}%`,
          animationDelay: `${i * 3}s`,
          animationDuration: `${5 + i * 0.5}s`,
        }} />
      ))}

      {/* Header */}
      <header className="lh-header">
        <div className="lh-brand">
          <div className="lh-brand-orb">🤟</div>
          <div>
            <div className="lh-brand-name">Little Signs</div>
            <div className="lh-brand-sub">ISL Learning Universe</div>
          </div>
        </div>

        <nav className="lh-nav">
          <Link to="/dashboard/learner" className="lh-nav-btn">📊 Progress</Link>
          <Link to="/about"             className="lh-nav-btn">ℹ️ About</Link>
          <button className="lh-nav-logout" onClick={handleLogout}>🚪 Logout</button>
        </nav>

        <button className="lh-hamburger" onClick={() => setShowNav(!showNav)}>
          {showNav ? '✕' : '☰'}
        </button>

        {showNav && (
          <div className="lh-mobile-nav">
            <Link to="/dashboard/learner" onClick={() => setShowNav(false)}>📊 My Progress</Link>
            <Link to="/about"             onClick={() => setShowNav(false)}>ℹ️ About</Link>
            <button onClick={handleLogout}>🚪 Logout</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="lh-hero">
        {user && (
          <div className="lh-welcome-pill">
            <span className="lh-pulse-dot" />
            Hey {user.name.split(' ')[0]}, ready to sign? ✨
          </div>
        )}

        <h1 className="lh-hero-h1">
          Your ISL Learning
          <br />
          <span className="lh-hero-gradient">Universe Awaits</span>
        </h1>

        <p className="lh-hero-p">
          4 powerful tools to master Indian Sign Language —
          from single letters to full spoken sentences
        </p>

        <a href="#features" className="lh-hero-btn">
          ✨ Explore Features
        </a>

        {/* Floating signs */}
        <div className="lh-floaters">
          {['A','✋','B','🤟','C','👋','D','✌️','E'].map((l, i) => (
            <span key={i} className="lh-floater" style={{
              left:              `${5 + i * 11}%`,
              top:               `${15 + (i % 4) * 18}%`,
              animationDelay:    `${i * 0.6}s`,
              animationDuration: `${4 + (i % 3)}s`,
              fontSize:          i % 2 === 0 ? '1.4rem' : '2rem',
              opacity:           0.15 + (i % 3) * 0.08,
            }}>{l}</span>
          ))}
        </div>
      </section>

      {/* 4 Planet Feature Cards */}
      <section className="lh-features" id="features">
        <div className="lh-feat-header">
          <h2 className="lh-feat-title">Choose Your Path</h2>
          <p className="lh-feat-sub">Each world is a complete ISL learning experience</p>
        </div>

        <div className="lh-grid">
          {PLANETS.map((p, idx) => (
            <Link
              key={p.id}
              to={p.to}
              className={`lh-card ${hovered === p.id ? 'lh-card-hov' : ''}`}
              style={{
                '--c1':   p.color1,
                '--c2':   p.color2,
                '--glow': p.glow,
              }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Background gradient */}
              <div className="lh-card-bg" />

              {/* Glow halo */}
              <div className="lh-card-halo" />

              {/* Tag */}
              <div className="lh-card-tag">{p.tag}</div>

              {/* Planet orb */}
              <div className="lh-orb">
                <div className="lh-orb-outer" />
                <div className="lh-orb-mid"   />
                <div className="lh-orb-inner">
                  <span className="lh-orb-emoji">{p.emoji}</span>
                </div>
              </div>

              {/* Text */}
              <h3 className="lh-card-h3">{p.title}</h3>
              <div className="lh-card-sub2">{p.subtitle}</div>
              <p className="lh-card-p">{p.desc}</p>

              {/* Launch */}
              <div className="lh-card-launch">
                Launch <span className="lh-arrow">→</span>
              </div>

              {/* Floating dots */}
              <div className="lh-dots">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="lh-dot" style={{
                    top:  `${10 + (i * 15) % 80}%`,
                    left: `${5  + (i * 17) % 90}%`,
                    animationDelay: `${i * 0.4}s`,
                  }} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="lh-stats">
        {[
          { icon:'🔤', num:'26',    lab:'ISL Letters'    },
          { icon:'🔢', num:'10',    lab:'Number Signs'   },
          { icon:'📖', num:'1000+', lab:'Word Signs'     },
          { icon:'🤖', num:'90%+',  lab:'AI Accuracy'   },
          { icon:'🔊', num:'Live',  lab:'Voice Output'  },
        ].map((s, i) => (
          <div key={i} className="lh-stat">
            <span className="lh-stat-icon">{s.icon}</span>
            <span className="lh-stat-num">{s.num}</span>
            <span className="lh-stat-lab">{s.lab}</span>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="lh-footer">
        <div className="lh-footer-inner">
          <div className="lh-footer-brand">🤟 Little Signs</div>
          <p className="lh-footer-p">Empowering ISL learning through technology</p>
          <div className="lh-footer-links">
            <Link to="/about">About</Link>
            <Link to="/dashboard/learner">My Progress</Link>
            <Link to="/sentence-builder">Sentence Builder</Link>
            <button onClick={handleLogout}>Logout</button>
          </div>
          <p className="lh-footer-copy">© 2024 Little Signs · Indian Sign Language Learning Platform</p>
        </div>
      </footer>
    </div>
  );
}
