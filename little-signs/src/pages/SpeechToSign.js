import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './SpeechToSign.css';

// Common ISL words that have dedicated signs (can be expanded)
const ISL_WORD_SIGNS = {
  'hello':'HELLO','hi':'HELLO','namaste':'HELLO',
  'thank':'THANKS','thanks':'THANKS','thankyou':'THANKS',
  'good':'GOOD','bad':'BAD','yes':'YES','no':'NO',
  'please':'PLEASE','sorry':'SORRY','help':'HELP',
  'water':'WATER','food':'FOOD','eat':'EAT',
  'come':'COME','go':'GO','stop':'STOP',
  'love':'LOVE','like':'LIKE','happy':'HAPPY','sad':'SAD',
  'mother':'MOTHER','father':'FATHER','family':'FAMILY',
  'school':'SCHOOL','teacher':'TEACHER','learn':'LEARN',
  'sign':'SIGN','language':'LANGUAGE','india':'INDIA',
};

// Slide show delay per sign (ms)
const SLIDE_DELAY = 1500;

export default function SpeechToSign() {
  const recognitionRef = useRef(null);
  const slideTimerRef  = useRef(null);

  const [isListening,   setIsListening]   = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [signs,         setSigns]         = useState([]); // [{type:'word'|'letter', value, display}]
  const [currentIdx,    setCurrentIdx]    = useState(-1); // which sign is showing
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [inputText,     setInputText]     = useState('');
  const [mode,          setMode]          = useState('speech'); // speech | type
  const [particles,     setParticles]     = useState([]);
  const [supported,     setSupported]     = useState(true);
  const [waveActive,    setWaveActive]    = useState(false);

  // ── Particles ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    const p = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      dur: 4 + Math.random() * 8,
      delay: Math.random() * 6,
      color: ['#9d4dff','#ff4d9e','#4d79ff','#00e5ff','#ffeb4d'][Math.floor(Math.random() * 5)],
    }));
    setParticles(p);
  }, []);

  // ── Text → sign sequence ──────────────────────────────────────────────────
  const textToSigns = useCallback((text) => {
    if (!text.trim()) return [];
    const words    = text.toLowerCase().trim().split(/\s+/);
    const sequence = [];
    words.forEach(word => {
      const clean = word.replace(/[^a-z]/g, '');
      if (!clean) return;
      const wordKey = ISL_WORD_SIGNS[clean];
      if (wordKey) {
        // Has a dedicated word sign
        sequence.push({ type: 'word', value: wordKey, display: word.toUpperCase(), original: clean });
      } else {
        // Fingerspell letter by letter
        clean.split('').forEach(letter => {
          sequence.push({ type: 'letter', value: letter.toUpperCase(), display: letter.toUpperCase(), original: letter });
        });
      }
      // Space between words
      sequence.push({ type: 'space', value: ' ', display: '·', original: ' ' });
    });
    return sequence.slice(0, -1); // remove trailing space
  }, []);

  // ── Start slideshow ────────────────────────────────────────────────────────
  const playSlideshow = useCallback((signSeq) => {
    if (!signSeq.length) return;
    setIsPlaying(true);
    setCurrentIdx(0);
    let idx = 0;
    const next = () => {
      idx++;
      if (idx < signSeq.length) {
        setCurrentIdx(idx);
        const delay = signSeq[idx].type === 'space' ? 400 : SLIDE_DELAY;
        slideTimerRef.current = setTimeout(next, delay);
      } else {
        setIsPlaying(false);
        setCurrentIdx(-1);
      }
    };
    slideTimerRef.current = setTimeout(next, SLIDE_DELAY);
  }, []);

  const stopSlideshow = useCallback(() => {
    clearTimeout(slideTimerRef.current);
    setIsPlaying(false);
    setCurrentIdx(-1);
  }, []);

  // ── Process text ───────────────────────────────────────────────────────────
  const processText = useCallback((text) => {
    stopSlideshow();
    const seq = textToSigns(text);
    setSigns(seq);
    if (seq.length > 0) setTimeout(() => playSlideshow(seq), 300);
  }, [textToSigns, playSlideshow, stopSlideshow]);

  // ── Speech recognition ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser. Use Chrome!'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang         = 'en-IN'; // Indian English
    recognition.continuous    = false;
    recognition.interimResults= true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setWaveActive(true);
      setTranscript('');
      setSigns([]);
      stopSlideshow();
    };

    recognition.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) processText(final);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      setWaveActive(false);
      if (e.error === 'no-speech') setTranscript('No speech detected. Try again!');
      else if (e.error === 'not-allowed') setTranscript('Microphone permission denied!');
      else setTranscript(`Error: ${e.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      setWaveActive(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [processText, stopSlideshow]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setWaveActive(false);
  }, []);

  // ── Type mode submit ───────────────────────────────────────────────────────
  const handleTypeSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setTranscript(inputText);
    processText(inputText);
  };

  // ── Current sign display ───────────────────────────────────────────────────
  const currentSign = currentIdx >= 0 && signs[currentIdx] ? signs[currentIdx] : null;

  return (
    <div className="sts-root">
      {/* Nebula */}
      <div className="sts-nebula">
        {particles.map(p => (
          <div key={p.id} className="sts-particle" style={{
            left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size,
            background:p.color,
            animationDuration:`${p.dur}s`,
            animationDelay:`${p.delay}s`,
          }}/>
        ))}
        <div className="sts-glow g1"/>
        <div className="sts-glow g2"/>
        <div className="sts-glow g3"/>
      </div>

      {/* Header */}
      <header className="sts-header">
        <Link to="/home" className="sts-back">← Home</Link>
        <div className="sts-header-center">
          <h1 className="sts-title">🎤 Speech → Signs</h1>
          <p className="sts-subtitle">Speak or type in Indian English → See ISL signs</p>
        </div>
        <div className="sts-header-right">
          <Link to="/sentence-builder" className="sts-link-btn">🌌 Sentence Builder</Link>
        </div>
      </header>

      <div className="sts-body">
        {/* ── Left: Input panel ── */}
        <div className="sts-left">
          {/* Mode tabs */}
          <div className="sts-mode-tabs">
            <button className={`sts-tab ${mode==='speech'?'active':''}`} onClick={() => setMode('speech')}>
              🎤 Voice Input
            </button>
            <button className={`sts-tab ${mode==='type'?'active':''}`} onClick={() => setMode('type')}>
              ⌨️ Type Text
            </button>
          </div>

          {/* Speech mode */}
          {mode === 'speech' && (
            <div className="sts-speech-panel">
              {!supported && (
                <div className="sts-warn">⚠️ Use Google Chrome for speech recognition</div>
              )}

              {/* Mic button */}
              <div className="sts-mic-wrap">
                <button
                  className={`sts-mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={!supported}
                >
                  <div className="sts-mic-icon">{isListening ? '⏹' : '🎤'}</div>
                  <div className="sts-mic-rings">
                    <div className="sts-ring r1" style={{ animationPlayState: waveActive ? 'running' : 'paused' }}/>
                    <div className="sts-ring r2" style={{ animationPlayState: waveActive ? 'running' : 'paused' }}/>
                    <div className="sts-ring r3" style={{ animationPlayState: waveActive ? 'running' : 'paused' }}/>
                  </div>
                </button>
                <p className="sts-mic-label">
                  {isListening ? '🔴 Listening... Speak now!' : 'Tap to speak'}
                </p>
              </div>

              {/* Wave bars */}
              {isListening && (
                <div className="sts-wave">
                  {Array.from({length:20}).map((_, i) => (
                    <div key={i} className="sts-wave-bar" style={{ animationDelay:`${i*0.05}s` }}/>
                  ))}
                </div>
              )}

              {/* Language note */}
              <div className="sts-lang-note">
                <span>🇮🇳 Optimized for Indian English (en-IN)</span>
                <span>•</span>
                <span>Hindi words also supported</span>
              </div>
            </div>
          )}

          {/* Type mode */}
          {mode === 'type' && (
            <div className="sts-type-panel">
              <form onSubmit={handleTypeSubmit} className="sts-type-form">
                <textarea
                  className="sts-textarea"
                  placeholder="Type anything in English or Hindi (romanized)...&#10;&#10;Examples:&#10;• Hello my name is Priya&#10;• I like water&#10;• Thank you teacher"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  rows={6}
                />
                <button type="submit" className="sts-convert-btn">
                  ✨ Convert to Signs
                </button>
              </form>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="sts-transcript">
              <div className="sts-transcript-label">📝 Recognized:</div>
              <div className="sts-transcript-text">"{transcript}"</div>
              <button className="sts-replay-btn" onClick={() => processText(transcript)} disabled={isPlaying}>
                {isPlaying ? '▶ Playing...' : '▶ Replay Signs'}
              </button>
            </div>
          )}

          {/* Sign sequence overview */}
          {signs.length > 0 && (
            <div className="sts-sequence">
              <div className="sts-seq-label">📋 Sign Sequence ({signs.filter(s=>s.type!=='space').length} signs):</div>
              <div className="sts-seq-chips">
                {signs.map((s, i) => (
                  s.type === 'space' ? null :
                  <span key={i}
                    className={`sts-seq-chip ${s.type} ${i === currentIdx ? 'active' : ''}`}>
                    {s.display}
                    {s.type === 'word' && <span className="sts-seq-tag">word</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ISL word dictionary note */}
          <div className="sts-dict-note">
            <div className="sts-dict-title">💡 How words are converted</div>
            <div className="sts-dict-body">
              <div>🟣 <strong>Known ISL word</strong> → shows dedicated word sign</div>
              <div>🔵 <strong>Unknown word</strong> → spelled letter by letter (fingerspelling)</div>
            </div>
            <div className="sts-known-words">
              Known: {Object.keys(ISL_WORD_SIGNS).slice(0, 10).join(', ')}...
            </div>
          </div>
        </div>

        {/* ── Right: Sign display ── */}
        <div className="sts-right">
          {/* Main sign display */}
          <div className={`sts-sign-stage ${isPlaying ? 'playing' : ''} ${currentSign?.type === 'word' ? 'word-sign' : ''}`}>
            {!currentSign && !isPlaying && signs.length === 0 && (
              <div className="sts-stage-idle">
                <div className="sts-stage-idle-icon">🤟</div>
                <div className="sts-stage-idle-text">Signs will appear here</div>
                <div className="sts-stage-idle-sub">Speak or type to begin</div>
              </div>
            )}

            {!currentSign && !isPlaying && signs.length > 0 && (
              <div className="sts-stage-idle">
                <div className="sts-stage-idle-icon">✅</div>
                <div className="sts-stage-idle-text">Complete!</div>
                <button className="sts-replay-sm" onClick={() => { stopSlideshow(); setTimeout(() => playSlideshow(signs), 100); }}>
                  ▶ Play Again
                </button>
              </div>
            )}

            {currentSign && currentSign.type !== 'space' && (
              <div className="sts-sign-card" key={currentIdx}>
                {/* Sign image */}
                <div className="sts-sign-img-wrap">
                  <img
                    src={`images/sign/Sign_${currentSign.value}.jpg`}
                    alt={currentSign.value}
                    className="sts-sign-img"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                  />
                  <div className="sts-sign-fallback" style={{ display:'none' }}>
                    <span>{currentSign.display}</span>
                  </div>
                </div>

                {/* Sign label */}
                <div className="sts-sign-label">
                  <div className="sts-sign-char">{currentSign.display}</div>
                  <div className={`sts-sign-type ${currentSign.type}`}>
                    {currentSign.type === 'word' ? '🟣 ISL Word Sign' : '🔵 Fingerspell'}
                  </div>
                </div>

                {/* Progress */}
                <div className="sts-progress-row">
                  <span>{currentIdx + 1} / {signs.filter(s=>s.type!=='space').length + signs.filter(s=>s.type==='space').length}</span>
                  <div className="sts-progress-track">
                    <div className="sts-progress-fill"
                      style={{ width: `${((currentIdx+1)/signs.length)*100}%` }}/>
                  </div>
                </div>
              </div>
            )}

            {currentSign && currentSign.type === 'space' && (
              <div className="sts-space-card">
                <div className="sts-space-icon">⎵</div>
                <div className="sts-space-label">Word Space</div>
              </div>
            )}
          </div>

          {/* Playback controls */}
          {signs.length > 0 && (
            <div className="sts-playback">
              <button className="sts-play-btn" onClick={() => { stopSlideshow(); setTimeout(() => playSlideshow(signs), 100); }} disabled={isPlaying}>
                ▶ Play All
              </button>
              <button className="sts-stop-btn" onClick={stopSlideshow} disabled={!isPlaying}>
                ⏹ Stop
              </button>
              <div className="sts-speed-note">
                Each sign shows for {SLIDE_DELAY/1000}s
              </div>
            </div>
          )}

          {/* All signs grid */}
          {signs.filter(s => s.type !== 'space').length > 0 && (
            <div className="sts-all-signs">
              <div className="sts-all-label">All Signs in Sequence:</div>
              <div className="sts-all-grid">
                {signs.map((s, i) => s.type === 'space' ? null : (
                  <div key={i}
                    className={`sts-grid-item ${i === currentIdx ? 'active' : ''}`}
                    onClick={() => { stopSlideshow(); setCurrentIdx(i); }}>
                    <img
                      src={`images/sign/Sign_${s.value}.jpg`}
                      alt={s.value}
                      className="sts-grid-img"
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                    <div className="sts-grid-fb" style={{display:'none'}}>{s.display}</div>
                    <div className="sts-grid-label">{s.display}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
