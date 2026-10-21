'use client';

import React from 'react';
import { framesToTimecode, timecodeToFrames } from '../lib/amp-protocol';

export default function TimecodeDisplay({ channelState }) {
  const tc = channelState?.timecode || '00:00:00:00';
  const fps = channelState?.fps || 29.97;
  const status = channelState?.transportStatus || 'STOPPED';
  const inPoint = channelState?.inPoint || '00:00:00:00';
  const outPoint = channelState?.outPoint || '00:00:00:00';

  const isRec = status === 'RECORDING';
  const isPlay = status === 'PLAYING';

  // Calculate remaining duration
  const currentFrames = channelState?.currentFrames || 0;
  const outFrames = timecodeToFrames(outPoint, fps);
  const remainingFrames = Math.max(0, outFrames - currentFrames);
  const remainingTc = framesToTimecode(remainingFrames, fps);

  // Duration
  const inFrames = timecodeToFrames(inPoint, fps);
  const durationFrames = Math.max(0, outFrames - inFrames);
  const durationTc = framesToTimecode(durationFrames, fps);

  let smpteClass = '';
  if (isRec) smpteClass = 'is-rec';
  else if (isPlay) smpteClass = 'is-play';

  return (
    <div className="timecode-cluster" id="smpte-timecode-cluster">
      {/* Primary SMPTE Display */}
      <div className="primary-tc-row">
        <div className="tc-label-stack">
          <span className="tc-source-tag">SMPTE LTC / VITC</span>
          <span className="tc-fps-indicator">{fps} FPS {channelState?.dropFrame ? 'DF' : 'NDF'}</span>
        </div>

        <div className={`smpte-large-display ${smpteClass}`} id="tc-current-readout">
          {tc}
        </div>
      </div>

      {/* Secondary Markers Strip */}
      <div className="secondary-tc-grid">
        <div className="secondary-tc-item">
          <span className="sec-label">Mark IN</span>
          <span className="sec-val" id="tc-in-point">{inPoint}</span>
        </div>

        <div className="secondary-tc-item">
          <span className="sec-label">Mark OUT</span>
          <span className="sec-val" id="tc-out-point">{outPoint}</span>
        </div>

        <div className="secondary-tc-item">
          <span className="sec-label">Duration</span>
          <span className="sec-val" id="tc-duration">{durationTc}</span>
        </div>

        <div className="secondary-tc-item">
          <span className="sec-label">Remaining</span>
          <span className="sec-val remain" id="tc-remaining">-{remainingTc}</span>
        </div>
      </div>
    </div>
  );
}
