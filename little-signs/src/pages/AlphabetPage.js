import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { awardBadge } from '../utils/badges';
import './AlphabetPage.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROWS = [
  ['A','B','C','D','E'],
  ['F','G','H','I','J'],
  ['K','L','M','N','O'],
  ['P','Q','R','S','T'],
  ['U','V','W','X','Y','Z'],
];

export default function AlphabetPage() {
  const { user, authFetch } = useAuth();
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const intervalRef   = useRef(null);
  const streamRef     = useRef(null);
  const isInFlightRef = useRef(false); // ← guard: prevents overlapping requests

  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isDetecting,    setIsDetecting]    = useState(false);
  const [score,          setScore]          = useState(0);
  const [predicted,      setPredicted]      = useState('-');
  const [confidence,     setConfidence]     = useState(0);
  const [feedback,       setFeedback]       = useState({ msg: 'Tap a letter stone to begin your magic adventure!', type: 'neutral' });
  const [correctStreak,  setCorrectStreak]  = useState(0);
  const [lastCorrectTime,setLastCorrectTime]= useState(0);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [newBadge,       setNewBadge]       = useState(null);

  const showBadge = useCallback((badge) => {
    setNewBadge(badge);
    setTimeout(() => setNewBadge(null), 3500);
  }, []);

  // Confetti helper
  const triggerConfetti = useCallback(() => {
    const colors = ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff'];
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      dur: Math.random() * 2000 + 2000,
    }));
    setConfettiPieces(pieces);
    setTimeout(() => setConfettiPieces([]), 5000);
  }, []);

  const showFeedback = useCallback((msg, type) => {
    setFeedback({ msg, type });
    if (type === 'incorrect') setCorrectStreak(0);
  }, []);

  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);
    isInFlightRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsDetecting(false);
    showFeedback('Ready to try another letter?', 'neutral');
  }, [showFeedback]);

  const detectSign = useCallback(async () => {
    // ── Guard: skip if previous request still in flight ──
    if (isInFlightRef.current) return;
    isInFlightRef.current = true;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { isInFlightRef.current = false; return; }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ── Lower quality = smaller payload = faster ──
    const imageData = canvas.toDataURL('image/jpeg', 0.5);

    try {
      const res = await fetch('http://localhost:5000/detect-sign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: imageData, target: selectedLetter }),
      });
      const result = await res.json();
      if (result.success) {
        setPredicted(result.prediction || '-');
        setConfidence(Math.round(result.confidence * 100));
        if (result.is_correct && result.confidence > 0.85) {
          const now = Date.now();
          if (now - lastCorrectTime > 3000) {
            setLastCorrectTime(now);
            setCorrectStreak(s => {
              const newStreak = s + 1;
              const pts = newStreak >= 3 ? 2 : 1;
              setScore(sc => sc + pts);
              if (user && authFetch) {
                authFetch('/learner/progress', {
                  method: 'POST',
                  body: JSON.stringify({
                    game_type:   'alphabet',
                    letter:      selectedLetter,
                    is_correct:  true,
                    confidence:  result.confidence,
                    score_delta: pts,
                  }),
                }).catch(console.error);
              }
              triggerConfetti();

              // ── Award badges ──
              if (user && authFetch) {
                awardBadge('first_sign', user, authFetch, showBadge);
                if (newStreak >= 3)  awardBadge('streak_3',  user, authFetch, showBadge);
                if (newStreak >= 5)  awardBadge('streak_5',  user, authFetch, showBadge);
                if (newStreak >= 10) awardBadge('streak_10', user, authFetch, showBadge);
              }
              showFeedback(newStreak >= 3 ? `STREAK! +${pts} points! 🔥` : `Perfect! ${result.prediction}! 🎉`, 'correct');
              return newStreak;
            });
            setTimeout(stopDetection, 2000);
          }
        } else if (result.prediction) {
          if (user && authFetch) {
            authFetch('/learner/progress', {
              method: 'POST',
              body: JSON.stringify({
                game_type:   'alphabet',
                letter:      selectedLetter,
                is_correct:  false,
                confidence:  result.confidence,
                score_delta: 0,
              }),
            }).catch(console.error);
          }
          showFeedback(`Try again! You made ${result.prediction}`, 'incorrect');
        } else {
          showFeedback('Show your hand clearly ✋', 'neutral');
        }
      }
    } catch {
      showFeedback('Connection error – is backend running?', 'incorrect');
    } finally {
      // ── Always release the guard ──
      isInFlightRef.current = false;
    }
  }, [selectedLetter, lastCorrectTime, triggerConfetti, showFeedback, stopDetection, user, authFetch, showBadge]);

  // Restart interval when detectSign ref changes
  useEffect(() => {
    if (isDetecting) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detectSign, 800); // ← 300 → 800ms
    }
    return () => clearInterval(intervalRef.current);
  }, [detectSign, isDetecting]);

  const startDetection = useCallback(async () => {
    if (!selectedLetter) { showFeedback('Please select a letter first!', 'incorrect'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      const canvas  = canvasRef.current;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      setIsDetecting(true);
      showFeedback(`Show me ${selectedLetter}! ✋`, 'neutral');
      intervalRef.current = setInterval(detectSign, 800); // ← 300 → 800ms
    } catch (err) {
      showFeedback(`Camera error: ${err.message}`, 'incorrect');
    }
  }, [selectedLetter, showFeedback, detectSign]);

  const selectLetter = (letter) => {
    if (isDetecting) return;
    setSelectedLetter(letter);
    setPredicted('-');
    setConfidence(0);
    showFeedback(`Selected ${letter}! Now click "Start Magic Camera"`, 'neutral');
  };

  const confidenceColor = confidence > 85 ? '#4BB543' : confidence > 60 ? '#FFC107' : '#F44336';

  return (
    <div className="ap-container">
      {/* Badge popup */}
      {newBadge && (
        <div className="ap-badge-popup">
          <div className="ap-badge-inner">
            <div className="ap-badge-emoji">{newBadge.emoji}</div>
            <div className="ap-badge-unlocked">Badge Unlocked!</div>
            <div className="ap-badge-name">{newBadge.name}</div>
            <div className="ap-badge-desc">{newBadge.desc}</div>
          </div>
        </div>
      )}

      {/* Confetti */}
      <div className="ap-confetti-wrap">
        {confettiPieces.map(p => (
          <div key={p.id} className="ap-confetti-piece" style={{
            left: `${p.left}%`, backgroundColor: p.color,
            width: p.size, height: p.size,
            animationDuration: `${p.dur}ms`,
          }} />
        ))}
      </div>

      {/* Header */}
      <header className="ap-header animate__animated animate__bounceInDown">
        <Link to="/home" className="ap-back">← Home</Link>
        <h1>✨ Magic Alphabet Adventure ✨</h1>
        <div className="ap-score">⭐ <span>{score}</span></div>
      </header>

      {/* Letter stones */}
      <div className="ap-stone-grid">
        {ROWS.map((row, i) => (
          <div key={i} className="ap-stone-row">
            {row.map(letter => (
              <button
                key={letter}
                className={`ap-stone ${selectedLetter === letter ? 'active' : ''}`}
                onClick={() => selectLetter(letter)}
                disabled={isDetecting}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main game area */}
      <main className="ap-game-area">
        <div className="ap-camera-row">
          {/* Camera */}
          <div className="ap-camera-frame">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Letter preview */}
          <div className="ap-letter-preview">
            <h2 className="ap-current-letter">{selectedLetter || 'Choose a letter!'}</h2>
            <div className="ap-sign-demo-wrap">
              {selectedLetter ? (
                <img
                  src={`images/sign/Sign_${selectedLetter}.jpg`}
                  alt={`Sign language for ${selectedLetter}`}
                  className="ap-sign-img"
                  onError={e => { e.target.style.display='none'; }}
                />
              ) : (
                <div className="ap-sign-placeholder">👋</div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="ap-controls">
          <button className="ap-btn" onClick={startDetection} disabled={isDetecting}>
            ✨ Start Magic Camera ✨
          </button>
          <button className="ap-btn ap-btn-stop" onClick={stopDetection} disabled={!isDetecting}>
            ❌ Stop Magic
          </button>
        </div>

        {/* Results */}
        <div className="ap-results">
          <div className="ap-result-box">
            <h3>Your Sign:</h3>
            <div className="ap-result-val">{predicted}</div>
          </div>
          <div className="ap-result-box">
            <h3>Magic Power:</h3>
            <div className="ap-result-val" style={{ color: confidenceColor }}>{confidence}%</div>
          </div>
          <div className={`ap-feedback ap-feedback-${feedback.type}`}>
            <p>{feedback.msg}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
