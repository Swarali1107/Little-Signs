import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BADGES } from '../../utils/badges';
import './Dashboards.css';

export default function LearnerDashboard() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]       = useState(null);
  const [board, setBoard]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    Promise.all([
      authFetch('/learner/stats').then(r => r.json()),
      authFetch('/learner/leaderboard').then(r => r.json()),
    ]).then(([s, lb]) => {
      setStats(s);
      setBoard(lb);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line

  if (loading) return <DashLoader />;

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const myRank  = board.findIndex(u => u.name === user.name) + 1;

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-brand">✋ Little Signs</div>
        <div className="dash-user-info">
          <div className="dash-avatar learner-av">{user.name[0].toUpperCase()}</div>
          <div>
            <div className="dash-user-name">{user.name}</div>
            <div className="dash-user-role">🧒 Learner</div>
          </div>
        </div>
        <nav className="dash-nav">
          {[
            { key: 'overview',     icon: '🏠', label: 'Overview' },
            { key: 'progress',     icon: '📊', label: 'My Progress' },
            { key: 'badges',       icon: '🏅', label: 'My Badges' },
            { key: 'leaderboard',  icon: '🏆', label: 'Leaderboard' },
          ].map(t => (
            <button key={t.key} className={`dash-nav-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-links">
          <Link to="/home"             className="dash-play-btn">🏠 Home</Link>
          <Link to="/alphabet"         className="dash-play-btn">🔤 Alphabet</Link>
          <Link to="/numbers"          className="dash-play-btn secondary">🔢 Numbers</Link>
          <Link to="/word-dictionary"  className="dash-play-btn secondary">📖 Dictionary</Link>
          <Link to="/sentence-builder" className="dash-play-btn secondary">✍️ Sentences</Link>
          <button className="dash-logout" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <div className="dash-topbar">
          <h1>Welcome back, {user.name}! 👋</h1>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="dash-content">
            <div className="stat-grid">
              <StatCard color="#9d4dff" icon="⭐" label="Total Score"   value={stats?.total_score ?? 0} />
              <StatCard color="#ff4d79" icon="🔥" label="Day Streak"    value={stats?.streak ?? 0} suffix=" days" />
              <StatCard color="#4d79ff" icon="🎯" label="Accuracy"      value={stats?.accuracy ?? 0} suffix="%" />
              <StatCard color="#ff8c4d" icon="🖐️" label="Total Attempts" value={stats?.total_attempts ?? 0} />
            </div>

            {/* Quick alphabet overview */}
            <div className="dash-card">
              <h3 className="dash-card-title">📝 Alphabet Progress</h3>
              <div className="alpha-grid">
                {LETTERS.map(l => {
                  const ls = stats?.letter_stats?.[l];
                  const acc = ls ? ls.accuracy : 0;
                  const tried = !!ls;
                  return (
                    <div key={l} className={`alpha-cell ${!tried ? 'untried' : acc >= 80 ? 'mastered' : acc >= 50 ? 'learning' : 'struggling'}`}
                      title={tried ? `${l}: ${acc}% accuracy (${ls.attempts} attempts)` : `${l}: not tried yet`}>
                      {l}
                    </div>
                  );
                })}
              </div>
              <div className="alpha-legend">
                <span className="leg mastered">■ Mastered ≥80%</span>
                <span className="leg learning">■ Learning 50–79%</span>
                <span className="leg struggling">■ Struggling &lt;50%</span>
                <span className="leg untried">■ Not tried</span>
              </div>
            </div>

            {/* Recent activity */}
            <div className="dash-card">
              <h3 className="dash-card-title">⏱️ Recent Sessions</h3>
              {stats?.recent_sessions?.length ? (
                <table className="dash-table">
                  <thead><tr><th>Type</th><th>Item</th><th>Result</th><th>Confidence</th><th>Time</th></tr></thead>
                  <tbody>
                    {stats.recent_sessions.map((s, i) => (
                      <tr key={i}>
                        <td>{s.game_type}</td>
                       <td>{s.letter || (s.number ?? '—')}</td>
                        <td><span className={`badge ${s.is_correct ? 'correct' : 'wrong'}`}>{s.is_correct ? '✅' : '❌'}</span></td>
                        <td>{Math.round(s.confidence * 100)}%</td>
                        <td>{new Date(s.session_date).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="dash-empty">No sessions yet — go play! 🎮</p>
              )}
            </div>
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <div className="dash-content">
            <div className="dash-card">
              <h3 className="dash-card-title">📊 Per-Letter Accuracy</h3>
              {Object.keys(stats?.letter_stats || {}).length ? (
                <div className="bar-chart">
                  {Object.entries(stats.letter_stats).sort((a,b)=>b[1].accuracy-a[1].accuracy).map(([l, ls]) => (
                    <div key={l} className="bar-row">
                      <span className="bar-label">{l}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{
                          width: `${ls.accuracy}%`,
                          background: ls.accuracy >= 80 ? '#4BB543' : ls.accuracy >= 50 ? '#FFC107' : '#F44336',
                        }} />
                      </div>
                      <span className="bar-val">{ls.accuracy}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dash-empty">Practice alphabet to see your stats here!</p>
              )}
            </div>
          </div>
        )}

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <div className="dash-content">
            <BadgesPanel stats={stats} />
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="dash-content">
            <div className="dash-card">
              <h3 className="dash-card-title">🏆 Top Learners</h3>
              {myRank > 0 && <p className="dash-my-rank">Your rank: #{myRank}</p>}
              <table className="dash-table">
                <thead><tr><th>Rank</th><th>Name</th><th>Score</th><th>Streak</th></tr></thead>
                <tbody>
                  {board.map(u => (
                    <tr key={u.rank} className={u.name === user.name ? 'my-row' : ''}>
                      <td>{u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`}</td>
                      <td>{u.name} {u.name === user.name ? '(You)' : ''}</td>
                      <td><strong>{u.total_score}</strong></td>
                      <td>🔥 {u.streak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function BadgesPanel({ stats }) {
  const earned = JSON.parse(localStorage.getItem('ls_earned_badges') || '[]');
  const allBadges = Object.values(BADGES);
  const earnedBadges  = allBadges.filter(b => earned.includes(b.id));
  const lockedBadges  = allBadges.filter(b => !earned.includes(b.id));

  return (
    <div className="dash-card">
      <h3 className="dash-card-title">🏅 My Badges</h3>
      <p style={{ color:'#888', fontSize:'0.85rem', marginBottom:'1.5rem' }}>
        {earnedBadges.length} of {allBadges.length} badges earned
      </p>

      {earnedBadges.length > 0 && (
        <>
          <h4 className="dash-badge-section">✅ Earned</h4>
          <div className="dash-badges-grid">
            {earnedBadges.map(b => (
              <div key={b.id} className="dash-badge earned">
                <div className="dash-badge-emoji">{b.emoji}</div>
                <div className="dash-badge-name">{b.name}</div>
                <div className="dash-badge-desc">{b.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h4 className="dash-badge-section" style={{ marginTop: earnedBadges.length > 0 ? '1.5rem' : 0 }}>
        🔒 Locked
      </h4>
      <div className="dash-badges-grid">
        {lockedBadges.map(b => (
          <div key={b.id} className="dash-badge locked">
            <div className="dash-badge-emoji" style={{ filter:'grayscale(1)', opacity:0.35 }}>{b.emoji}</div>
            <div className="dash-badge-name">{b.name}</div>
            <div className="dash-badge-desc">{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, suffix = '', color }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon" style={{ background: color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-val">{value}{suffix}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function DashLoader() {
  return (
    <div className="dash-loader">
      <div className="dash-loader-text">✨ Loading your dashboard...</div>
    </div>
  );
}
