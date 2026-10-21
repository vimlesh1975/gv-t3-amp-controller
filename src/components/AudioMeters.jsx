'use client';

import React from 'react';

export default function AudioMeters({ channelState }) {
  const dbL = channelState?.audioL ?? -48;
  const dbR = channelState?.audioR ?? -48;

  // Convert -48dB..0dB to percentage 0%..100%
  const calcPercent = (db) => {
    const clamped = Math.max(-48, Math.min(0, db));
    return Math.round(((clamped + 48) / 48) * 100);
  };

  const pctL = calcPercent(dbL);
  const pctR = calcPercent(dbR);

  return (
    <div className="audio-meter-deck" id="audio-vu-meters">
      {/* Channel 1 / Left */}
      <div className="audio-meter-row">
        <span className="audio-ch-label">L</span>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${pctL}%` }} />
        </div>
        <span className="audio-scale-db">{dbL > -48 ? `${Math.round(dbL)} dB` : '-INF'}</span>
      </div>

      {/* Channel 2 / Right */}
      <div className="audio-meter-row">
        <span className="audio-ch-label">R</span>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${pctR}%` }} />
        </div>
        <span className="audio-scale-db">{dbR > -48 ? `${Math.round(dbR)} dB` : '-INF'}</span>
      </div>
    </div>
  );
}
