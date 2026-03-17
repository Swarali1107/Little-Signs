import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboards.css';

export default function AdminDashboard() {
  const { user, logout, authFetch } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [roleFilter, setRoleFilter] = useState('');

  const loadStats = () =>
    Promise.all([
      authFetch('/admin/stats').then(r => r.json()),
      authFetch('/admin/recent-activity').then(r => r.json()),
    ]).then(([s, a]) => { setStats(s); setActivity(a); });

  const loadUsers = (role = '') => {
    const q = role ? `?role=${role}` : '';
    authFetch(`/admin/users${q}`).then(r => r.json()).then(setUsers);
  };

  useEffect(() => {
    Promise.all([loadStats(), loadUsers()])
      .catch(console.error).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const deleteUser = async (uid, name) => {
    if (!window.confirm(`Delete ${name}? This removes all their data.`)) return;
    await authFetch(`/admin/user/${uid}`, { method: 'DELETE' });
    loadUsers(roleFilter);
    loadStats();
  };

  const changeRole = async (uid, newRole) => {
    await authFetch(`/admin/user/${uid}/role`, {
      method: 'PATCH', body: JSON.stringify({ role: newRole }),
    });
    loadUsers(roleFilter);
  };

  if (loading) return <div className="dash-loader"><div className="dash-loader-text">Loading...</div></div>;

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-brand">✋ Little Signs</div>
        <div className="dash-user-info">
          <div className="dash-avatar admin-av">{user.name[0].toUpperCase()}</div>
          <div>
            <div className="dash-user-name">{user.name}</div>
            <div className="dash-user-role">🛡️ Admin</div>
          </div>
        </div>
        <nav className="dash-nav">
          {[
            { key: 'overview',  icon: '📊', label: 'Platform Stats' },
            { key: 'users',     icon: '👥', label: 'Manage Users' },
            { key: 'activity',  icon: '⚡', label: 'Live Activity' },
          ].map(t => (
            <button key={t.key} className={`dash-nav-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}>{t.icon} {t.label}</button>
          ))}
        </nav>
        <div className="dash-sidebar-links">
          <button className="dash-logout" onClick={logout}>🚪 Logout</button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar"><h1>Admin Control Panel 🛡️</h1></div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="dash-content">
            <div className="stat-grid">
              <StatCard color="#9d4dff" icon="👥" label="Total Users"       value={stats?.total_users ?? 0} />
              <StatCard color="#4d79ff" icon="🧒" label="Learners"          value={stats?.learners ?? 0} />
              <StatCard color="#ff8c4d" icon="👨‍👩‍👧" label="Parents"          value={stats?.parents ?? 0} />
              <StatCard color="#4BB543" icon="👩‍🏫" label="Teachers"          value={stats?.teachers ?? 0} />
              <StatCard color="#ff4d79" icon="📚" label="Total Sessions"     value={stats?.total_sessions ?? 0} />
              <StatCard color="#ffd700" icon="🎯" label="Platform Accuracy"  value={stats?.platform_accuracy ?? 0} suffix="%" />
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div className="dash-content">
            <div className="dash-card">
              <div className="dash-card-header-row">
                <h3 className="dash-card-title">👥 All Users</h3>
                <select className="role-filter" value={roleFilter}
                  onChange={e => { setRoleFilter(e.target.value); loadUsers(e.target.value); }}>
                  <option value="">All Roles</option>
                  <option value="learner">Learners</option>
                  <option value="parent">Parents</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <table className="dash-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Score</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td style={{ fontSize: '0.85rem', color: '#666' }}>{u.email}</td>
                      <td>
                        <select className="role-select" value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          disabled={u.id === user.id}>
                          {['learner','parent','teacher','admin'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td>{u.total_score ?? 0}</td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        {u.id !== user.id && (
                          <button className="remove-btn" onClick={() => deleteUser(u.id, u.name)}>🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="dash-content">
            <div className="dash-card">
              <div className="dash-card-header-row">
                <h3 className="dash-card-title">⚡ Recent Platform Activity</h3>
                <button className="form-btn" onClick={loadStats} style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
                  🔄 Refresh
                </button>
              </div>
              <table className="dash-table">
                <thead><tr><th>User</th><th>Game</th><th>Item</th><th>Result</th><th>Time</th></tr></thead>
                <tbody>
                  {activity.map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '0.85rem' }}>{a.learner_email}</td>
                      <td>{a.game_type}</td>
                      <td>{a.letter || '—'}</td>
                      <td><span className={`badge ${a.is_correct ? 'correct' : 'wrong'}`}>{a.is_correct ? '✅' : '❌'}</span></td>
                      <td style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(a.session_date).toLocaleTimeString()}</td>
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
