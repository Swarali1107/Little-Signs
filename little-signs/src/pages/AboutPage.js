import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AboutPage.css';

const STATS = [
  { num: '1.8 Cr+', lab: 'Deaf people in India',   color: '#9d4dff' },
  { num: '99.96%',  lab: 'AI model accuracy',       color: '#00e5ff' },
  { num: '1000+',   lab: 'Official ISL word signs',  color: '#ff4d9e' },
  { num: '41',      lab: 'Subject videos',           color: '#ffeb4d' },
  { num: '3',       lab: 'User roles supported',     color: '#0be881' },
  { num: '100%',    lab: 'Free forever',             color: '#ff8c4d' },
];

const FEATURES = [
  { icon: '🤖', title: 'AI Sign Detection',  color: '#9d4dff', desc: 'Real-time ISL A–Z and 0–9 recognition using MediaPipe + TensorFlow — 99.96% accuracy' },
  { icon: '📚', title: 'ISL Library',        color: '#00e5ff', desc: 'Official ISLRTC educational videos for Maths, Science, English, History, Geography & Civics' },
  { icon: '✍️', title: 'Sentence Builder',   color: '#ff4d9e', desc: 'Sign letters → auto-forms words → speaks them aloud in Indian English using Web Speech API' },
  { icon: '🧠', title: 'ISL Buddy AI',       color: '#ffeb4d', desc: 'Personalized AI coach powered by Groq — knows your progress and guides your practice' },
  { icon: '👨‍👩‍👧', title: 'Parent Portal',  color: '#0be881', desc: 'Full child progress reports, weak sign identification & government scheme guidance' },
  { icon: '👩‍🏫', title: 'Teacher Portal',   color: '#ff8c4d', desc: 'Class analytics, student roster, weak spot detection and task assignment tools' },
];

const ABOUT_ISLRTC = [
  { icon: '🏛️', title: 'What is ISLRTC?',       desc: 'Indian Sign Language Research & Training Centre — established by Govt of India under Dept of Empowerment of Persons with Disabilities (DEPwD), Ministry of Social Justice.' },
  { icon: '📖', title: 'Official Dictionary',    desc: 'ISLRTC has documented 10,000+ ISL signs across categories — alphabets, numbers, everyday words, educational concepts and more.' },
  { icon: '🎓', title: 'Free ISL Courses',       desc: 'ISLRTC offers free online ISL certification programs at islrtc.nic.in — open to all hearing and deaf learners across India.' },
  { icon: '🎬', title: 'Educational Videos',     desc: 'Official sign language concept videos for school subjects — Maths, Science, English, History, Geography and Civics — all integrated into LittleSigns.' },
];

const SCHEMES = [
  { icon: '🎧', name: 'ADIP Scheme',            desc: 'Free hearing aids for BPL families from district disability office' },
  { icon: '🎓', name: 'Divyangjan Scholarship', desc: 'Financial aid for disabled students via scholarships.gov.in' },
  { icon: '📜', name: 'ISLRTC Certification',   desc: 'Free ISL courses & certificates at islrtc.nic.in' },
  { icon: '📚', name: 'RTE Act',                desc: 'Free education for all disabled children up to age 18' },
  { icon: '🚂', name: 'Railway Concession',     desc: '75% fare concession with a disability certificate' },
  { icon: '💼', name: '3% Job Reservation',     desc: 'In all central government jobs for disabled persons' },
];





export default function AboutPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const starsRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const c = starsRef.current;
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 200; i++) {
      const s = document.createElement('div');
      s.className = 'ab-star';
      const sz = Math.random() * 2;
      s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${2+Math.random()*6}s;animation-delay:${Math.random()*6}s;`;
      c.appendChild(s);
    }
  }, []);

  return (
    <div className="ab-root">
      <div className="ab-stars" ref={starsRef} />
      <div className="ab-nebula">
        <div className="ab-orb ab-o1" />
        <div className="ab-orb ab-o2" />
        <div className="ab-orb ab-o3" />
      </div>

      {/* Header */}
      <header className="ab-header">
        <Link to="/home" className="ab-back">← Home</Link>
        <div className="ab-brand">
          <div className="ab-brand-icon">🤟</div>
          <div>
            <div className="ab-brand-name">Little Signs</div>
            <div className="ab-brand-sub">ISL Learning Universe</div>
          </div>
        </div>
        {user && <button className="ab-logout" onClick={handleLogout}>🚪 Logout</button>}
      </header>

      {/* ── HERO ── */}
      <section className="ab-hero">
        <div className="ab-hero-floaters">
          {['A','🤟','B','✋','C','👋','D','✌️'].map((l,i) => (
            <span key={i} className="ab-floater" style={{
              left:`${5+i*12}%`, top:`${10+(i%4)*20}%`,
              animationDelay:`${i*0.5}s`, animationDuration:`${4+(i%3)}s`,
              fontSize: i%2===0?'1.2rem':'1.8rem', opacity:0.1+(i%3)*0.06,
            }}>{l}</span>
          ))}
        </div>
        <div className="ab-hero-content">
          <div className="ab-hero-badge">🏛️ Built on ISLRTC · Powered by AI</div>
          <h1 className="ab-hero-h1">
            India's First AI-Powered
            <br/>
            <span className="ab-gradient">ISL Learning Platform</span>
          </h1>
          <p className="ab-hero-p">
            1.8 crore deaf and hard-of-hearing Indians deserve access to quality sign language education.
            LittleSigns makes ISL learning free, personalized and available to anyone with a phone.
          </p>
          <div className="ab-hero-tags">
            <span className="ab-tag" style={{'--tc':'#9d4dff'}}>🤖 AI Powered</span>
            <span className="ab-tag" style={{'--tc':'#00e5ff'}}>🏛️ ISLRTC Official</span>
            <span className="ab-tag" style={{'--tc':'#0be881'}}>🆓 Always Free</span>
            <span className="ab-tag" style={{'--tc':'#ff4d9e'}}>🇮🇳 Made in India</span>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="ab-stats-section">
        <div className="ab-stats-grid">
          {STATS.map((s,i) => (
            <div key={i} className="ab-stat-card" style={{'--sc':s.color}}>
              <div className="ab-stat-num" style={{color:s.color}}>{s.num}</div>
              <div className="ab-stat-lab">{s.lab}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ISLRTC ── */}
      <section className="ab-section">
        <div className="ab-section-inner">
          <div className="ab-section-badge" style={{'--bc':'#9d4dff'}}>🏛️ Our Foundation</div>
          <h2 className="ab-section-h2">Built on Official ISLRTC Content</h2>
          <p className="ab-section-sub">
            LittleSigns is powered by the Indian Sign Language Research & Training Centre —
            India's official government body for ISL documentation and education.
          </p>
          <div className="ab-islrtc-grid">
            {ABOUT_ISLRTC.map((item,i) => (
              <div key={i} className="ab-islrtc-card">
                <div className="ab-islrtc-icon">{item.icon}</div>
                <h3 className="ab-islrtc-title">{item.title}</h3>
                <p className="ab-islrtc-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="ab-section ab-section--alt">
        <div className="ab-section-inner">
          <div className="ab-section-badge" style={{'--bc':'#00e5ff'}}>⚡ Platform Features</div>
          <h2 className="ab-section-h2">Everything in One Platform</h2>
          <p className="ab-section-sub">6 powerful tools for learners, parents and teachers</p>
          <div className="ab-features-grid">
            {FEATURES.map((f,i) => (
              <div key={i} className="ab-feature-card" style={{'--fc':f.color}}>
                <div className="ab-feature-icon">{f.icon}</div>
                <h3 className="ab-feature-title">{f.title}</h3>
                <p className="ab-feature-desc">{f.desc}</p>
                <div className="ab-feature-glow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GOVT SCHEMES ── */}
      <section className="ab-section">
        <div className="ab-section-inner">
          <div className="ab-section-badge" style={{'--bc':'#ffeb4d'}}>🇮🇳 Government Support</div>
          <h2 className="ab-section-h2">Know Your Rights & Benefits</h2>
          <p className="ab-section-sub">Key government schemes available for deaf and disabled persons in India</p>
          <div className="ab-schemes-grid">
            {SCHEMES.map((s,i) => (
              <div key={i} className="ab-scheme-card">
                <span className="ab-scheme-icon">{s.icon}</span>
                <div>
                  <div className="ab-scheme-name">{s.name}</div>
                  <div className="ab-scheme-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="ab-scheme-note">
            💡 Get a <strong>Disability Certificate</strong> from your CMO/Civil Hospital first — it unlocks ALL government benefits
          </div>
        </div>
      </section>



      {/* ── CTA ── */}
      <section className="ab-cta-section">
        <div className="ab-cta-inner">
          <h2 className="ab-cta-h2">Start Learning ISL Today</h2>
          <p className="ab-cta-p">Free · Personalized · Official ISLRTC content · AI powered</p>

        </div>
      </section>

      {/* Footer */}
      <footer className="ab-footer">
        <div className="ab-footer-brand">🤟 Little Signs</div>
        <p className="ab-footer-p">India's First AI-Powered Indian Sign Language Learning Platform</p>
        <div className="ab-footer-links">
          <Link to="/home">Home</Link>
          <Link to="/alphabet">Alphabet</Link>
          <Link to="/library">Library</Link>
          <Link to="/sentence-builder">Sentence Builder</Link>
          {user && <button onClick={handleLogout}>Logout</button>}
        </div>
        <p className="ab-footer-copy">© 2024 Little Signs · Content sourced from ISLRTC · Govt of India</p>
      </footer>
    </div>
  );
}
