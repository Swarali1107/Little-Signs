import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { awardBadge, BADGES } from '../utils/badges';
import './NumbersPage.css';

const NUMBERS    = Array.from({ length: 10 }, (_, i) => i);
const SIGN_EMOJIS = ['👌','☝️','✌️','🤟','🖖','🖐️','🤙','✋','🤘','👆'];

export default function NumbersPage() {
  const { user, authFetch } = useAuth();
  const bgRef          = useRef(null);
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const intervalRef    = useRef(null);
  const streamRef      = useRef(null);
  const isInFlightRef  = useRef(false);

  // Mode: 'learn' | 'detect' | 'quiz'
  const [mode,           setMode]           = useState('learn');
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [isDetecting,    setIsDetecting]    = useState(false);
  const [cameraLoading,  setCameraLoading]  = useState(false);
  const [predicted,      setPredicted]      = useState('-');
  const [confidence,     setConfidence]     = useState(0);
  const [feedback,       setFeedback]       = useState({ msg: 'Select a number to begin!', type: 'neutral' });
  const [score,          setScore]          = useState(0);
  const [correctStreak,  setCorrectStreak]  = useState(0);
  const [lastCorrectTime,setLastCorrectTime]= useState(0);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [newBadge,       setNewBadge]       = useState(null);
  const [backendOnline,  setBackendOnline]  = useState(true);

  // Quiz state
  const [quizQ,     setQuizQ]     = useState(null);
  const [quizOpt,   setQuizOpt]   = useState(null);
  const [quizDone,  setQuizDone]  = useState(false);
  const [quizScore, setQuizScore] = useState({ correct:0, total:0 });

  // BG animation
  useEffect(() => {
    const c = bgRef.current; if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className  = 'np-hand';
      el.textContent = SIGN_EMOJIS[Math.floor(Math.random() * SIGN_EMOJIS.length)];
      el.style.left             = Math.random() * 100 + 'vw';
      el.style.fontSize         = (30 + Math.random() * 30) + 'px';
      el.style.animationDuration= (15 + Math.random() * 20) + 's';
      el.style.animationDelay   = (Math.random() * 5) + 's';
      c.appendChild(el);
    }
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(r => r.json()).then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // ── Confetti ──────────────────────────────────────────────────────────────
  const triggerConfetti = useCallback(() => {
    const colors = ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      dur:  Math.random() * 2000 + 2000,
    }));
    setConfettiPieces(pieces);
    setTimeout(() => setConfettiPieces([]), 4000);
  }, []);

  const showFeedback = useCallback((msg, type) => {
    setFeedback({ msg, type });
  }, []);

  // ── Show badge popup ──────────────────────────────────────────────────────
  const showBadge = useCallback((badge) => {
    setNewBadge(badge);
    setTimeout(() => setNewBadge(null), 3500);
  }, []);

  // ── Stop detection ────────────────────────────────────────────────────────
  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);
    isInFlightRef.current = false;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current)  videoRef.current.srcObject = null;
    setIsDetecting(false);
    setCameraLoading(false);
    showFeedback('Ready to try again!', 'neutral');
  }, [showFeedback]);

  // ── Detect sign ───────────────────────────────────────────────────────────
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
      const res = await fetch('http://localhost:5000/detect-sign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: imageData, target: String(selectedNumber) }),
      });
      if (!res.ok) { setBackendOnline(false); return; }
      const result = await res.json();
      setBackendOnline(true);

      if (!result.success || !result.prediction) {
        setPredicted('-'); setConfidence(0);
        return;
      }

      const conf       = result.confidence;
      const prediction = result.prediction;

      // Only accept 0-9 digits
      if (!/^[0-9]$/.test(prediction)) { isInFlightRef.current = false; return; }

      setPredicted(prediction);
      setConfidence(Math.round(conf * 100));

      // Correct!
      if (result.is_correct && conf > 0.85) {
        const now = Date.now();
        if (now - lastCorrectTime < 3000) return;
        setLastCorrectTime(now);

        setCorrectStreak(s => {
          const streak = s + 1;
          const pts    = streak >= 3 ? 2 : 1;
          setScore(sc => sc + pts);

          if (user && authFetch) {
            authFetch('/learner/progress', {
              method: 'POST',
              body: JSON.stringify({
                game_type: 'numbers', number: selectedNumber,
                is_correct: true, confidence: conf, score_delta: pts,
              }),
            }).catch(console.error);

            // Check badges
            awardBadge('first_number', user, authFetch, showBadge);
            if (streak >= 3) awardBadge('number_streak', user, authFetch, showBadge);
          }

          triggerConfetti();
          showFeedback(streak >= 3 ? `🔥 STREAK x${streak}! +${pts} pts!` : `🎉 Perfect ${prediction}! +${pts} pt!`, 'correct');
          return streak;
        });

        setTimeout(stopDetection, 2000);

      } else if (prediction !== String(selectedNumber)) {
        if (user && authFetch) {
          authFetch('/learner/progress', {
            method: 'POST',
            body: JSON.stringify({
              game_type: 'numbers', number: selectedNumber,
              is_correct: false, confidence: conf, score_delta: 0,
            }),
          }).catch(console.error);
        }
        showFeedback(`That looks like ${prediction} — keep trying for ${selectedNumber}!`, 'incorrect');
      } else {
        showFeedback('Almost! Hold your hand steady ✋', 'neutral');
      }

    } catch { setBackendOnline(false); }
    finally  { isInFlightRef.current = false; }
  }, [selectedNumber, lastCorrectTime, triggerConfetti, showFeedback, stopDetection, user, authFetch, showBadge]);

  useEffect(() => {
    if (isDetecting) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detectSign, 800);
    }
    return () => clearInterval(intervalRef.current);
  }, [detectSign, isDetecting]);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startDetection = useCallback(async () => {
    if (selectedNumber === null) { showFeedback('Select a number first!', 'incorrect'); return; }
    if (!backendOnline) { showFeedback('🔌 ML server offline! Run detection_server.py', 'incorrect'); return; }
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width:{ ideal:1280 }, height:{ ideal:720 }, facingMode:'user' },
        audio: false,
      });
      streamRef.current          = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      canvasRef.current.width  = videoRef.current.videoWidth  || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      setIsDetecting(true);
      setCameraLoading(false);
      showFeedback(`Show me the sign for "${selectedNumber}"! ✋`, 'neutral');
    } catch (err) {
      setCameraLoading(false);
      if      (err.name === 'NotAllowedError') showFeedback('🚫 Camera permission denied!', 'incorrect');
      else if (err.name === 'NotFoundError')   showFeedback('📷 No camera found!', 'incorrect');
      else showFeedback(`Camera error: ${err.message}`, 'incorrect');
    }
  }, [selectedNumber, backendOnline, showFeedback]);

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const generateQuiz = () => {
    const answer = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    const opts   = [answer];
    while (opts.length < 4) {
      const r = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
      if (!opts.includes(r)) opts.push(r);
    }
    opts.sort(() => Math.random() - 0.5);
    setQuizQ({ answer, options: opts });
    setQuizOpt(null); setQuizDone(false);
    setQuizScore(s => ({ ...s, total: s.total + 1 }));
  };

  const handleQuizAnswer = (opt) => {
    setQuizOpt(opt); setQuizDone(true);
    if (opt === quizQ.answer) {
      setQuizScore(s => ({ ...s, correct: s.correct + 1 }));
      triggerConfetti();
    }
    setTimeout(generateQuiz, 1500);
  };

  const confColor = confidence > 85 ? '#4BB543' : confidence > 60 ? '#FFC107' : '#F44336';

  return (
    <div className="np-page">
      {/* BG */}
      <div className="np-bg" ref={bgRef} />

      {/* Confetti */}
      <div className="np-confetti-wrap">
        {confettiPieces.map(p => (
          <div key={p.id} className="np-confetti" style={{
            left:`${p.left}%`, background:p.color,
            width:p.size, height:p.size, animationDuration:`${p.dur}ms`,
          }}/>
        ))}
      </div>

      {/* Badge popup */}
      {newBadge && (
        <div className="np-badge-popup">
          <div className="np-badge-inner">
            <div className="np-badge-emoji">{newBadge.emoji}</div>
            <div className="np-badge-name">Badge Unlocked!</div>
            <div className="np-badge-title">{newBadge.name}</div>
            <div className="np-badge-desc">{newBadge.desc}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="np-header">
        <Link to="/home" className="np-back">← Home</Link>
        <h1 className="np-title">🔢 Number Signs</h1>
        <div className="np-score-badge">⭐ {score}</div>
      </header>

      {/* Mode tabs */}
      <div className="np-mode-tabs">
        {[
          { key:'learn',  label:'📚 Learn',  desc:'See all signs' },
          { key:'detect', label:'📷 Detect', desc:'Camera detection' },
          { key:'quiz',   label:'🎯 Quiz',   desc:'Test yourself' },
        ].map(m => (
          <button key={m.key}
            className={`np-mode-tab ${mode === m.key ? 'active':''}`}
            onClick={() => { setMode(m.key); if (isDetecting) stopDetection(); }}>
            <span className="np-mode-label">{m.label}</span>
            <span className="np-mode-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ── LEARN MODE ── */}
      {mode === 'learn' && (
        <section className="np-learn">
          <div className="np-grid">
            {NUMBERS.map(n => (
              <div key={n} className="np-num-card">
                <div className="np-num-badge">{n}</div>
                <div className="np-num-img-wrap">
                  <img
                    src={`images/sign/num/${n}.jpg`}
                    alt={`Sign for ${n}`}
                    onError={e => {
                      e.target.style.display='none';
                      e.target.nextSibling.style.display='flex';
                    }}
                  />
                  <div className="np-num-fallback" style={{ display:'none' }}>
                    {SIGN_EMOJIS[n]}
                  </div>
                </div>
                <div className="np-num-label">Number {n}</div>
                <button className="np-try-btn"
                  onClick={() => { setMode('detect'); setSelectedNumber(n); showFeedback(`Selected ${n}! Press Start Camera.`, 'neutral'); }}>
                  Try it →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DETECT MODE ── */}
      {mode === 'detect' && (
        <section className="np-detect">
          {!backendOnline && (
            <div className="np-offline-banner">
              ⚠️ ML Server offline — run: <code>python detection_server.py</code>
            </div>
          )}

          <div className="np-detect-row">
            {/* Number selector */}
            <div className="np-num-selector">
              <div className="np-selector-label">Choose a Number:</div>
              <div className="np-selector-grid">
                {NUMBERS.map(n => (
                  <button key={n}
                    className={`np-sel-btn ${selectedNumber === n ? 'active':''}`}
                    onClick={() => { if (!isDetecting) { setSelectedNumber(n); setPredicted('-'); setConfidence(0); showFeedback(`Selected ${n}! Press Start Camera.`, 'neutral'); }}}
                    disabled={isDetecting}>
                    {n}
                  </button>
                ))}
              </div>

              {/* Sign preview */}
              {selectedNumber !== null && (
                <div className="np-sign-preview">
                  <div className="np-preview-label">Sign for {selectedNumber}:</div>
                  <img
                    src={`images/sign/num/${selectedNumber}.jpg`}
                    alt={`Sign ${selectedNumber}`}
                    className="np-preview-img"
                    onError={e => { e.target.style.display='none'; }}
                  />
                </div>
              )}
            </div>

            {/* Camera */}
            <div className="np-camera-panel">
              <div className={`np-cam-frame ${isDetecting ? 'live':''}`}>
                <video ref={videoRef} playsInline muted className="np-video" />
                <canvas ref={canvasRef} style={{ display:'none' }} />

                {!isDetecting && !cameraLoading && (
                  <div className="np-cam-idle">
                    <div className="np-cam-icon">📷</div>
                    <div>Select a number and press Start</div>
                  </div>
                )}
                {cameraLoading && (
                  <div className="np-cam-idle">
                    <div className="np-cam-spinner" />
                    <div>Starting camera...</div>
                  </div>
                )}
                {isDetecting && (
                  <div className="np-live-pill">
                    <span className="np-live-dot"/> LIVE
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="np-cam-controls">
                <button className="np-btn-start" onClick={startDetection}
                  disabled={isDetecting || cameraLoading || selectedNumber === null}>
                  {cameraLoading ? '⏳ Starting...' : '✨ Start Camera'}
                </button>
                <button className="np-btn-stop" onClick={stopDetection} disabled={!isDetecting}>
                  ⏹ Stop
                </button>
              </div>

              {/* Results */}
              <div className="np-results-row">
                <div className="np-result-box">
                  <div className="np-result-label">Detected</div>
                  <div className="np-result-val">{predicted}</div>
                </div>
                <div className="np-result-box">
                  <div className="np-result-label">Confidence</div>
                  <div className="np-result-val" style={{ color: confColor }}>
                    {confidence > 0 ? `${confidence}%` : '—'}
                  </div>
                </div>
                <div className={`np-feedback np-fb-${feedback.type}`}>
                  {feedback.msg}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── QUIZ MODE ── */}
      {mode === 'quiz' && (
        <section className="np-quiz-section">
          <div className="np-quiz-stats">
            <div className="np-qs-item correct">
              <span>{quizScore.correct}</span><small>Correct</small>
            </div>
            <div className="np-qs-item total">
              <span>{quizScore.total}</span><small>Total</small>
            </div>
            {quizScore.total > 0 && (
              <div className="np-qs-item acc">
                <span>{Math.round(quizScore.correct/quizScore.total*100)}%</span>
                <small>Accuracy</small>
              </div>
            )}
          </div>

          {!quizQ ? (
            <div className="np-quiz-start">
              <div className="np-quiz-start-icon">🎯</div>
              <h3>Ready to test your number signs?</h3>
              <p>Look at the sign image and pick the correct number!</p>
              <button className="np-btn-start" onClick={generateQuiz}>Start Quiz!</button>
            </div>
          ) : (
            <div className="np-quiz-card">
              <div className="np-quiz-prompt">Which number is this sign?</div>
              <div className="np-quiz-sign-wrap">
                <img
                  src={`images/sign/num/${quizQ.answer}.jpg`}
                  alt="Sign to identify"
                  className="np-quiz-sign-img"
                  onError={e => { e.target.outerHTML = `<div class="np-quiz-sign-fb">${SIGN_EMOJIS[quizQ.answer]}</div>`; }}
                />
              </div>
              <div className="np-quiz-opts">
                {quizQ.options.map(opt => {
                  let cls = 'np-quiz-opt';
                  if (quizDone) {
                    if (opt === quizQ.answer) cls += ' correct';
                    else if (opt === quizOpt) cls += ' wrong';
                  }
                  return (
                    <button key={opt} className={cls}
                      onClick={() => !quizDone && handleQuizAnswer(opt)}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {quizDone && (
                <div className={`np-quiz-result ${quizOpt === quizQ.answer ? 'correct':'wrong'}`}>
                  {quizOpt === quizQ.answer ? '🎉 Correct!' : `❌ It was ${quizQ.answer}`}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
