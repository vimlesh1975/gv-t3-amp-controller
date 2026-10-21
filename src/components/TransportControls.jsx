'use client';

import React, { useEffect } from 'react';
import {
  Play,
  Square,
  Circle,
  Pause,
  FastForward,
  Rewind,
  Repeat,
  Eject,
} from 'lucide-react';

export default function TransportControls({ channelState, onCommand }) {
  const status = channelState?.transportStatus || 'STOPPED';
  const isPlaying = status === 'PLAYING';
  const isRecording = status === 'RECORDING';
  const isStopped = status === 'STOPPED';
  const isPaused = status === 'STILL';
  const isLoop = Boolean(channelState?.loop);
  const isFF = status === 'FF' || status === 'SHUTTLE';
  const isRW = status === 'RW';

  // Keyboard shortcut listener for broadcast workflows (J-K-L, Space, I, O)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture when typing in text fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (isPlaying) onCommand('stop');
          else onCommand('play');
          break;
        case 'k':
          e.preventDefault();
          onCommand('stop');
          break;
        case 'j':
          e.preventDefault();
          onCommand('shuttle', { rate: -2.0 });
          break;
        case 'l':
          e.preventDefault();
          onCommand('shuttle', { rate: 2.0 });
          break;
        case 'i':
          e.preventDefault();
          onCommand('set_mark_in');
          break;
        case 'o':
          e.preventDefault();
          onCommand('set_mark_out');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onCommand]);

  return (
    <div className="transport-deck" id="transport-controls-deck">
      <div className="transport-buttons-row">
        {/* RECORD Button */}
        <button
          type="button"
          id="btn-transport-rec"
          className={`btn-transport is-rec ${isRecording ? 'active' : ''}`}
          onClick={() => onCommand('record')}
          title="Start Recording (Grass Valley AMP: 20.02)"
        >
          <Circle size={18} fill={isRecording ? '#fff' : 'currentColor'} />
          <span>REC</span>
        </button>

        {/* REWIND Button */}
        <button
          type="button"
          id="btn-transport-rew"
          className={`btn-transport ${isRW ? 'active' : ''}`}
          onClick={() => onCommand('shuttle', { rate: -4.0 })}
          title="Shuttle Reverse 4x (HotKey: J)"
        >
          <Rewind size={18} />
          <span>REW</span>
        </button>

        {/* STOP Button */}
        <button
          type="button"
          id="btn-transport-stop"
          className={`btn-transport is-stop ${isStopped ? 'active' : ''}`}
          onClick={() => onCommand('stop')}
          title="Stop Playout / Record (Grass Valley AMP: 20.00 | HotKey: K)"
        >
          <Square size={17} fill={isStopped ? '#ffb300' : 'currentColor'} />
          <span>STOP</span>
        </button>

        {/* PLAY Button */}
        <button
          type="button"
          id="btn-transport-play"
          className={`btn-transport is-play ${isPlaying ? 'active' : ''}`}
          onClick={() => onCommand('play')}
          title="Start Playout (Grass Valley AMP: 20.01 | HotKey: Space)"
        >
          <Play size={18} fill={isPlaying ? '#fff' : 'currentColor'} />
          <span>PLAY</span>
        </button>

        {/* STILL / PAUSE Button */}
        <button
          type="button"
          id="btn-transport-pause"
          className={`btn-transport is-pause ${isPaused ? 'active' : ''}`}
          onClick={() => onCommand('pause')}
          title="Pause on Still Frame (Grass Valley AMP Still)"
        >
          <Pause size={18} />
          <span>STILL</span>
        </button>

        {/* FAST FORWARD Button */}
        <button
          type="button"
          id="btn-transport-ff"
          className={`btn-transport ${isFF ? 'active' : ''}`}
          onClick={() => onCommand('shuttle', { rate: 4.0 })}
          title="Shuttle Forward 4x (HotKey: L)"
        >
          <FastForward size={18} />
          <span>FF</span>
        </button>

        {/* LOOP TOGGLE Button */}
        <button
          type="button"
          id="btn-transport-loop"
          className={`btn-transport is-loop ${isLoop ? 'active' : ''}`}
          onClick={() => onCommand('set_loop', { enabled: !isLoop })}
          title="Toggle Continuous Loop Playout (Grass Valley AMP: 41.42)"
        >
          <Repeat size={18} />
          <span>LOOP</span>
        </button>
      </div>
    </div>
  );
}
