import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const ROLES = [
  { key:'learner', emoji:'🧒', label:'Learner',  color:'#a78bfa', desc:'I want to learn ISL' },
  { key:'parent',  emoji:'👨‍👩‍👧', label:'Parent',   color:'#f472b6', desc:'I track my child' },
  { key:'teacher', emoji:'👩‍🏫', label:'Teacher',  color:'#60a5fa', desc:'I teach a class' },
];

const DASH = { learner:'/home', parent:'/dashboard/parent', teacher:'/dashboard/teacher' };

// ISL letter sign paths — SVG finger positions for A,S,L
const SIGNS = [
  { letter:'I', label:'Indian', color:'#a78bfa' },
  { letter:'S', label:'Sign',   color:'#f472b6' },
  { letter:'L', label:'Language', color:'#60a5fa' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animRef = useRef(null);

  const [role,     setRole]     = useState('learner');
  const [form,     setForm]     = useState({ email:'', password:'' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [signIdx,  setSignIdx]  = useState(0);
  const [typed,    setTyped]    = useState('');

  if (user) return null;

  const TYPEWRITER_TEXT = 'Indian Sign Language';

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setTyped(TYPEWRITER_TEXT.slice(0, i + 1));
      i++;
      if (i >= TYPEWRITER_TEXT.length) clearInterval(t);
    }, 80);
    return () => clearInterval(t);
  }, []);

  // Cycle sign letters
  useEffect(() => {
    const t = setInterval(() => setSignIdx(i => (i + 1) % SIGNS.length), 2200);
    return () => clearInterval(t);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Init particles
    particlesRef.current = Array.from({ length: 90 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    Math.random() * 1.8 + 0.3,
      vx:   (Math.random() - 0.5) * 0.3,
      vy:   (Math.random() - 0.5) * 0.3,
      o:    Math.random() * 0.6 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        const alpha = p.o * (0.7 + 0.3 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const u = await login(form.email, form.password);
      navigate(DASH[u.role] || '/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const activeRole = ROLES.find(r => r.key === role);
  const sign = SIGNS[signIdx];

  return (
    <div className="auth-shell">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="auth-canvas" />

      {/* Deep space gradient bg */}
      <div className="auth-bg-glow" />

      {/* ── LEFT: Visual story ── */}
      <div className="auth-left">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <HandSign letter="L" color="#a78bfa" size={28} />
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-name">LittleSigns</span>
            <span className="auth-brand-dot">·</span>
            <span className="auth-brand-sub">ISL Platform</span>
          </div>
        </div>

        {/* Hero */}
        <div className="auth-hero">
          {/* Big animated hand sign */}
          <div className="auth-sign-stage">
            <div className="auth-sign-glow" style={{ background: sign.color }} />
            <div className="auth-sign-orbit auth-o1" />
            <div className="auth-sign-orbit auth-o2" />
            <div className="auth-sign-letter-wrap" key={signIdx}>
              <HandSign letter={sign.letter} color={sign.color} size={110} animate />
            </div>
            <div className="auth-sign-badge" style={{ color: sign.color }}>
              {sign.label}
            </div>
          </div>

          <h1 className="auth-headline">
            Learn to speak
            <br />
            <span className="auth-headline-accent">with your hands</span>
          </h1>

          <p className="auth-typewriter">
            {typed}<span className="auth-cursor">|</span>
          </p>
        </div>

        {/* 4 feature pills */}
        <div className="auth-features">
          {[
            { icon:'🤖', text:'AI detects A–Z signs live',         delay:'0s'    },
            { icon:'📖', text:'1000+ official ISLRTC word videos',  delay:'0.1s'  },
            { icon:'✍️', text:'Build sentences, hear them spoken',  delay:'0.2s'  },
            { icon:'📊', text:'Progress tracked for parents & teachers', delay:'0.3s' },
          ].map((f, i) => (
            <div key={i} className="auth-feat-pill" style={{ animationDelay: f.delay }}>
              <span className="auth-feat-icon">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="auth-stats">
          {[
            { n:'26',    l:'ISL Letters'  },
            { n:'1000+', l:'Word Signs'   },
            { n:'90%+',  l:'AI Accuracy'  },
            { n:'3',     l:'User Roles'   },
          ].map((s, i) => (
            <div key={i} className="auth-stat">
              <div className="auth-stat-n">{s.n}</div>
              <div className="auth-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div className="auth-right">
        <div className="auth-card">

          {/* Title */}
          <div className="auth-card-top">
            <h2 className="auth-card-title">Welcome back</h2>
            <p className="auth-card-sub">Sign in to continue your journey</p>
          </div>

          {/* Role selector */}
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

          {/* Role context */}
          <div className="auth-role-ctx" style={{ '--rc': activeRole.color }}>
            <div className="auth-role-ctx-bar" />
            <span style={{ color: activeRole.color }}>{activeRole.emoji}</span>
            <span>{activeRole.desc}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <div className={`auth-input ${form.email ? 'filled' : ''}`}>
                <span>✉️</span>
                <input type="email" required placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className={`auth-input ${form.password ? 'filled' : ''}`}>
                <span>🔒</span>
                <input type={showPass ? 'text' : 'password'} required placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" className="auth-eye"
                  onClick={() => setShowPass(s => !s)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-err">
                <span>⚠️</span>{error}
              </div>
            )}

            <button type="submit" className="auth-submit"
              style={{ '--rc': activeRole.color }}
              disabled={loading}>
              {loading ? (
                <><div className="auth-spin" /> Signing in...</>
              ) : (
                <>Sign in as {activeRole.label}</>
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="auth-benefits">
            {role === 'learner' && ['AI sign detection','Badges & streaks','Word dictionary','Sentence builder'].map((b,i) => (
              <span key={i} className="auth-benefit">✦ {b}</span>
            ))}
            {role === 'parent' && ['Child progress','Weak areas','Expert tips','Dictionary logs'].map((b,i) => (
              <span key={i} className="auth-benefit">✦ {b}</span>
            ))}
            {role === 'teacher' && ['Class analytics','Assign tasks','Student roster','Feature tracking'].map((b,i) => (
              <span key={i} className="auth-benefit">✦ {b}</span>
            ))}
          </div>

          <div className="auth-switch">
            New to LittleSigns?
            <Link to="/signup">Create account →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Animated ISL Hand Sign SVG ──────────────────────────────────────────────
function HandSign({ letter, color, size, animate }) {
  // Finger positions for ISL letters [thumb,index,middle,ring,pinky] true=up
  const FINGERS = {
    A:[false,false,false,false,false],
    B:[false,true,true,true,true],
    C:[true,true,true,true,true],
    D:[false,true,false,false,false],
    E:[false,false,false,false,false],
    I:[false,false,false,false,true],
    J:[false,false,false,false,true],
    L:[true,true,false,false,false],
    M:[false,false,false,false,false],
    N:[false,false,false,false,false],
    O:[true,true,true,true,true],
    R:[false,true,true,false,false],
    S:[false,false,false,false,false],
    T:[true,false,false,false,false],
    U:[false,true,true,false,false],
    V:[false,true,true,false,false],
    W:[false,true,true,true,false],
    Y:[true,false,false,false,true],
  };

  const s = FINGERS[letter] || [false,true,false,false,false];
  const sc = size / 120;
  const fingerColors = [color, color, color, color, color];

  return (
    <svg
      viewBox="0 0 120 150"
      width={size} height={size * 1.25}
      className={animate ? 'auth-hand-svg' : ''}
      style={{ filter: `drop-shadow(0 0 ${size * 0.15}px ${color}88)` }}
    >
      {/* Palm */}
      <ellipse cx="60" cy="118" rx="36" ry="30"
        fill={`${color}22`} stroke={`${color}66`} strokeWidth="1.5" />

      {/* Thumb */}
      <rect x="17" y={s[0] ? 78 : 93} width="12" height={s[0] ? 30 : 16} rx="6"
        fill={s[0] ? color : `${color}30`} stroke={`${color}60`} strokeWidth="1.2"
        transform="rotate(-38 23 103)"
        style={{ transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />

      {/* Index */}
      <rect x="28" y={s[1] ? 28 : 68} width="14" height={s[1] ? 58 : 30} rx="7"
        fill={s[1] ? fingerColors[1] : `${color}30`} stroke={`${color}60`} strokeWidth="1.2"
        style={{ transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />

      {/* Middle */}
      <rect x="45" y={s[2] ? 20 : 62} width="14" height={s[2] ? 66 : 36} rx="7"
        fill={s[2] ? fingerColors[2] : `${color}30`} stroke={`${color}60`} strokeWidth="1.2"
        style={{ transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />

      {/* Ring */}
      <rect x="63" y={s[3] ? 26 : 65} width="14" height={s[3] ? 60 : 32} rx="7"
        fill={s[3] ? fingerColors[3] : `${color}30`} stroke={`${color}60`} strokeWidth="1.2"
        style={{ transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />

      {/* Pinky */}
      <rect x="81" y={s[4] ? 38 : 74} width="11" height={s[4] ? 48 : 24} rx="5.5"
        fill={s[4] ? fingerColors[4] : `${color}30`} stroke={`${color}60`} strokeWidth="1.2"
        style={{ transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </svg>
  );
}
