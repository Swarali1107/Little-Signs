import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
// ─── Constants ───────────────────────────────────────────────────────────────
const BUFFER_SIZE    = 6;
const CONFIRM_THRESH = 4;
const CONFIDENCE_MIN = 0.75;
const PAUSE_MS       = 2000;
const MAX_SENTENCE   = 80;

// ─── Inline styles (no external CSS needed) ──────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          #050508;
    --surface:     #0d0d14;
    --surface2:    #13131e;
    --border:      rgba(255,255,255,0.07);
    --accent1:     #6c63ff;
    --accent2:     #ff3cac;
    --accent3:     #00e5ff;
    --accent4:     #ffe600;
    --text:        #f0eeff;
    --muted:       rgba(240,238,255,0.35);
    --confirmed:   #39ff14;
    --radius:      16px;
    --radius-sm:   8px;
  }

  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; overflow-x: hidden; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--accent1); border-radius: 99px; }

  /* ── Root ── */
  .sb { min-height: 100vh; display: flex; flex-direction: column; position: relative; overflow: hidden; }

  /* ── Animated grid bg ── */
  .sb-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    animation: gridDrift 30s linear infinite;
  }
  @keyframes gridDrift { to { background-position: 48px 48px; } }

  /* ── Glow orbs ── */
  .sb-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .sb-orb {
    position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.18;
    animation: orbPulse var(--dur,8s) ease-in-out infinite alternate;
  }
  .sb-orb.o1 { width: 600px; height: 600px; left: -200px; top: -100px; background: var(--accent1); --dur:9s; }
  .sb-orb.o2 { width: 500px; height: 500px; right: -150px; bottom: -100px; background: var(--accent2); --dur:11s; }
  .sb-orb.o3 { width: 400px; height: 400px; left: 40%; top: 30%; background: var(--accent3); --dur:7s; opacity:0.1; }
  @keyframes orbPulse { from { opacity:0.12; transform:scale(1); } to { opacity:0.22; transform:scale(1.1); } }

  /* ── Header ── */
  .sb-header {
    position: relative; z-index: 10; display: flex; align-items: center; justify-content: space-between;
    padding: 20px 32px; border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(5,5,8,0.95) 0%, transparent 100%);
    backdrop-filter: blur(20px);
  }
  .sb-back {
    display: flex; align-items: center; gap: 8px; color: var(--muted); text-decoration: none;
    font-family: 'Space Mono', monospace; font-size: 0.8rem; letter-spacing: 0.08em;
    transition: color 0.2s;
    padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  }
  .sb-back:hover { color: var(--text); border-color: var(--accent1); }
  .sb-logo { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .sb-logo-title {
    font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--accent1) 0%, var(--accent3) 50%, var(--accent2) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .sb-logo-sub { font-size: 0.72rem; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; font-family: 'Space Mono', monospace; }
  .sb-offline-pill {
    background: rgba(255,60,60,0.15); border: 1px solid rgba(255,60,60,0.4);
    color: #ff6060; font-size: 0.75rem; padding: 6px 14px; border-radius: 99px;
    font-family: 'Space Mono', monospace; animation: blink 1.5s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }

  /* ── Body ── */
  .sb-body { flex: 1; display: grid; grid-template-columns: 420px 1fr; gap: 24px; padding: 24px 32px; position: relative; z-index: 5; }

  /* ── Left panel ── */
  .sb-left { display: flex; flex-direction: column; gap: 16px; }

  /* ── Camera frame ── */
  .sb-cam-wrap {
    position: relative; border-radius: var(--radius); overflow: hidden;
    aspect-ratio: 4/3; background: var(--surface);
    border: 1px solid var(--border); transition: border-color 0.3s, box-shadow 0.3s;
  }
  .sb-cam-wrap.live { border-color: rgba(108,99,255,0.5); box-shadow: 0 0 30px rgba(108,99,255,0.2), inset 0 0 30px rgba(108,99,255,0.05); }
  .sb-cam-wrap.flash { border-color: var(--confirmed) !important; box-shadow: 0 0 40px rgba(57,255,20,0.4) !important; animation: flashGlow 0.6s ease-out; }
  @keyframes flashGlow { 0%{box-shadow:0 0 60px rgba(57,255,20,0.8)} 100%{box-shadow:0 0 30px rgba(108,99,255,0.2)} }
  .sb-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
  .sb-cam-idle {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; color: var(--muted); font-size: 0.9rem;
  }
  .sb-cam-idle-icon { font-size: 3rem; opacity: 0.5; }
  .sb-live-badge {
    position: absolute; top: 12px; left: 12px;
    display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    border: 1px solid rgba(57,255,20,0.4); border-radius: 99px; padding: 4px 12px;
    font-size: 0.7rem; font-family: 'Space Mono', monospace; color: var(--confirmed); letter-spacing: 0.12em;
  }
  .sb-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--confirmed); animation: livePulse 1s ease-in-out infinite; }
  @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }

  /* ── Big prediction overlay ── */
  .sb-pred-overlay {
    position: absolute; bottom: 12px; right: 12px;
    display: flex; align-items: center; gap: 8px;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px 16px;
  }
  .sb-pred-letter {
    font-family: 'Space Mono', monospace; font-size: 2.5rem; font-weight: 700; line-height: 1;
    background: linear-gradient(135deg, var(--accent1), var(--accent3));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .sb-pred-conf { font-family: 'Space Mono', monospace; font-size: 0.85rem; font-weight: 700; }

  /* ── Spin ── */
  .sb-spin {
    width: 36px; height: 36px; border-radius: 50%;
    border: 3px solid var(--border); border-top-color: var(--accent1);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Buffer bar ── */
  .sb-buffer { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
  .sb-buffer-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-family: 'Space Mono', monospace; color: var(--muted); }
  .sb-buffer-track { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .sb-buffer-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent1), var(--accent3)); transition: width 0.2s ease; }
  .sb-buffer-status { font-size: 0.78rem; text-align: center; min-height: 1.2em; }
  .status-confirmed { color: var(--confirmed); font-weight: 700; }
  .status-space { color: var(--accent4); }
  .status-listening { color: var(--muted); }
  .status-backspace { color: var(--accent2); font-weight: 700; }

  /* ── Controls ── */
  .sb-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sb-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 16px; border-radius: var(--radius-sm); border: none; cursor: pointer;
    font-family: 'Syne', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.02em;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .sb-btn::after {
    content:''; position:absolute; inset:0; opacity:0;
    background: radial-gradient(circle at center, rgba(255,255,255,0.2), transparent 70%);
    transition: opacity 0.15s;
  }
  .sb-btn:hover::after { opacity:1; }
  .sb-btn:active { transform: scale(0.97); }
  .sb-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .sb-btn:disabled::after { display: none; }
  .sb-btn.start { background: linear-gradient(135deg, var(--accent1), #9d73ff); color: #fff; box-shadow: 0 4px 20px rgba(108,99,255,0.35); }
  .sb-btn.stop  { background: var(--surface2); border: 1px solid var(--border); color: var(--text); }
  .sb-btn.stop:hover:not(:disabled) { border-color: var(--accent2); color: var(--accent2); }

  /* ── How it works ── */
  .sb-how { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 16px; }
  .sb-how-title { font-size: 0.75rem; font-family: 'Space Mono', monospace; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
  .sb-how-steps { display: flex; flex-direction: column; gap: 6px; }
  .sb-how-step { display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: var(--muted); }
  .sb-how-step span {
    width: 20px; height: 20px; border-radius: 50%; background: rgba(108,99,255,0.2); border: 1px solid var(--accent1);
    display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-family: 'Space Mono', monospace;
    color: var(--accent1); flex-shrink: 0;
  }

  /* ── Right panel ── */
  .sb-right { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  /* ── Sentence panel ── */
  .sb-sentence-panel {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;
    flex-shrink: 0;
  }
  .sb-sentence-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .sb-sentence-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); font-family: 'Space Mono', monospace; }
  .sb-sentence-actions { display: flex; gap: 8px; }
  .sb-action-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--surface2); color: var(--muted); cursor: pointer; font-size: 0.8rem;
    font-family: 'Space Mono', monospace; transition: all 0.2s;
  }
  .sb-action-btn:hover { border-color: var(--accent1); color: var(--text); }
  .sb-action-btn.danger:hover { border-color: var(--accent2); color: var(--accent2); }
  .sb-action-btn.backspace { font-size: 1rem; }
  .sb-action-btn.backspace:hover { border-color: var(--accent2); color: var(--accent2); box-shadow: 0 0 12px rgba(255,60,172,0.25); }

  .sb-sentence-display {
    min-height: 80px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 2px;
    font-family: 'Space Mono', monospace; font-size: 1.5rem; line-height: 1.6;
    word-break: break-all;
  }
  .sb-char {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 4px; padding: 0 1px; transition: all 0.2s;
  }
  .sb-char.letter { color: var(--text); }
  .sb-char.letter.latest {
    color: var(--accent3);
    animation: charPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes charPop { 0%{transform:scale(0.3) translateY(8px);opacity:0} 100%{transform:scale(1) translateY(0);opacity:1} }
  .sb-char.space-marker { color: var(--border); font-size: 0.8rem; align-self: center; }
  .sb-empty { color: var(--muted); font-size: 0.9rem; font-family: 'Syne', sans-serif; align-self: center; }
  .sb-cursor { display: inline-block; width: 2px; height: 1.4em; background: var(--accent1); border-radius: 1px; animation: cursorBlink 1s step-end infinite; align-self: center; margin-left: 2px; }
  @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* ── Word chips ── */
  .sb-words { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
  .sb-word-chip {
    padding: 4px 12px; border-radius: 99px;
    background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.25);
    font-size: 0.82rem; color: var(--accent1); font-family: 'Space Mono', monospace;
    transition: all 0.2s;
  }
  .sb-word-chip:hover { background: rgba(108,99,255,0.22); }

  /* ── Speak button ── */
  .sb-speak-btn {
    display: flex; align-items: center; gap: 16px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 18px 24px; cursor: pointer; transition: all 0.25s; width: 100%;
    position: relative; overflow: hidden;
  }
  .sb-speak-btn::before {
    content:''; position:absolute; inset:0;
    background: linear-gradient(135deg, rgba(0,229,255,0.06), rgba(108,99,255,0.06));
    opacity:0; transition:opacity 0.25s;
  }
  .sb-speak-btn:hover:not(:disabled)::before { opacity:1; }
  .sb-speak-btn:hover:not(:disabled) { border-color: var(--accent3); box-shadow: 0 0 20px rgba(0,229,255,0.15); }
  .sb-speak-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .sb-speak-btn.speaking { border-color: var(--accent3); animation: speakPulse 0.8s ease-in-out infinite alternate; }
  @keyframes speakPulse { from{box-shadow:0 0 10px rgba(0,229,255,0.2)} to{box-shadow:0 0 30px rgba(0,229,255,0.5)} }
  .sb-speak-icon { font-size: 1.8rem; position:relative; z-index:1; }
  .sb-speak-text { position:relative; z-index:1; text-align:left; }
  .sb-speak-label { font-size: 1rem; font-weight: 700; color: var(--text); }
  .sb-speak-sub { font-size: 0.75rem; color: var(--muted); font-family: 'Space Mono', monospace; margin-top: 2px; }

  /* ── Bottom row ── */
  .sb-bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; }

  /* ── History ── */
  .sb-history { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .sb-history-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); font-family: 'Space Mono', monospace; }
  .sb-history-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .sb-history-chip {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 6px; background: var(--surface2); border: 1px solid var(--border);
    font-family: 'Space Mono', monospace; font-size: 0.85rem; color: var(--text);
    transition: all 0.15s;
  }
  .sb-history-chip:last-child { border-color: var(--accent1); color: var(--accent1); background: rgba(108,99,255,0.1); }

  /* ── Reference strip ── */
  .sb-ref { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
  .sb-ref-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); font-family: 'Space Mono', monospace; }
  .sb-ref-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
  .sb-ref-item {
    flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 6px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface2);
    transition: all 0.2s; cursor: default;
  }
  .sb-ref-item.active { border-color: var(--accent3); background: rgba(0,229,255,0.08); box-shadow: 0 0 12px rgba(0,229,255,0.2); }
  .sb-ref-img { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; display: block; }
  .sb-ref-letter { font-size: 0.7rem; font-family: 'Space Mono', monospace; color: var(--muted); }
  .sb-ref-item.active .sb-ref-letter { color: var(--accent3); }

  /* ── Stats bar ── */
  .sb-stats { display: flex; gap: 12px; }
  .sb-stat {
    flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 12px 16px; display: flex; flex-direction: column; gap: 2px;
  }
  .sb-stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); font-family: 'Space Mono', monospace; }
  .sb-stat-value { font-size: 1.3rem; font-weight: 800; font-family: 'Space Mono', monospace; }
  .sb-stat-value.v1 { color: var(--accent1); }
  .sb-stat-value.v2 { color: var(--accent3); }
  .sb-stat-value.v3 { color: var(--accent4); }

  /* ── Keyboard shortcut hint ── */
  .sb-kbd-hint {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.72rem; color: var(--muted); font-family: 'Space Mono', monospace;
  }
  .sb-kbd {
    display: inline-flex; align-items: center; padding: 2px 7px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; font-size: 0.7rem;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .sb-body { grid-template-columns: 1fr; }
    .sb-bottom-row { grid-template-columns: 1fr; }
  }
`;

export default function SentenceBuilder() {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const intervalRef    = useRef(null);
  const streamRef      = useRef(null);
  const bufferRef      = useRef([]);
  const lastLetterRef  = useRef(null);
  const noHandTimerRef = useRef(null);
  const isInFlightRef  = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [isDetecting,   setIsDetecting]   = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [sentence,      setSentence]      = useState([]);
  const [currentPred,   setCurrentPred]   = useState('—');
  const [confidence,    setConfidence]    = useState(0);
  const [status,        setStatus]        = useState('idle');
  const [backendOnline, setBackendOnline] = useState(true);
  const [spokenText,    setSpokenText]    = useState('');
  const [totalLetters,  setTotalLetters]  = useState(0);
const { user, authFetch } = useAuth(); // add at top of component
  // ── Inject styles ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = styles;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // ── Keyboard support ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Backspace') { e.preventDefault(); deleteLastChar(); }
      if (e.key === ' ')         { e.preventDefault(); addSpace(); }
      if (e.key === 'Escape')    { clearAll(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Health check ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(r => r.json()).then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const sentenceText = sentence.map(s => s.char).join('');
  const words        = sentenceText.trim().split(' ').filter(Boolean);
  const bufFill      = Math.round((bufferRef.current.length / BUFFER_SIZE) * 100);
  const confColor    = confidence > 80 ? '#39ff14' : confidence > 55 ? '#ffe600' : '#ff3cac';

  // ── Letter actions ────────────────────────────────────────────────────────
  const addLetter = useCallback((letter) => {
    setSentence(prev => {
      if (prev.length >= MAX_SENTENCE) return prev;
      const last = prev[prev.length - 1];
      if (last?.char === letter && last?.type === 'letter') return prev;
      return [...prev, { char: letter, type: 'letter', id: Date.now() + Math.random() }];
    });
    setTotalLetters(n => n + 1);
    setStatus('confirmed');
    setTimeout(() => setStatus('listening'), 800);
  }, []);

  const addSpace = useCallback(() => {
    setSentence(prev => {
      if (prev.length === 0) return prev;
      if (prev[prev.length - 1]?.type === 'space') return prev;
      return [...prev, { char: ' ', type: 'space', id: Date.now() }];
    });
    setStatus('space');
    setTimeout(() => setStatus('listening'), 500);
    lastLetterRef.current = null;
  }, []);

  const deleteLastChar = useCallback(() => {
    setSentence(prev => prev.slice(0, -1));
    lastLetterRef.current = null;
    bufferRef.current     = [];
    setStatus('backspace');
    setTimeout(() => setStatus(isDetecting ? 'listening' : 'idle'), 600);
  }, [isDetecting]);

  const clearAll = useCallback(() => {
    setSentence([]);
    lastLetterRef.current = null;
    bufferRef.current     = [];
    setCurrentPred('—');
    setConfidence(0);
  }, []);

  // ── Detection loop ────────────────────────────────────────────────────────
  const detectSign = useCallback(async () => {
    if (isInFlightRef.current) return;
    isInFlightRef.current = true;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) { isInFlightRef.current = false; return; }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.5);

    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('http://localhost:5000/detect-sign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: imageData, target: '' }),
        signal:  controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) { setBackendOnline(false); return; }

      const result = await res.json();
      setBackendOnline(true);

      if (!result.success || !result.prediction) {
        setCurrentPred('—'); setConfidence(0);
        if (!noHandTimerRef.current) {
          noHandTimerRef.current = setTimeout(() => { addSpace(); noHandTimerRef.current = null; }, PAUSE_MS);
        }
        bufferRef.current = [];
        return;
      }

      if (noHandTimerRef.current) { clearTimeout(noHandTimerRef.current); noHandTimerRef.current = null; }

      const conf = result.confidence, pred = result.prediction;
      setCurrentPred(pred);
      setConfidence(Math.round(conf * 100));

      if (conf >= CONFIDENCE_MIN) {
        bufferRef.current = [...bufferRef.current.slice(-(BUFFER_SIZE - 1)), pred];
      }

      const buf = bufferRef.current;
      if (buf.length >= BUFFER_SIZE) {
        const counts = {};
        buf.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (top?.[1] >= CONFIRM_THRESH && top[0] !== lastLetterRef.current) {
          lastLetterRef.current = top[0];
          addLetter(top[0]);
          bufferRef.current = [];
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setBackendOnline(false);
    } finally {
      isInFlightRef.current = false;
    }
  }, [addLetter, addSpace]);

  useEffect(() => {
    if (isDetecting) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detectSign, 800);
    }
    return () => clearInterval(intervalRef.current);
  }, [detectSign, isDetecting]);

  // ── Camera start / stop ───────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!backendOnline) { alert('ML server offline! Run: python detection_server.py'); return; }
    setCameraLoading(true);
    bufferRef.current = []; lastLetterRef.current = null; isInFlightRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:{ideal:1280}, height:{ideal:720}, facingMode:'user' }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      canvasRef.current.width  = videoRef.current.videoWidth  || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      setIsDetecting(true); setCameraLoading(false); setStatus('listening');
    } catch (err) {
      setCameraLoading(false);
      if (err.name === 'NotAllowedError') alert('Camera permission denied!');
      else if (err.name === 'NotFoundError') alert('No camera found!');
      else alert(`Camera error: ${err.message}`);
    }
  }, [backendOnline]);

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current); isInFlightRef.current = false;
    if (noHandTimerRef.current) { clearTimeout(noHandTimerRef.current); noHandTimerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsDetecting(false); setCameraLoading(false); setStatus('idle'); bufferRef.current = [];
    if (user && authFetch && totalLetters > 0) {
  authFetch('/learner/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_type: 'sentence_builder', is_correct: true, confidence: 0.99, score_delta: Math.min(totalLetters, 10) }),
  }).catch(console.error);
}
 }, [user, authFetch, totalLetters]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speakSentence = () => {
    const text = sentenceText.trim();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-IN'; utter.rate = 0.85;
    window.speechSynthesis.speak(utter);
    setSpokenText(text);
    setTimeout(() => setSpokenText(''), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sb">
      {/* Background */}
      <div className="sb-grid" />
      <div className="sb-orbs">
        <div className="sb-orb o1" /><div className="sb-orb o2" /><div className="sb-orb o3" />
      </div>

      {/* Header */}
      <header className="sb-header">
        <a href="/home" className="sb-back">← Home</a>
        <div className="sb-logo">
          <span className="sb-logo-title">🌌 Sentence Builder</span>
          <span className="sb-logo-sub">Sign → Letters → Words → Speech</span>
        </div>
        <div>
          {!backendOnline
            ? <div className="sb-offline-pill">⚠ ML Offline</div>
            : <div className="sb-kbd-hint"><span className="sb-kbd">⌫</span> backspace &nbsp; <span className="sb-kbd">Space</span> space &nbsp; <span className="sb-kbd">Esc</span> clear</div>
          }
        </div>
      </header>

      {/* Body */}
      <div className="sb-body">

        {/* ── LEFT ── */}
        <div className="sb-left">
          {/* Camera */}
          <div className={`sb-cam-wrap ${isDetecting ? 'live' : ''} ${status === 'confirmed' ? 'flash' : ''}`}>
            <video ref={videoRef} playsInline muted className="sb-video" />
            <canvas ref={canvasRef} style={{ display:'none' }} />
            {!isDetecting && !cameraLoading && (
              <div className="sb-cam-idle">
                <div className="sb-cam-idle-icon">📷</div>
                <div>Press Start to begin signing</div>
              </div>
            )}
            {cameraLoading && (
              <div className="sb-cam-idle"><div className="sb-spin" /><div>Starting camera…</div></div>
            )}
            {isDetecting && (
              <div className="sb-live-badge"><span className="sb-live-dot" /> LIVE</div>
            )}
            {isDetecting && currentPred !== '—' && (
              <div className="sb-pred-overlay">
                <div className="sb-pred-letter">{currentPred}</div>
                <div className="sb-pred-conf" style={{ color: confColor }}>{confidence}%</div>
              </div>
            )}
          </div>

          {/* Buffer bar */}
          {isDetecting && (
            <div className="sb-buffer">
              <div className="sb-buffer-header">
                <span>🔍 Frame buffer</span>
                <span>{bufferRef.current.length} / {BUFFER_SIZE}</span>
              </div>
              <div className="sb-buffer-track">
                <div className="sb-buffer-fill" style={{ width:`${bufFill}%` }} />
              </div>
              <div className="sb-buffer-status">
                {status === 'confirmed'  && <span className="status-confirmed">✅ Letter confirmed!</span>}
                {status === 'space'      && <span className="status-space">➕ Space added</span>}
                {status === 'backspace'  && <span className="status-backspace">⌫ Deleted</span>}
                {status === 'listening'  && <span className="status-listening">👋 Show a sign…</span>}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="sb-stats">
            <div className="sb-stat">
              <div className="sb-stat-label">Characters</div>
              <div className="sb-stat-value v1">{sentenceText.length}</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-label">Words</div>
              <div className="sb-stat-value v2">{words.length}</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-label">Total Signed</div>
              <div className="sb-stat-value v3">{totalLetters}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="sb-controls">
            <button className="sb-btn start" onClick={startCamera} disabled={isDetecting || cameraLoading}>
              {cameraLoading ? '⏳ Starting…' : '🎬 Start Signing'}
            </button>
            <button className="sb-btn stop" onClick={stopCamera} disabled={!isDetecting}>
              ⏹ Stop
            </button>
          </div>

          {/* How it works */}
          <div className="sb-how">
            <div className="sb-how-title">⚡ How it works</div>
            <div className="sb-how-steps">
              {[
                'Hold a sign steady for 1–2 sec',
                'Letter auto-confirms when buffer fills',
                'Remove hand for 2s → space added',
                'Press ⌫ or Backspace key to erase',
                'Press 🔊 to hear your sentence',
              ].map((s, i) => (
                <div key={i} className="sb-how-step"><span>{i+1}</span>{s}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="sb-right">
          {/* Sentence display */}
          <div className="sb-sentence-panel">
            <div className="sb-sentence-top">
              <span className="sb-sentence-label">✍️ Your Sentence</span>
              <div className="sb-sentence-actions">
                <button
                  className="sb-action-btn backspace"
                  onClick={deleteLastChar}
                  title="Delete last character (Backspace)"
                  disabled={sentence.length === 0}
                >
                  ⌫ Backspace
                </button>
                <button
                  className="sb-action-btn danger"
                  onClick={clearAll}
                  title="Clear all (Esc)"
                  disabled={sentence.length === 0}
                >
                  🗑 Clear
                </button>
              </div>
            </div>

            <div className="sb-sentence-display">
              {sentence.length === 0
                ? <span className="sb-empty">Start signing to build your sentence…</span>
                : sentence.map((s, i) =>
                    s.type === 'space'
                      ? <span key={s.id ?? i} className="sb-char space-marker">·</span>
                      : <span key={s.id ?? i} className={`sb-char letter ${i === sentence.length - 1 ? 'latest' : ''}`}>
                          {s.char}
                        </span>
                  )
              }
              {isDetecting && <span className="sb-cursor" />}
            </div>

            {words.length > 0 && (
              <div className="sb-words">
                {words.map((w, i) => <span key={i} className="sb-word-chip">{w}</span>)}
              </div>
            )}
          </div>

          {/* Speak */}
          <button
            className={`sb-speak-btn ${spokenText ? 'speaking' : ''}`}
            onClick={speakSentence}
            disabled={sentence.length === 0}
          >
            <span className="sb-speak-icon">{spokenText ? '📢' : '🔊'}</span>
            <div className="sb-speak-text">
              <div className="sb-speak-label">{spokenText ? 'Speaking…' : 'Speak Sentence'}</div>
              <div className="sb-speak-sub">Indian English voice · Rate 0.85</div>
            </div>
          </button>

          {/* Bottom row: history + reference */}
          <div className="sb-bottom-row">
            <div className="sb-history">
              <div className="sb-history-title">📜 Letter History</div>
              <div className="sb-history-chips">
                {sentence.filter(s => s.type === 'letter').slice(-24).map((s, i, arr) => (
                  <span key={s.id ?? i} className="sb-history-chip"
                    style={i === arr.length - 1 ? undefined : undefined}>
                    {s.char}
                  </span>
                ))}
                {sentence.filter(s => s.type === 'letter').length === 0 && (
                  <span style={{ color:'var(--muted)', fontSize:'0.8rem' }}>No letters yet</span>
                )}
              </div>
            </div>

            <div className="sb-ref">
              <div className="sb-ref-title">🖼 Quick Reference</div>
              <div className="sb-ref-scroll">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                  <div key={l} className={`sb-ref-item ${currentPred === l ? 'active' : ''}`}>
                    <img
                      src={`images/sign/Sign_${l}.jpg`}
                      alt={l}
                      className="sb-ref-img"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="sb-ref-letter">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
