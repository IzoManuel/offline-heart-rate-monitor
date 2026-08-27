import React from 'react';

function HRDisplay({ currentHR }) {
  return (
    <div className="hr-display">
      <div className="metric-card-heading">Heart Rate</div>
      <div className="hr-value-container">
        <div className="hr-value">{currentHR}</div>
        <div className="hr-unit">BPM</div>
      </div>
    </div>
  );
}

export default HRDisplay;
