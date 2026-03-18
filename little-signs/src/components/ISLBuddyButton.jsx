import React, { useState } from 'react';
import ISLBuddy from './ISLBuddy';
import './ISLBuddyButton.css';

/**
 * Drop this component into your App.jsx or any layout wrapper.
 * It renders a floating 🤟 button that opens ISL Buddy.
 *
 * Usage in App.jsx:
 *   import ISLBuddyButton from './components/ISLBuddyButton';
 *   ...
 *   <ISLBuddyButton />
 */
export default function ISLBuddyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ISLBuddy onClose={() => setOpen(false)} />}
      {!open && (
        <button className="isl-launch-btn" onClick={() => setOpen(true)}>
          <span className="isl-launch-icon">🤟</span>
          <span className="isl-launch-tooltip">ISL Buddy</span>
          <span className="isl-launch-dot" />
        </button>
      )}
    </>
  );
}
