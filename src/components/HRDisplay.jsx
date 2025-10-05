import React from 'react';

function HRDisplay({ currentHR }) {
  return (
    <div className="hr-display">
      <div className="hr-value-container">
        <div className="hr-value">{currentHR}</div>
        <div className="hr-unit">BPM</div>
      </div>
      <div className="heartbeat-icon">
        {currentHR > 0 && <span className="pulse">💓</span>}
      </div>
    </div>
  );
}

export default HRDisplay;
