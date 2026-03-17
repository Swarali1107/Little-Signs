import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProfessionalDash.css';

const TIPS = [
  { icon:'⏱️', title:'Daily Habit', body:'Even 10 minutes daily beats 1 hour weekly. Consistency is everything in language learning.' },
  { icon:'🪞', title:'Mirror Practice', body:'Let your child practice signs in front of a mirror — they can self-correct their hand shapes.' },
  { icon:'📖', title:'Use the Dictionary', body:'Watch ISLRTC word videos together. Seeing a real tutor makes a huge difference in posture and accuracy.' },
  { icon:'✍️', title:'Sentence Builder', body:'Encourage spelling their name and simple words using the Sentence Builder feature daily.' },
  { icon:'👨‍👩‍👧', title:'Learn Together', body:'When family members also learn ISL, children progress 2× faster and feel more motivated.' },
  { icon:'🎉', title:'Celebrate Effort', body:'Praise every attempt, not just success. "That was a great try for S!" matters more than getting it right.' },
  { icon:'🔁', title:'Revisit Weak Signs', body:'Spend extra time on letters with low accuracy. 5 reps of a difficult sign beats 20 reps of an easy one.' },
  { icon:'🌐', title:'ISLRTC Resources', body:'Visit islrtc.nic.in for free official ISL learning resources, books and videos.' },
];

export default function ParentDashboard() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [children,    setChildren]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [childDetail, setChildDetail] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [addEmail,    setAddEmail]    = useState('');
  const [addMsg,      setAddMsg]      = useState(null);
  const [addLoading,  setAddLoading]  = useState(false);

  const loadChildren = () => {
    authFetch('/parent/children').then(r => r.json())
      .then(d => { setChildren(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadChildren(); }, []); // eslint-disable-line

  const selectChild = async (child) => {
    setSelected(child);
    setChildDetail(null);
    setActiveTab('child');
    const res  = await authFetch(`/parent/child/${child.id}/progress`);
    const data = await res.json();
    setChildDetail(data);
  };

  const addChild = async (e) => {
    e.preventDefault();
    setAddMsg(null); setAddLoading(true);
    try {
      const res  = await authFetch('/parent/add-child', {
        method: 'POST', body: JSON.stringify({ email: addEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddMsg({ ok: true, text: data.message });
      setAddEmail(''); loadChildren();
    } catch (err) {
      setAddMsg({ ok: false, text: err.message });
    } finally { setAddLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Compute stats from records ────────────────────────────────────────────
  const computeStats = (records = []) => {
    const alpha    = records.filter(r => r.game_type === 'alphabet');
    const numbers  = records.filter(r => r.game_type === 'numbers');
    const dict     = records.filter(r => r.game_type === 'dictionary');
    const sentence = records.filter(r => r.game_type === 'sentence');

    // Weak letters — accuracy < 70%, at least 2 attempts
    const letterMap = {};
    alpha.forEach(r => {
      if (!r.letter) return;
      if (!letterMap[r.letter]) letterMap[r.letter] = { correct:0, total:0 };
      letterMap[r.letter].total++;
      if (r.is_correct) letterMap[r.letter].correct++;
    });
    const weakLetters = Object.entries(letterMap)
      .map(([l,v]) => ({ letter:l, accuracy: Math.round(v.correct/v.total*100), attempts:v.total }))
      .filter(x => x.accuracy < 70 && x.attempts >= 2)
      .sort((a,b) => a.accuracy - b.accuracy)
      .slice(0, 8);

    // Dictionary words watched
    const wordsWatched = [...new Set(dict.map(r => r.word).filter(Boolean))];

    // Sentence sessions
    const sentenceCount = sentence.length;
    const longestSentence = sentence.reduce((max, r) => Math.max(max, r.sentence_length || 0), 0);

    // Numbers accuracy
    const numCorrect = numbers.filter(r => r.is_correct).length;
    const numTotal   = numbers.length;
    const numAccuracy= numTotal > 0 ? Math.round(numCorrect/numTotal*100) : 0;

    return { weakLetters, wordsWatched, sentenceCount, longestSentence, numAccuracy, numTotal, alpha, numbers, dict, sentence };
  };

  if (loading) return <DashLoader />;

  const totalScore  = children.reduce((s,c) => s + c.total_score, 0);
  const avgAccuracy = children.length
    ? Math.round(children.reduce((s,c) => s + c.accuracy, 0) / children.length) : 0;

  return (
    <div className="pro-shell">
      {/* Sidebar */}
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <span className="pro-brand-mark">🤟</span>
          <div>
            <div className="pro-brand-name">LittleSigns</div>
            <div className="pro-brand-role">Parent Portal</div>
          </div>
        </div>

        <div className="pro-profile">
          <div className="pro-avatar" style={{ background:'linear-gradient(135deg,#6C63FF,#ff4d9e)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="pro-profile-name">{user?.name}</div>
            <div className="pro-profile-role">Parent Account</div>
          </div>
        </div>

        <nav className="pro-nav">
          {[
            { key:'overview', icon:'📊', label:'Overview' },
            { key:'child',    icon:'👧', label:'Child Report', locked: !selected },
            { key:'tips',     icon:'💡', label:'Parenting Tips' },
            { key:'add',      icon:'➕', label:'Add Child' },
          ].map(item => (
            <button key={item.key}
              className={`pro-nav-btn ${activeTab === item.key ? 'active':''} ${item.locked ? 'locked':''}`}
              onClick={() => !item.locked && setActiveTab(item.key)}>
              <span className="pro-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.locked && <span className="pro-nav-lock">🔒</span>}
            </button>
          ))}
        </nav>

        <button className="pro-logout-btn" onClick={handleLogout}>
          <span>🚪</span> Sign Out
        </button>
      </aside>

      {/* Main */}
      <main className="pro-main">
        <div className="pro-topbar">
          <div>
            <h1 className="pro-page-title">
              {activeTab === 'overview' && '👨‍👩‍👧 Family Overview'}
              {activeTab === 'child'    && `📋 ${selected?.name}'s Progress Report`}
              {activeTab === 'tips'     && '💡 Parenting Tips'}
              {activeTab === 'add'      && '➕ Add Child'}
            </h1>
            <p className="pro-page-sub">
              {activeTab === 'overview' && 'Full ISL learning progress across all features'}
              {activeTab === 'child'    && 'Alphabet · Numbers · Dictionary · Sentence Builder'}
              {activeTab === 'tips'     && 'Expert guidance to support your child\'s ISL journey'}
              {activeTab === 'add'      && 'Link your child\'s learner account'}
            </p>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="pro-body">
            <div className="pro-stat-grid">
              <StatCard color="#6C63FF" icon="👶" label="Children Linked"  value={children.length} />
              <StatCard color="#ff4d9e" icon="⭐" label="Family Score"      value={totalScore} />
              <StatCard color="#4d79ff" icon="🎯" label="Avg Accuracy"     value={`${avgAccuracy}%`} />
              <StatCard color="#4BB543" icon="✅" label="Letters Mastered"  value={children.reduce((s,c) => s + (c.letters_mastered?.length||0), 0)} />
            </div>

            {children.length === 0 ? (
              <div className="pro-empty-state">
                <div className="pro-empty-icon">👶</div>
                <h3>No children linked yet</h3>
                <p>Add your child's account to start tracking their ISL progress</p>
                <button className="pro-btn-primary" onClick={() => setActiveTab('add')}>➕ Add Child</button>
              </div>
            ) : (
              <div className="pro-children-grid">
                {children.map(child => (
                  <div key={child.id} className="pro-child-card" onClick={() => selectChild(child)}>
                    <div className="pro-child-top">
                      <div className="pro-avatar sm" style={{ background:'linear-gradient(135deg,#4d79ff,#6C63FF)' }}>
                        {child.name[0].toUpperCase()}
                      </div>
                      <div className="pro-child-info">
                        <strong>{child.name}</strong>
                        {child.age && <span>Age {child.age}</span>}
                      </div>
                      <div className="pro-child-score">⭐ {child.total_score}</div>
                    </div>

                    {/* Feature usage pills */}
                    <div className="pro-feature-pills">
                      <span className="pro-fpill alpha">🔤 Alphabet</span>
                      <span className="pro-fpill numbers">🔢 Numbers</span>
                      <span className="pro-fpill dict">📖 Dictionary</span>
                      <span className="pro-fpill sentence">✍️ Sentences</span>
                    </div>

                    <div className="pro-child-metrics">
                      <div className="pro-metric">
                        <span>Accuracy</span>
                        <strong style={{ color: child.accuracy >= 70 ? '#4BB543' : child.accuracy >= 40 ? '#FFC107' : '#F44336' }}>
                          {child.accuracy}%
                        </strong>
                      </div>
                      <div className="pro-metric">
                        <span>Streak</span>
                        <strong>🔥 {child.streak}d</strong>
                      </div>
                      <div className="pro-metric">
                        <span>Letters</span>
                        <strong>{child.letters_mastered?.length||0}/26</strong>
                      </div>
                    </div>

                    <div className="pro-progress-bar">
                      <div className="pro-progress-fill" style={{ width:`${((child.letters_mastered?.length||0)/26)*100}%` }} />
                    </div>

                    <div className="pro-view-report">View Full Report →</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CHILD DETAIL ── */}
        {activeTab === 'child' && selected && (
          <div className="pro-body">
            <button className="pro-back-btn" onClick={() => setActiveTab('overview')}>← Back</button>

            {!childDetail ? (
              <div className="pro-loading"><div className="pro-spinner"/></div>
            ) : (() => {
              const stats = computeStats(childDetail.records);
              return (
                <>
                  {/* Top stats */}
                  <div className="pro-stat-grid">
                    <StatCard color="#6C63FF" icon="⭐" label="Total Score"       value={childDetail.child.total_score} />
                    <StatCard color="#ff8c4d" icon="🔥" label="Day Streak"        value={`${childDetail.child.streak}d`} />
                    <StatCard color="#4d79ff" icon="📚" label="Total Sessions"    value={childDetail.records.length} />
                    <StatCard color="#4BB543" icon="📖" label="Words Watched"     value={stats.wordsWatched.length} />
                  </div>

                  {/* Feature breakdown */}
                  <div className="pro-section-label">📱 Feature Usage Breakdown</div>
                  <div className="pro-feat-breakdown">
                    <FeatCard icon="🔤" title="Alphabet Detection"
                      sessions={stats.alpha.length}
                      accuracy={stats.alpha.length ? Math.round(stats.alpha.filter(r=>r.is_correct).length/stats.alpha.length*100) : 0}
                      color="#6C63FF"
                      detail={`${stats.weakLetters.length} weak letters identified`}
                    />
                    <FeatCard icon="🔢" title="Number Signs"
                      sessions={stats.numTotal}
                      accuracy={stats.numAccuracy}
                      color="#ff8c4d"
                      detail={stats.numTotal > 0 ? `${stats.numbers.filter(r=>r.is_correct).length} correct` : 'Not started yet'}
                    />
                    <FeatCard icon="📖" title="ISL Dictionary"
                      sessions={stats.dict.length}
                      accuracy={null}
                      color="#00e5ff"
                      detail={stats.wordsWatched.length > 0 ? `${stats.wordsWatched.length} words explored` : 'Not used yet'}
                    />
                    <FeatCard icon="✍️" title="Sentence Builder"
                      sessions={stats.sentenceCount}
                      accuracy={null}
                      color="#ff4d9e"
                      detail={stats.longestSentence > 0 ? `Longest: ${stats.longestSentence} letters` : 'Not started yet'}
                    />
                  </div>

                  <div className="pro-two-col">
                    {/* Weak letters */}
                    <div className="pro-card">
                      <div className="pro-card-header">
                        <span className="pro-card-icon err">⚠️</span>
                        <h3>Weak ISL Signs</h3>
                      </div>
                      {stats.weakLetters.length === 0 ? (
                        <p className="pro-empty-txt">🎉 No weak areas found yet!</p>
                      ) : (
                        <>
                          <p style={{ fontSize:'0.8rem', color:'#888', marginBottom:'1rem' }}>
                            Letters needing more practice (below 70% accuracy)
                          </p>
                          <div className="pro-bar-list">
                            {stats.weakLetters.map(item => (
                              <div key={item.letter} className="pro-bar-row">
                                <span className="pro-bar-letter err">{item.letter}</span>
                                <div className="pro-bar-track">
                                  <div className="pro-bar-fill err" style={{ width:`${item.accuracy}%` }} />
                                </div>
                                <span className="pro-bar-pct" style={{ color:'#F44336' }}>{item.accuracy}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Dictionary words watched */}
                    <div className="pro-card">
                      <div className="pro-card-header">
                        <span className="pro-card-icon" style={{ background:'rgba(0,229,255,0.1)' }}>📖</span>
                        <h3>Dictionary Words Explored</h3>
                      </div>
                      {stats.wordsWatched.length === 0 ? (
                        <p className="pro-empty-txt">No dictionary words watched yet</p>
                      ) : (
                        <div className="pro-word-cloud">
                          {stats.wordsWatched.map((w,i) => (
                            <span key={i} className="pro-word-chip">{w}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personalised tips */}
                  <div className="pro-card">
                    <div className="pro-card-header">
                      <span className="pro-card-icon tip">💡</span>
                      <h3>Personalised Tips for {selected.name}</h3>
                    </div>
                    <div className="pro-tips-grid">
                      {TIPS.slice(0, 4).map((tip, i) => (
                        <div key={i} className="pro-tip">
                          <div className="pro-tip-icon">{tip.icon}</div>
                          <div>
                            <div className="pro-tip-title">{tip.title}</div>
                            <p>{tip.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── TIPS ── */}
        {activeTab === 'tips' && (
          <div className="pro-body">
            <div className="pro-tips-hero">
              <h2>Expert Guidance for ISL Parents</h2>
              <p>Research-backed strategies for supporting your child across all 4 learning features</p>
            </div>
            <div className="pro-tips-full-grid">
              {TIPS.map((tip, i) => (
                <div key={i} className="pro-tip-full">
                  <div className="pro-tip-full-icon">{tip.icon}</div>
                  <div className="pro-tip-full-title">{tip.title}</div>
                  <p>{tip.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADD CHILD ── */}
        {activeTab === 'add' && (
          <div className="pro-body">
            <div className="pro-card" style={{ maxWidth:520 }}>
              <div className="pro-card-header">
                <span className="pro-card-icon">➕</span>
                <h3>Link a Child Account</h3>
              </div>
              <p className="pro-form-desc">
                Enter the email address your child used to register as a Learner.
              </p>
              <form onSubmit={addChild} className="pro-form">
                <input type="email" required placeholder="child@example.com"
                  value={addEmail} onChange={e => setAddEmail(e.target.value)}
                  className="pro-input" />
                <button type="submit" className="pro-btn-primary" disabled={addLoading}>
                  {addLoading ? 'Linking...' : 'Link Account'}
                </button>
              </form>
              {addMsg && (
                <div className={`pro-msg ${addMsg.ok ? 'ok':'err'}`}>
                  {addMsg.ok ? '✅':'❌'} {addMsg.text}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FeatCard({ icon, title, sessions, accuracy, color, detail }) {
  return (
    <div className="pro-feat-card" style={{ '--fc': color }}>
      <div className="pro-feat-icon" style={{ background: color }}>{icon}</div>
      <div className="pro-feat-info">
        <div className="pro-feat-title">{title}</div>
        <div className="pro-feat-sessions">{sessions} sessions</div>
        {accuracy !== null && (
          <div className="pro-feat-acc" style={{ color: accuracy >= 70 ? '#4BB543' : accuracy >= 40 ? '#FFC107' : '#F44336' }}>
            {accuracy}% accuracy
          </div>
        )}
        <div className="pro-feat-detail">{detail}</div>
      </div>
      <div className="pro-feat-bar">
        <div className="pro-feat-fill" style={{ height:`${Math.min(sessions * 5, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="pro-stat-card" style={{ '--accent': color }}>
      <div className="pro-stat-icon" style={{ background: color }}>{icon}</div>
      <div>
        <div className="pro-stat-value">{value}</div>
        <div className="pro-stat-label">{label}</div>
      </div>
    </div>
  );
}

function DashLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f5f7fa' }}>
      <div style={{ textAlign:'center' }}>
        <div className="pro-spinner" style={{ margin:'0 auto 1rem' }} />
        <p style={{ color:'#6C63FF', fontWeight:600 }}>Loading...</p>
      </div>
    </div>
  );
}
