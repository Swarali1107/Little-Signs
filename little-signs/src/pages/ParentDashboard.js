import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ParentDashboard.css';

const ADVICE = [
  { title: 'Daily Practice Routine', text: 'Set aside 15 minutes each day to practice signs with your child. Consistency helps reinforce learning.' },
  { title: 'Positive Reinforcement', text: 'Celebrate small victories with praise or small rewards to keep your child motivated.' },
  { title: 'Incorporate Signs Daily', text: 'Use signs during everyday activities like mealtime to make learning natural and contextual.' },
  { title: 'Visual Learning Aids', text: 'Place sign language charts in common areas as quick references for your child.' },
  { title: 'Patience is Key', text: 'Remember that learning sign language is a journey. Progress may be slow but steady.' },
  { title: 'Engage with Stories', text: 'Use picture books and sign the key words together to build vocabulary.' },
  { title: 'Join a Community', text: 'Connect with other families learning sign language for mutual support and practice.' },
  { title: 'Make it Fun', text: "Turn practice into games like 'sign charades' to keep your child engaged." },
];

const ACTIVITIES = [
  { icon: 'fa-check-circle', title: "Rahul mastered the sign for 'Thank You'", time: '2 hours ago' },
  { icon: 'fa-trophy', title: "Rahul earned the 'Alphabet Expert' badge", time: 'Yesterday' },
  { icon: 'fa-chart-line', title: 'New weekly progress report available', time: '2 days ago' },
  { icon: 'fa-book', title: 'New learning module unlocked: Family Signs', time: '3 days ago' },
];

const PROGRESS = [
  { label: 'Alphabet Signs', pct: 65 },
  { label: 'Number Signs', pct: 42 },
  { label: 'Common Phrases', pct: 28 },
  { label: 'Quiz Accuracy', pct: 81 },
];

function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

export default function ParentDashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');

  const hours = useCountUp(24);
  const signs = useCountUp(78);
  const streak = useCountUp(14);
  const badges = useCountUp(9);

  return (
    <div className="pd-dashboard">
      {/* Sidebar */}
      <div className="pd-sidebar">
        <div className="pd-logo">
          <span className="pd-logo-icon">✋</span>
          <h2>LittleSigns</h2>
        </div>
        <ul className="pd-nav">
          {[
            { key: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
            { key: 'children', icon: 'fa-child', label: 'My Children' },
            { key: 'reports', icon: 'fa-chart-line', label: 'Progress Reports' },
            { key: 'resources', icon: 'fa-book', label: 'Learning Resources' },
            { key: 'settings', icon: 'fa-cog', label: 'Settings' },
          ].map(item => (
            <li key={item.key}>
              <button
                className={`pd-nav-link ${activeNav === item.key ? 'active' : ''}`}
                onClick={() => setActiveNav(item.key)}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="pd-sidebar-footer">
          <Link to="/" className="pd-back-link">← Back to Home</Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pd-main">
        {/* Header */}
        <div className="pd-header">
          <h1>Parent Dashboard</h1>
          <div className="pd-user">
            <div className="pd-avatar">P</div>
            <span>Parent User</span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="pd-card-grid">
          <StatCard icon="fa-clock" iconClass="primary" title="Total Learning Hours" value={hours} suffix=".5" desc="+2.5 hours this week" />
          <StatCard icon="fa-check-circle" iconClass="success" title="Signs Mastered" value={signs} desc="+12 this month" />
          <StatCard icon="fa-fire" iconClass="warning" title="Current Streak" value={streak} desc="days in a row" />
          <StatCard icon="fa-trophy" iconClass="danger" title="Badges Earned" value={badges} desc="3 more to next level" />
        </div>

        {/* Progress */}
        <div className="pd-section">
          <h2 className="pd-section-title"><i className="fas fa-chart-pie"></i> Learning Progress</h2>
          <div className="pd-progress-grid">
            {PROGRESS.map(p => (
              <div key={p.label} className="pd-progress-item">
                <div className="pd-progress-label">
                  <span>{p.label}</span>
                  <span style={{ color: '#6C63FF', fontWeight: 600 }}>{p.pct}%</span>
                </div>
                <div className="pd-progress-bar">
                  <div className="pd-progress-fill" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advice */}
        <div className="pd-section">
          <h2 className="pd-section-title"><i className="fas fa-lightbulb"></i> Parenting Advice</h2>
          <p style={{ color: '#64748B', marginBottom: '1.2rem', fontSize: '0.9rem' }}>Personalized tips to support your child's learning journey</p>
          <div className="pd-advice-grid">
            {ADVICE.map(a => (
              <div key={a.title} className="pd-advice-card">
                <div className="pd-advice-title">{a.title}</div>
                <div className="pd-advice-text">{a.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="pd-section">
          <h2 className="pd-section-title"><i className="fas fa-history"></i> Recent Activity</h2>
          <div className="pd-activity-list">
            {ACTIVITIES.map((a, i) => (
              <div key={i} className="pd-activity-item">
                <div className="pd-activity-icon">
                  <i className={`fas ${a.icon}`}></i>
                </div>
                <div className="pd-activity-content">
                  <div className="pd-activity-title">{a.title}</div>
                  <div className="pd-activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconClass, title, value, suffix = '', desc }) {
  return (
    <div className="pd-card">
      <div className="pd-card-header">
        <span className="pd-card-title">{title}</span>
        <div className={`pd-card-icon ${iconClass}`}><i className={`fas ${icon}`}></i></div>
      </div>
      <div className="pd-card-value">{value}{suffix}</div>
      <div className="pd-card-desc">{desc}</div>
    </div>
  );
}
