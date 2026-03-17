import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const ROLES = [
  {
    key:'learner', emoji:'🧒', label:'Learner', color:'#a78bfa',
    tagline:'Learn ISL with AI',
    perks:['🤖 Real-time AI sign detection','🏅 Badges & achievement streaks','📖 Official ISLRTC word videos','✍️ Sentence builder with voice'],
  },
  {
    key:'parent', emoji:'👨‍👩‍👧', label:'Parent', color:'#f472b6',
    tagline:'Track your child\'s progress',
    perks:['📊 Full progress dashboard','⚠️ Weak area alerts','💡 Expert parenting tips','📖 Dictionary words explored'],
  },
  {
    key:'teacher', emoji:'👩‍🏫', label:'Teacher', color:'#60a5fa',
    tagline:'Manage your ISL class',
    perks:['👥 Class-wide analytics','📋 Assign tasks & homework','🎯 Feature usage per student','⚠️ Class weak spot detection'],
  },
];

const DASH = { learner:'/home', parent:'/dashboard/parent', teacher:'/dashboard/teacher' };

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const pRef       = useRef([]);

  const [role,    setRole]    = useState('learner');
  const [form,    setForm]    = useState({ name:'', email:'', password:'', confirmPassword:'', age:'', parent_email:'', class_name:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass,setShowPass]= useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    pRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      o: Math.random() * 0.5 + 0.1,
      p: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.p += 0.018;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o * (0.7 + 0.3 * Math.sin(p.p))})`;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const p = { name:form.name, email:form.email, password:form.password, role };
      if (role === 'learner') {
        if (form.age)          p.age          = parseInt(form.age);
        if (form.parent_email) p.parent_email = form.parent_email;
      }
      if (role === 'teacher' && form.class_name) p.class_name = form.class_name;
      const u = await signup(p);
      navigate(DASH[u.role] || '/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const activeRole = ROLES.find(r => r.key === role);

  return (
    <div className="auth-shell">
      <canvas ref={canvasRef} className="auth-canvas" />
      <div className="auth-bg-glow" />

      {/* ── LEFT ── */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <svg viewBox="0 0 50 50" width="30" height="30">
              <text x="5" y="38" fontSize="32">🤟</text>
            </svg>
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-name">LittleSigns</span>
            <span className="auth-brand-dot">·</span>
            <span className="auth-brand-sub">ISL Platform</span>
          </div>
        </div>

        {/* Role selector cards */}
        <div className="auth-signup-title">Who are you?</div>
        <div className="auth-role-cards">
          {ROLES.map(r => (
            <div key={r.key}
              className={`auth-rcard ${role === r.key ? 'active' : ''}`}
              style={{ '--rc': r.color }}
              onClick={() => setRole(r.key)}>
              {/* Glow bg */}
              <div className="auth-rcard-glow" />

              <div className="auth-rcard-top">
                <div className="auth-rcard-emoji-wrap">
                  <span className="auth-rcard-emoji">{r.emoji}</span>
                  {role === r.key && <div className="auth-rcard-ring" />}
                </div>
                <div className="auth-rcard-info">
                  <div className="auth-rcard-label">{r.label}</div>
                  <div className="auth-rcard-tag">{r.tagline}</div>
                </div>
                {role === r.key && (
                  <div className="auth-rcard-check" style={{ background: r.color }}>✓</div>
                )}
              </div>

              {/* Perks expand when active */}
              <div className={`auth-rcard-perks ${role === r.key ? 'open' : ''}`}>
                {r.perks.map((p, i) => (
                  <div key={i} className="auth-rcard-perk"
                    style={{ animationDelay: `${i * 0.06}s` }}>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom quote */}
        <div className="auth-left-quote">
          "ISL connects over 6 million deaf individuals in India.
          <br/>
          <strong>Help bridge the gap.</strong>"
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-emoji">{activeRole.emoji}</div>
            <h2 className="auth-card-title">Create account</h2>
            <p className="auth-card-sub">Join as {activeRole.label} — it's free</p>
          </div>

          {/* Role tabs */}
          <div className="auth-role-grid">
            {ROLES.map(r => (
              <button key={r.key} type="button"
                className={`auth-role-btn ${role === r.key ? 'active' : ''}`}
                style={role === r.key ? { '--rc': r.color } : {}}
                onClick={() => setRole(r.key)}>
                <span className="auth-rbtn-emoji">{r.emoji}</span>
                <span className="auth-rbtn-label">{r.label}</span>
                {role === r.key && (
                  <span className="auth-rbtn-check" style={{ background: r.color }}>✓</span>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-row">
              <div className="auth-field">
                <label>Full Name</label>
                <div className={`auth-input ${form.name ? 'filled' : ''}`}>
                  <span>👤</span>
                  <input type="text" required placeholder="Your name"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              </div>
              <div className="auth-field">
                <label>Email</label>
                <div className={`auth-input ${form.email ? 'filled' : ''}`}>
                  <span>✉️</span>
                  <input type="email" required placeholder="you@example.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="auth-form-row">
              <div className="auth-field">
                <label>Password</label>
                <div className={`auth-input ${form.password ? 'filled' : ''}`}>
                  <span>🔒</span>
                  <input type={showPass ? 'text' : 'password'} required placeholder="Min 6 chars"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="auth-eye" onClick={() => setShowPass(s => !s)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <div className={`auth-input ${form.confirmPassword ? 'filled' : ''}`}>
                  <span>🔒</span>
                  <input type="password" required placeholder="Repeat"
                    value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
                </div>
              </div>
            </div>

            {role === 'learner' && (
              <div className="auth-form-row">
                <div className="auth-field">
                  <label>Age <span className="auth-opt">optional</span></label>
                  <div className="auth-input">
                    <span>🎂</span>
                    <input type="number" min="3" max="18" placeholder="e.g. 10"
                      value={form.age} onChange={e => set('age', e.target.value)} />
                  </div>
                </div>
                <div className="auth-field">
                  <label>Parent Email <span className="auth-opt">optional</span></label>
                  <div className="auth-input">
                    <span>👨‍👩‍👧</span>
                    <input type="email" placeholder="parent@example.com"
                      value={form.parent_email} onChange={e => set('parent_email', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {role === 'teacher' && (
              <div className="auth-field">
                <label>Class Name <span className="auth-opt">optional</span></label>
                <div className="auth-input">
                  <span>🏫</span>
                  <input type="text" placeholder="e.g. Grade 3 — Section A"
                    value={form.class_name} onChange={e => set('class_name', e.target.value)} />
                </div>
              </div>
            )}

            {error && <div className="auth-err"><span>⚠️</span>{error}</div>}

            <button type="submit" className="auth-submit"
              style={{ '--rc': activeRole.color }}
              disabled={loading}>
              {loading
                ? <><div className="auth-spin" />Creating account...</>
                : <>Create {activeRole.label} Account {activeRole.emoji}</>}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?
            <Link to="/login">Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
