import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { awardBadge } from '../utils/badges';
import './AlphabetPage.css';

const ROWS = [
  ['A','B','C','D','E'],
  ['F','G','H','I','J'],
  ['K','L','M','N','O'],
  ['P','Q','R','S','T'],
  ['U','V','W','X','Y','Z'],
];

const CORRECT_FRAMES_NEEDED = 2;     // 2 consecutive frames = confirmed correct
const DETECT_INTERVAL_MS    = 800;
const CORRECT_THRESHOLD     = 0.70;  // ✅ 70%+ = correct
const FEEDBACK_THRESHOLD    = 0.50;  // show wrong feedback only above 50%
const COOLDOWN_MS           = 3000;

export default function AlphabetPage() {
  const { user, authFetch } = useAuth();
  const videoRef         = useRef(null);
  const canvasRef        = useRef(null);
  const intervalRef      = useRef(null);
  const streamRef        = useRef(null);
  const isInFlightRef    = useRef(false);
  const correctFramesRef = useRef(0);
  const lastSavedRef     = useRef(0);
  const attemptSavedRef  = useRef(false);
  const giveUpTimerRef   = useRef(null);

  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isDetecting,    setIsDetecting]    = useState(false);
  const [score,          setScore]          = useState(0);
  const [predicted,      setPredicted]      = useState('-');
  const [confidence,     setConfidence]     = useState(0);
  const [feedback,       setFeedback]       = useState({ msg: 'Tap a letter stone to begin!', type: 'neutral' });
  const [correctStreak,  setCorrectStreak]  = useState(0);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [newBadge,       setNewBadge]       = useState(null);

  const showBadge = useCallback((badge) => {
    setNewBadge(badge);
    setTimeout(() => setNewBadge(null), 3500);
  }, []);

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
  }, []);

  // ── Save ONE result per attempt ───────────────────────────────────────────
  const saveResult = useCallback((isCorrect, conf, pts = 0) => {
    if (!user || !authFetch) return;
    const now = Date.now();
    if (now - lastSavedRef.current < COOLDOWN_MS) return;
    lastSavedRef.current = now;
    authFetch('/learner/progress', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type:   'alphabet',
        letter:      selectedLetter,
        is_correct:  isCorrect,
        confidence:  conf,
        score_delta: pts,
      }),
    }).catch(console.error);
  }, [user, authFetch, selectedLetter]);

  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);
    isInFlightRef.current    = false;
    correctFramesRef.current = 0;
    attemptSavedRef.current  = false;
    if (giveUpTimerRef.current) {
      clearTimeout(giveUpTimerRef.current);
      giveUpTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsDetecting(false);
    showFeedback('Ready to try another letter?', 'neutral');
  }, [showFeedback]);

  const detectSign = useCallback(async () => {
    if (isInFlightRef.current) return;
    isInFlightRef.current = true;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { isInFlightRef.current = false; return; }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.5);

    try {
      const res    = await fetch('http://localhost:5000/detect-sign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: imageData, target: selectedLetter }),
      });
      const result = await res.json();

      if (!result.success) { isInFlightRef.current = false; return; }

      setPredicted(result.prediction || '-');
      setConfidence(Math.round(result.confidence * 100));

      // ── CORRECT sign at 70%+ ──────────────────────────────────────────────
      if (result.is_correct && result.confidence >= CORRECT_THRESHOLD) {
        correctFramesRef.current += 1;

        if (correctFramesRef.current >= CORRECT_FRAMES_NEEDED && !attemptSavedRef.current) {
          attemptSavedRef.current  = true;
          correctFramesRef.current = 0;

          // Cancel give-up timer
          if (giveUpTimerRef.current) {
            clearTimeout(giveUpTimerRef.current);
            giveUpTimerRef.current = null;
          }

          setCorrectStreak(s => {
            const newStreak = s + 1;
            const pts = newStreak >= 3 ? 2 : 1;
            setScore(sc => sc + pts);
            saveResult(true, result.confidence, pts);
            triggerConfetti();

            if (user && authFetch) {
              awardBadge('first_sign', user, authFetch, showBadge);
              if (newStreak >= 3)  awardBadge('streak_3',  user, authFetch, showBadge);
              if (newStreak >= 5)  awardBadge('streak_5',  user, authFetch, showBadge);
              if (newStreak >= 10) awardBadge('streak_10', user, authFetch, showBadge);
            }

            showFeedback(
              newStreak >= 3
                ? `🔥 STREAK! +${pts} points!`
                : `🎉 Perfect ${result.prediction}! +${pts} point`,
              'correct'
            );
            return newStreak;
          });

          setTimeout(stopDetection, 2000);

        } else if (!attemptSavedRef.current) {
          showFeedback(
            `✅ Good! Hold it... (${correctFramesRef.current}/${CORRECT_FRAMES_NEEDED})`,
            'neutral'
          );
        }

      // ── WRONG sign detected ───────────────────────────────────────────────
      } else if (result.prediction && result.prediction !== selectedLetter) {
        correctFramesRef.current = 0; // reset streak of correct frames

        // NEVER save incorrect mid-session — only the give-up timer does that
        if (result.confidence >= FEEDBACK_THRESHOLD) {
          showFeedback(`Showing ${result.prediction} — try ${selectedLetter}! ✋`, 'incorrect');
        } else {
          showFeedback(`Show your hand clearly ✋`, 'neutral');
        }

      // ── No hand / below feedback threshold ───────────────────────────────
      } else {
        correctFramesRef.current = 0;
        showFeedback(`Show me ${selectedLetter}! ✋`, 'neutral');
      }

    } catch {
      showFeedback('Connection error – is backend running?', 'incorrect');
    } finally {
      isInFlightRef.current = false;
    }
  }, [selectedLetter, triggerConfetti, showFeedback, stopDetection, saveResult, user, authFetch, showBadge]);

  useEffect(() => {
    if (isDetecting) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detectSign, DETECT_INTERVAL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [detectSign, isDetecting]);

  const startDetection = useCallback(async () => {
    if (!selectedLetter) { showFeedback('Please select a letter first!', 'incorrect'); return; }
    correctFramesRef.current = 0;
    attemptSavedRef.current  = false;

    // After 30s of struggling → save ONE incorrect (they genuinely couldn't do it)
    if (giveUpTimerRef.current) clearTimeout(giveUpTimerRef.current);
    giveUpTimerRef.current = setTimeout(() => {
      if (!attemptSavedRef.current) {
        attemptSavedRef.current = true;
        saveResult(false, 0.5, 0);
      }
    }, 30000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current        = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      canvasRef.current.width  = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      setIsDetecting(true);
      showFeedback(`Show me ${selectedLetter}! ✋`, 'neutral');
    } catch (err) {
      if (giveUpTimerRef.current) clearTimeout(giveUpTimerRef.current);
      showFeedback(`Camera error: ${err.message}`, 'incorrect');
    }
  }, [selectedLetter, showFeedback, saveResult]);

  const selectLetter = (letter) => {
    if (isDetecting) return;
    setSelectedLetter(letter);
    setPredicted('-');
    setConfidence(0);
    correctFramesRef.current = 0;
    attemptSavedRef.current  = false;
    showFeedback(`Selected ${letter}! Click "Start Magic Camera" to begin`, 'neutral');
  };

  const confidenceColor = confidence >= 70 ? '#4BB543' : confidence >= 50 ? '#FFC107' : '#F44336';

  return (
    <div className="ap-container">
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

      <div className="ap-confetti-wrap">
        {confettiPieces.map(p => (
          <div key={p.id} className="ap-confetti-piece" style={{
            left: `${p.left}%`, backgroundColor: p.color,
            width: p.size, height: p.size,
            animationDuration: `${p.dur}ms`,
          }} />
        ))}
      </div>

      <header className="ap-header animate__animated animate__bounceInDown">
        <Link to="/home" className="ap-back">← Home</Link>
        <h1>✨ Magic Alphabet Adventure ✨</h1>
        <div className="ap-score">⭐ <span>{score}</span></div>
      </header>

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

      <main className="ap-game-area">
        <div className="ap-camera-row">
          <div className="ap-camera-frame">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          <div className="ap-letter-preview">
            <h2 className="ap-current-letter">{selectedLetter || 'Choose a letter!'}</h2>
            <div className="ap-sign-demo-wrap">
              {selectedLetter ? (
                <img
                  src={`images/sign/Sign_${selectedLetter}.jpg`}
                  alt={`Sign for ${selectedLetter}`}
                  className="ap-sign-img"
                  onError={e => { e.target.style.display='none'; }}
                />
              ) : (
                <div className="ap-sign-placeholder">👋</div>
              )}
            </div>
          </div>
        </div>

        <div className="ap-controls">
          <button className="ap-btn" onClick={startDetection} disabled={isDetecting}>
            ✨ Start Magic Camera ✨
          </button>
          <button className="ap-btn ap-btn-stop" onClick={stopDetection} disabled={!isDetecting}>
            ❌ Stop Magic
          </button>
        </div>

        <div className="ap-results">
          <div className="ap-result-box">
            <h3>Your Sign:</h3>
            <div className="ap-result-val">{predicted}</div>
          </div>
          <div className="ap-result-box">
            <h3>Confidence:</h3>
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
