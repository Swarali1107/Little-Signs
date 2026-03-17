import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SentenceBuilder.css';

const BUFFER_SIZE    = 6;    // reduced from 8 — faster confirmation
const CONFIRM_THRESH = 4;    // reduced from 5 — faster confirmation
const CONFIDENCE_MIN = 0.75; // raised from 0.65 — stricter = fewer wrong letters
const PAUSE_MS       = 2000; // ms of no hand = word space
const MAX_SENTENCE   = 40;

export default function SentenceBuilder() {
  const { user, authFetch } = useAuth();
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const intervalRef    = useRef(null);
  const streamRef      = useRef(null);
  const bufferRef      = useRef([]);
  const lastLetterRef  = useRef(null);
  const noHandTimerRef = useRef(null);
  const isInFlightRef  = useRef(false); // ← guard: no overlapping requests

  const [isDetecting,   setIsDetecting]   = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [sentence,      setSentence]      = useState([]);
  const [currentPred,   setCurrentPred]   = useState('—');
  const [confidence,    setConfidence]    = useState(0);
  const [status,        setStatus]        = useState('idle');
  const [backendOnline, setBackendOnline] = useState(true);
  const [spokenText,    setSpokenText]    = useState('');
  const [particles,     setParticles]     = useState([]);

  useEffect(() => {
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      dur: 3 + Math.random() * 6,
      delay: Math.random() * 5,
      color: ['#9d4dff','#ff4d9e','#4d79ff','#ffeb4d','#00e5ff'][Math.floor(Math.random() * 5)],
    }));
    setParticles(p);
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(r => r.json()).then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  const sentenceText = sentence.map(s => s.char).join('');
  const words        = sentenceText.trim().split(' ').filter(Boolean);

  const addLetter = useCallback((letter) => {
    setSentence(prev => {
      if (prev.length >= MAX_SENTENCE) return prev;
      const last = prev[prev.length - 1];
      if (last && last.char === letter && last.type === 'letter') return prev;
      return [...prev, { char: letter, type: 'letter' }];
    });
    setStatus('confirmed');
    setTimeout(() => setStatus('listening'), 800);
  }, []);

  const addSpace = useCallback(() => {
    setSentence(prev => {
      if (prev.length === 0) return prev;
      if (prev[prev.length - 1]?.type === 'space') return prev;
      return [...prev, { char: ' ', type: 'space' }];
    });
    setStatus('space');
    setTimeout(() => setStatus('listening'), 500);
    lastLetterRef.current = null;
  }, []);

  const detectSign = useCallback(async () => {
    // ── Guard: skip if previous request still in flight ──
    if (isInFlightRef.current) return;
    isInFlightRef.current = true;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      isInFlightRef.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ── Lower quality = smaller payload = faster ──
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

      // ── No hand ──
      if (!result.success || !result.prediction) {
        setCurrentPred('—');
        setConfidence(0);
        if (!noHandTimerRef.current) {
          noHandTimerRef.current = setTimeout(() => {
            addSpace();
            noHandTimerRef.current = null;
          }, PAUSE_MS);
        }
        bufferRef.current = [];
        return;
      }

      // Hand detected → cancel space timer
      if (noHandTimerRef.current) {
        clearTimeout(noHandTimerRef.current);
        noHandTimerRef.current = null;
      }

      const conf       = result.confidence;
      const prediction = result.prediction;
      setCurrentPred(prediction);
      setConfidence(Math.round(conf * 100));

      // ── Only count high-confidence predictions ──
      if (conf >= CONFIDENCE_MIN) {
        bufferRef.current = [
          ...bufferRef.current.slice(-(BUFFER_SIZE - 1)),
          prediction,
        ];
      }

      // ── Majority voting ──
      const buf = bufferRef.current;
      if (buf.length >= BUFFER_SIZE) {
        const counts = {};
        buf.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

        if (top && top[1] >= CONFIRM_THRESH) {
          const confirmed = top[0];
          if (confirmed !== lastLetterRef.current) {
            lastLetterRef.current = confirmed;
            addLetter(confirmed);
            bufferRef.current = [];
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      setBackendOnline(false);
    } finally {
      // ── Always release the guard ──
      isInFlightRef.current = false;
    }
  }, [addLetter, addSpace]);

  // ── Restart interval when detectSign changes ──
  useEffect(() => {
    if (isDetecting) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detectSign, 800); // ← 350 → 800ms
    }
    return () => clearInterval(intervalRef.current);
  }, [detectSign, isDetecting]);

  const startCamera = useCallback(async () => {
    if (!backendOnline) {
      alert('ML server is offline! Run: python detection_server.py');
      return;
    }
    setCameraLoading(true);
    bufferRef.current     = [];
    lastLetterRef.current = null;
    isInFlightRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current          = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      canvasRef.current.width  = videoRef.current.videoWidth  || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      setIsDetecting(true);
      setCameraLoading(false);
      setStatus('listening');
    } catch (err) {
      setCameraLoading(false);
      if (err.name === 'NotAllowedError') alert('Camera permission denied!');
      else if (err.name === 'NotFoundError') alert('No camera found!');
      else alert(`Camera error: ${err.message}`);
    }
  }, [backendOnline]);

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current);
    isInFlightRef.current = false;
    if (noHandTimerRef.current) {
      clearTimeout(noHandTimerRef.current);
      noHandTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsDetecting(false);
    setCameraLoading(false);
    setStatus('idle');
    bufferRef.current = [];
  }, []);

  const speakSentence = () => {
    const text = sentenceText.trim();
    if (!text) return;
    const utter  = new SpeechSynthesisUtterance(text);
    utter.lang   = 'en-IN';
    utter.rate   = 0.85;
    window.speechSynthesis.speak(utter);
    setSpokenText(text);
    setTimeout(() => setSpokenText(''), 3000);
  };

  const deleteLastChar = () => {
    setSentence(prev => prev.slice(0, -1));
    lastLetterRef.current = null;
  };

  const clearAll = () => {
    setSentence([]);
    lastLetterRef.current = null;
    bufferRef.current     = [];
    setCurrentPred('—');
    setConfidence(0);
  };

  const bufFill   = Math.round((bufferRef.current.length / BUFFER_SIZE) * 100);
  const confColor = confidence > 80 ? '#4BB543' : confidence > 55 ? '#FFC107' : '#ff4d9e';

  return (
    <div className="sb-root">
      {/* Nebula background */}
      <div className="sb-nebula">
        {particles.map(p => (
          <div key={p.id} className="sb-particle" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}
        <div className="sb-nebula-glow g1" />
        <div className="sb-nebula-glow g2" />
        <div className="sb-nebula-glow g3" />
      </div>

      {/* Header */}
      <header className="sb-header">
        <Link to="/home" className="sb-back">← Home</Link>
        <div className="sb-header-center">
          <h1 className="sb-title">🌌 Sentence Builder</h1>
          <p className="sb-subtitle">Sign letters → build words → speak sentences</p>
        </div>
        <div className="sb-header-right">
          {!backendOnline && <div className="sb-offline-pill">⚠️ ML Offline</div>}
        </div>
      </header>

      <div className="sb-body">
        {/* Left: Camera */}
        <div className="sb-left">
          <div className={`sb-cam-frame ${isDetecting ? 'live' : ''} ${status === 'confirmed' ? 'flash' : ''}`}>
            <video ref={videoRef} playsInline muted className="sb-video" />
            <canvas ref={canvasRef} style={{ display:'none' }} />

            {!isDetecting && !cameraLoading && (
              <div className="sb-cam-idle">
                <div className="sb-cam-idle-icon">📷</div>
                <div>Press Start to begin signing</div>
              </div>
            )}
            {cameraLoading && (
              <div className="sb-cam-idle">
                <div className="sb-spin" />
                <div>Starting camera...</div>
              </div>
            )}
            {isDetecting && (
              <div className="sb-live-badge">
                <span className="sb-live-dot" /> LIVE
              </div>
            )}
            {isDetecting && currentPred !== '—' && (
              <div className="sb-pred-overlay">
                <div className="sb-pred-letter">{currentPred}</div>
                <div className="sb-pred-conf" style={{ color: confColor }}>{confidence}%</div>
              </div>
            )}
          </div>

          {/* Buffer progress */}
          {isDetecting && (
            <div className="sb-buffer-wrap">
              <div className="sb-buffer-label">
                <span>🔍 Detecting...</span>
                <span>{bufferRef.current.length}/{BUFFER_SIZE} frames</span>
              </div>
              <div className="sb-buffer-track">
                <div className="sb-buffer-fill" style={{ width: `${bufFill}%` }} />
              </div>
              <div className="sb-buffer-hint">
                {status === 'confirmed' && <span className="sb-status-confirmed">✅ Letter confirmed!</span>}
                {status === 'space'     && <span className="sb-status-space">➕ Word space added</span>}
                {status === 'listening' && <span className="sb-status-listening">👋 Show a sign...</span>}
              </div>
            </div>
          )}

          <div className="sb-controls">
            <button className="sb-btn-start" onClick={startCamera} disabled={isDetecting || cameraLoading}>
              {cameraLoading ? '⏳ Starting...' : '🎬 Start Signing'}
            </button>
            <button className="sb-btn-stop" onClick={stopCamera} disabled={!isDetecting}>
              ⏹ Stop
            </button>
          </div>

          <div className="sb-how">
            <div className="sb-how-title">⚡ How it works</div>
            <div className="sb-how-steps">
              <div className="sb-how-step"><span>1</span> Hold a sign steady for 1–2 sec</div>
              <div className="sb-how-step"><span>2</span> Letter auto-confirms when buffer fills</div>
              <div className="sb-how-step"><span>3</span> Remove hand for 2s to add a space</div>
              <div className="sb-how-step"><span>4</span> Press 🔊 to hear your sentence</div>
            </div>
          </div>
        </div>

        {/* Right: Sentence */}
        <div className="sb-right">
          <div className="sb-sentence-panel">
            <div className="sb-sentence-header">
              <span className="sb-sentence-label">✍️ Your Sentence</span>
              <div className="sb-sentence-actions">
                <button className="sb-action-btn" onClick={deleteLastChar} title="Delete last">⌫</button>
                <button className="sb-action-btn danger" onClick={clearAll} title="Clear all">🗑</button>
              </div>
            </div>

            <div className="sb-sentence-display">
              {sentence.length === 0 ? (
                <span className="sb-sentence-empty">Start signing to build your sentence...</span>
              ) : (
                sentence.map((s, i) => (
                  s.type === 'space'
                    ? <span key={i} className="sb-space-marker">·</span>
                    : <span key={i} className={`sb-letter-char ${i === sentence.length - 1 ? 'latest' : ''}`}>
                        {s.char}
                      </span>
                ))
              )}
              {isDetecting && <span className="sb-cursor">|</span>}
            </div>

            {words.length > 0 && (
              <div className="sb-words-row">
                {words.map((w, i) => (
                  <span key={i} className="sb-word-chip">{w}</span>
                ))}
              </div>
            )}
          </div>

          <button
            className={`sb-speak-btn ${spokenText ? 'speaking' : ''}`}
            onClick={speakSentence}
            disabled={sentence.length === 0}
          >
            <span className="sb-speak-icon">🔊</span>
            <div>
              <div className="sb-speak-label">{spokenText ? 'Speaking...' : 'Speak Sentence'}</div>
              <div className="sb-speak-sub">Uses Indian English voice</div>
            </div>
          </button>

          <div className="sb-history">
            <div className="sb-history-label">📜 Letter History</div>
            <div className="sb-history-chips">
              {sentence.filter(s => s.type === 'letter').slice(-20).map((s, i) => (
                <span key={i} className="sb-history-chip">{s.char}</span>
              ))}
              {sentence.filter(s => s.type === 'letter').length === 0 && (
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.85rem' }}>No letters yet</span>
              )}
            </div>
          </div>

          <div className="sb-ref-strip">
            <div className="sb-ref-label">🖼 Quick Reference</div>
            <div className="sb-ref-scroll">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                <div key={l} className={`sb-ref-item ${currentPred === l ? 'active' : ''}`}>
                  <img
                    src={`images/sign/Sign_${l}.jpg`}
                    alt={l}
                    className="sb-ref-img"
                    onError={e => { e.target.style.display='none'; }}
                  />
                  <div className="sb-ref-letter">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
