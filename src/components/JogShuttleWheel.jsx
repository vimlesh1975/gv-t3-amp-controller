'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Target, CornerDownRight } from 'lucide-react';

export default function JogShuttleWheel({ channelState, onCommand }) {
  const [jogAngle, setJogAngle] = useState(0);
  const [shuttleRate, setShuttleRate] = useState(0);
  const [springReturn, setSpringReturn] = useState(true);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);

  // Sync shuttle rate from channelState if playing or stopped
  useEffect(() => {
    if (channelState?.transportStatus === 'STOPPED') {
      setShuttleRate(0);
    } else if (channelState?.transportStatus === 'PLAYING') {
      setShuttleRate(1);
    }
  }, [channelState?.transportStatus]);

  // Handle Rotary Jog Wheel Drag
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    if (Math.abs(deltaY) > 8) {
      const frames = deltaY > 0 ? 1 : -1;
      setJogAngle((prev) => prev + frames * 20);
      onCommand('jog', { frames });
      startYRef.current = e.clientY;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle Mouse Wheel on Jog Disc
  const handleWheel = (e) => {
    e.preventDefault();
    const frames = e.deltaY < 0 ? 1 : -1;
    setJogAngle((prev) => prev + frames * 15);
    onCommand('jog', { frames });
  };

  // Handle Shuttle Slider change
  const handleShuttleChange = (e) => {
    const val = parseFloat(e.target.value);
    setShuttleRate(val);
    if (val === 0) {
      onCommand('stop');
    } else {
      onCommand('shuttle', { rate: val });
    }
  };

  const handleShuttleRelease = () => {
    if (springReturn) {
      setShuttleRate(0);
      onCommand('stop');
    }
  };

  return (
    <div className="jog-shuttle-cluster" id="jog-shuttle-cluster">
      {/* Rotary Jog Wheel */}
      <div className="jog-wheel-container">
        <div
          id="jog-wheel-disc"
          className="jog-wheel-disc"
          style={{ transform: `rotate(${jogAngle}deg)` }}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          title="Jog Wheel: Drag or Scroll to step frames"
        >
          <div className="jog-finger-indent" />
        </div>

        <div className="jog-controls-micro">
          <button
            type="button"
            id="btn-jog-prev-frame"
            className="btn-micro-jog"
            onClick={() => {
              setJogAngle((a) => a - 20);
              onCommand('jog', { frames: -1 });
            }}
            title="Step -1 Frame (Grass Valley AMP: 21.21)"
          >
            -1 Frm
          </button>
          <button
            type="button"
            id="btn-jog-next-frame"
            className="btn-micro-jog"
            onClick={() => {
              setJogAngle((a) => a + 20);
              onCommand('jog', { frames: 1 });
            }}
            title="Step +1 Frame (Grass Valley AMP: 21.11)"
          >
            +1 Frm
          </button>
        </div>
      </div>

      {/* Shuttle Slider */}
      <div className="shuttle-slider-section">
        <div className="shuttle-header-row">
          <span className="shuttle-label">Variable Shuttle Speed</span>
          <span className="shuttle-rate-badge" id="shuttle-rate-badge">
            {shuttleRate === 0 ? 'STILL (0x)' : `${shuttleRate > 0 ? '+' : ''}${shuttleRate}x`}
          </span>
        </div>

        <div className="shuttle-track-container">
          <input
            type="range"
            id="shuttle-range-slider"
            className="shuttle-range-input"
            min="-16"
            max="16"
            step="1"
            value={shuttleRate}
            onChange={handleShuttleChange}
            onMouseUp={handleShuttleRelease}
            onTouchEnd={handleShuttleRelease}
          />

          <div className="shuttle-tick-labels">
            <span>-16x</span>
            <span>-4x</span>
            <span>-1x</span>
            <span>0</span>
            <span>+1x</span>
            <span>+4x</span>
            <span>+16x</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <label style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={springReturn}
              onChange={(e) => setSpringReturn(e.target.checked)}
            />
            Auto-center spring
          </label>
        </div>
      </div>

      {/* Quick Cue / Mark Points shortcuts */}
      <div className="cue-points-box">
        <div className="cue-btn-grid">
          <button
            type="button"
            id="btn-mark-in"
            className="btn-cue in"
            onClick={() => onCommand('set_mark_in')}
            title="Mark Current Timecode as IN Point (HotKey: I)"
          >
            MARK IN
          </button>
          <button
            type="button"
            id="btn-mark-out"
            className="btn-cue out"
            onClick={() => onCommand('set_mark_out')}
            title="Mark Current Timecode as OUT Point (HotKey: O)"
          >
            MARK OUT
          </button>
          <button
            type="button"
            id="btn-goto-in"
            className="btn-cue"
            onClick={() => onCommand('goto_in')}
            title="Cue Playout to IN Point"
          >
            GOTO IN
          </button>
          <button
            type="button"
            id="btn-goto-out"
            className="btn-cue"
            onClick={() => onCommand('goto_out')}
            title="Cue Playout to OUT Point"
          >
            GOTO OUT
          </button>
        </div>

        <button
          type="button"
          id="btn-cue-tc"
          className="btn-cue"
          style={{ width: '100%' }}
          onClick={() => {
            const tc = prompt('Enter SMPTE Timecode to cue (HH:MM:SS:FF):', channelState?.timecode || '00:00:00:00');
            if (tc) onCommand('cue_timecode', { timecode: tc });
          }}
          title="Cue to specific timecode (Grass Valley AMP: 24.31)"
        >
          CUE TC...
        </button>
      </div>
    </div>
  );
}
