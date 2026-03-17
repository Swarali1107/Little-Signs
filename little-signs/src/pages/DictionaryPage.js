import React from 'react';
import { Link } from 'react-router-dom';
import './DictionaryPage.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function DictionaryPage() {
  return (
    <div className="dp-page">
      {/* Decorations */}
      <div className="dp-decoration">
        {['📚','📖','✍️','📝'].map((em, i) => (
          <div key={i} className="dp-float-book" style={{ left: `${10 + i * 25}%`, animationDelay: `${i * 4}s` }}>{em}</div>
        ))}
      </div>

      {/* Header */}
      <div className="dp-header">
        <div className="dp-logo">Dictionary Cosmos</div>
        <p className="dp-subtitle">Explore the signs for every letter of the alphabet</p>
        <div className="dp-nav">
          <Link to="/">Home</Link>
          <Link to="/alphabet">Alphabet Game</Link>
          <Link to="/numbers">Numbers</Link>
        </div>
      </div>

      {/* Bookshelf */}
      <div className="dp-shelf" />

      {/* Letters grid */}
      <div className="dp-container">
        <div className="dp-grid">
          {LETTERS.map(letter => (
            <LetterCard key={letter} letter={letter} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="dp-footer">
        <p>© 2024 LittleSigns. Bridging the communication gap with technology.</p>
        <div className="dp-footer-links">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/parents">Parents</Link>
        </div>
      </footer>
    </div>
  );
}

function LetterCard({ letter }) {
  const [flipped, setFlipped] = React.useState(false);

  return (
    <div
      className={`dp-card ${flipped ? 'dp-flipped' : ''}`}
      onClick={() => setFlipped(f => !f)}
    >
      <div className="dp-card-inner">
        {/* Front */}
        <div className="dp-card-front">
          <div className="dp-letter">{letter}</div>
          <div className="dp-letter-label">Sign Language</div>
        </div>
        {/* Back */}
        <div className="dp-card-back">
          <img
            src={`images/sign/Sign_${letter}.png`}
            alt={`Sign for ${letter}`}
            className="dp-sign-img"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <div className="dp-sign-fallback" style={{ display: 'none' }}>
            <div className="dp-letter-sm">{letter}</div>
            <div>✋</div>
          </div>
          <div className="dp-card-label">{letter}</div>
        </div>
      </div>
    </div>
  );
}
