import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './ISLBuddy.css';

// Quick prompts per role
const QUICK_PROMPTS = {
  learner: [
    { label: '💪 Weak signs',      msg: 'Which signs am I struggling with most?' },
    { label: '🎯 Practice today',  msg: 'What should I practice today?' },
    { label: '📊 My progress',     msg: 'Give me a summary of my progress.' },
    { label: '✋ How to sign B',   msg: 'How do I sign the letter B in ISL?' },
    { label: '🔥 My streak',       msg: 'How is my streak going?' },
    { label: '🏅 Next badge',      msg: 'What should I do to improve my score?' },
  ],
  parent: [
    { label: '📊 Child progress',  msg: "How is my child's learning going?" },
    { label: '🏠 Home activities', msg: 'What can we practice at home?' },
    { label: '⚠️ Needs help',      msg: 'Which signs does my child struggle with?' },
    { label: '✅ Mastered signs',  msg: 'What has my child mastered so far?' },
    { label: '📅 Weekly summary',  msg: 'Give me a weekly progress summary.' },
    { label: '❓ What is ISL',     msg: 'Can you explain what ISL is?' },
  ],
  teacher: [
    { label: '📊 Class summary',   msg: 'Give me a summary of my class performance.' },
    { label: '⚠️ Needs attention', msg: 'Which students need the most help?' },
    { label: '📝 Hard letters',    msg: 'Which letters is the class struggling with?' },
    { label: '🎯 Group exercise',  msg: 'Suggest a group exercise for my class.' },
    { label: '📈 Improvement',     msg: 'How can I improve overall class accuracy?' },
    { label: '📋 Lesson plan',     msg: 'Help me plan this week\'s ISL lesson.' },
  ],
};

const ROLE_CONFIG = {
  learner: { color: '#6c63ff', label: 'Learner Coach',  emoji: '🤟' },
  parent:  { color: '#ff6b9d', label: 'Family Guide',   emoji: '👨‍👩‍👧' },
  teacher: { color: '#00c896', label: 'Class Assistant', emoji: '👩‍🏫' },
};

export default function ISLBuddy({ onClose }) {
  const { user, authFetch } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const role       = user?.role || 'learner';
  const config     = ROLE_CONFIG[role] || ROLE_CONFIG.learner;
  const prompts    = QUICK_PROMPTS[role] || QUICK_PROMPTS.learner;
  const firstName  = user?.name?.split(' ')[0] || 'there';

  const GREETINGS = {
    learner: `Hey ${firstName}! 🤟 I'm ISL Buddy, your personal ISL coach.\nI can see your progress and I'm here to help you practice smarter. What can I help you with today?`,
    parent:  `Hi ${firstName}! 👨‍👩‍👧 I'm ISL Buddy, your family's ISL guide.\nI have your child's learning data and I'm here to help you support their journey. What would you like to know?`,
    teacher: `Hello ${firstName}! 👩‍🏫 I'm ISL Buddy, your classroom assistant.\nI have your class analytics ready. How can I help you today?`,
  };

  const [messages,    setMessages]    = useState([{ role: 'assistant', text: GREETINGS[role], time: new Date() }]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [spokenText,  setSpokenText]  = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', text: msgText, time: new Date() }]);
    setLoading(true);

    try {
      const res = await authFetch('/chat/isl-buddy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          history: messages.slice(-8).map(m => ({
            role:  m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }],
          })),
        }),
      });

      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply, time: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Oops! I'm having trouble connecting. Please try again. 🙏",
        time: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, authFetch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const speakMessage = (text) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-IN'; utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
    setSpokenText(text);
    utter.onend = () => setSpokenText('');
  };

  const formatTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const formatText = (t) => t.split('\n').map((l, i, a) => <span key={i}>{l}{i < a.length - 1 && <br />}</span>);

  if (isMinimized) {
    return (
      <button className="isl-minimized" onClick={() => setIsMinimized(false)}
        style={{ '--role-color': config.color }}>
        <span className="isl-mini-avatar">{config.emoji}</span>
        <span className="isl-mini-label">ISL Buddy</span>
        <span className="isl-mini-dot" />
      </button>
    );
  }

  return (
    <div className="isl-overlay">
      <div className="isl-panel" style={{ '--role-color': config.color }}>

        {/* Header */}
        <div className="isl-header">
          <div className="isl-header-left">
            <div className="isl-avatar">
              <span>{config.emoji}</span>
              <span className="isl-online-dot" />
            </div>
            <div className="isl-header-info">
              <div className="isl-header-name">ISL Buddy
                <span className="isl-role-badge">{config.label}</span>
              </div>
              <div className="isl-header-status">
                {loading ? 'Thinking...' : 'Online · powered by AI'}
              </div>
            </div>
          </div>
          <div className="isl-header-actions">
            <button className="isl-icon-btn" onClick={() => setIsMinimized(true)} title="Minimise">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="isl-icon-btn danger" onClick={onClose} title="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="isl-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`isl-msg-row ${msg.role === 'user' ? 'user' : 'bot'}`}>
              {msg.role === 'assistant' && (
                <div className="isl-bot-avatar">{config.emoji}</div>
              )}
              <div className={`isl-bubble ${msg.role} ${msg.isError ? 'error' : ''}`}>
                <div className="isl-bubble-text">{formatText(msg.text)}</div>
                <div className="isl-bubble-footer">
                  <span className="isl-bubble-time">{formatTime(msg.time)}</span>
                  {msg.role === 'assistant' && (
                    <button className="isl-speak-msg-btn"
                      onClick={() => speakMessage(msg.text)}
                      title="Read aloud"
                      style={{ opacity: spokenText === msg.text ? 1 : 0.4 }}>
                      🔊
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="isl-msg-row bot">
              <div className="isl-bot-avatar">{config.emoji}</div>
              <div className="isl-bubble bot typing">
                <span className="isl-dot" style={{ animationDelay: '0ms' }} />
                <span className="isl-dot" style={{ animationDelay: '160ms' }} />
                <span className="isl-dot" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        <div className="isl-quick-prompts">
          {prompts.map((q, i) => (
            <button key={i} className="isl-quick-btn"
              onClick={() => sendMessage(q.msg)} disabled={loading}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="isl-input-row">
          <textarea
            ref={inputRef}
            className="isl-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ISL Buddy anything...`}
            rows={1}
            disabled={loading}
          />
          <button
            className={`isl-send-btn ${input.trim() ? 'active' : ''}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l14-7-7 14V9H2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
