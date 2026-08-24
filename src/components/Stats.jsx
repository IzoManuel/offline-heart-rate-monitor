import React from 'react';

function Stats({ stats, readingsCount }) {
  return (
    <div className="stats-section">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Average</div>
          <div className="stat-value">{stats.average}</div>
          <div className="stat-unit">BPM</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Maximum</div>
          <div className="stat-value">{stats.max}</div>
          <div className="stat-unit">BPM</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Minimum</div>
          <div className="stat-value">{stats.min}</div>
          <div className="stat-unit">BPM</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Readings</div>
          <div className="stat-value">{readingsCount}</div>
          <div className="stat-unit">Samples</div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
