import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AboutPage.css';

const SIGNS = ['👋', '🤟', '✋', '🤘', '👌', '👍', '👏', '🙌'];

const TEAM = [
  { name: 'Priya Sharma', role: 'Founder & Lead Developer', img: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Rahul Patel', role: 'Sign Language Expert', img: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Ananya Gupta', role: 'Child Education Specialist', img: 'https://randomuser.me/api/portraits/women/68.jpg' },
];

const MISSION = [
  { icon: 'fas fa-hands-helping', title: 'Empowerment', desc: 'We believe every deaf child deserves the tools to express themselves fully and connect with the world around them.' },
  { icon: 'fas fa-child', title: 'Inclusive Education', desc: 'Our gamified approach makes learning sign language as natural as learning to speak for hearing children.' },
  { icon: 'fas fa-heart', title: 'Community Building', desc: "We're creating bridges between deaf and hearing communities through shared understanding." },
];

const STATS = [
  { num: '1,200+', label: 'Children Empowered' },
  { num: '50+', label: 'Schools Using LittleSigns' },
  { num: '10M+', label: 'Signs Practiced' },
];

export default function AboutPage() {
  const floatingRef = useRef(null);

  useEffect(() => {
    const container = floatingRef.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'ab-sign-icon';
      el.textContent = SIGNS[Math.floor(Math.random() * SIGNS.length)];
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.style.animationDuration = `${15 + Math.random() * 20}s`;
      el.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(el);
    }
  }, []);

  return (
    <div className="ab-page">
      {/* Hero */}
      <section className="ab-hero">
        <div className="ab-floating" ref={floatingRef} />
        <div className="ab-hero-content">
          <h1>Breaking Barriers Through Sign Language</h1>
          <p>LittleSigns is revolutionizing communication for deaf and mute children by making Indian Sign Language learning interactive, engaging, and accessible to all.</p>
          <a href="#mission" className="ab-cta">Our Mission</a>
        </div>
        <div className="ab-hero-image" />
      </section>

      {/* Nav */}
      <div className="ab-topnav">
        <Link to="/">← Back to Home</Link>
        <Link to="/alphabet">Alphabet Game</Link>
        <Link to="/parents">Parent Dashboard</Link>
      </div>

      {/* Mission */}
      <section className="ab-mission" id="mission">
        <h2 className="ab-section-title">Why We Exist</h2>
        <div className="ab-mission-cards">
          {MISSION.map(m => (
            <div key={m.title} className="ab-mission-card">
              <i className={m.icon}></i>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="ab-team">
        <h2 className="ab-section-title">Our Team</h2>
        <p className="ab-team-sub">Passionate innovators dedicated to accessible education</p>
        <div className="ab-team-grid">
          {TEAM.map(member => (
            <div key={member.name} className="ab-member">
              <div className="ab-member-img" style={{ backgroundImage: `url(${member.img})` }} />
              <div className="ab-member-info">
                <h3>{member.name}</h3>
                <p>{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section className="ab-impact">
        <h2 className="ab-section-title" style={{ color: 'white' }}>Our Impact</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem' }}>Changing lives one sign at a time</p>
        <div className="ab-stats">
          {STATS.map(s => (
            <div key={s.label} className="ab-stat">
              <div className="ab-stat-num">{s.num}</div>
              <div className="ab-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ab-cta-section">
        <h2 className="ab-section-title">Join Our Movement</h2>
        <p>Help us make communication accessible for every child</p>
        <Link to="/alphabet" className="ab-cta" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Get Started</Link>
      </section>

      {/* Footer */}
      <footer className="ab-footer">
        <h3>LittleSigns</h3>
        <p>Bridging the communication gap with technology</p>
        <div className="ab-footer-links">
          <Link to="/">Home</Link>
          <a href="#mission">Mission</a>
          <Link to="/parents">Parents</Link>
          <Link to="/alphabet">Play</Link>
        </div>
        <p style={{ marginTop: '1rem', opacity: 0.5, fontSize: '0.85rem' }}>© 2024 LittleSigns. All rights reserved.</p>
      </footer>

      {/* Accessibility FAB */}
      <button className="ab-access-fab" onClick={() => alert('Sign language introduction video would play here')}>
        <i className="fas fa-sign-language"></i>
      </button>
    </div>
  );
}
