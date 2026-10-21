'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Circle, Square } from 'lucide-react';

export default function SingleChannelRecordPage() {
  const [deckState, setDeckState] = useState(null);

  // Poll or SSE Stream connection
  useEffect(() => {
    let eventSource = null;
    let pollInterval = null;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/amp/status');
        const data = await res.json();
        if (data.success) {
          setDeckState(data);
        }
      } catch (err) {}
    };

    fetchStatus();

    try {
      eventSource = new EventSource('/api/amp/stream');
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setDeckState(data);
        } catch (err) {}
      };
      eventSource.onerror = () => {
        eventSource.close();
        if (!pollInterval) {
          pollInterval = setInterval(fetchStatus, 300);
        }
      };
    } catch (err) {
      pollInterval = setInterval(fetchStatus, 300);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Send Command to Backend for Channel 1 (Vtr1 / R1)
  const toggleRecordCh1 = useCallback(async () => {
    const isCurrentlyRecording = deckState?.channels?.['Vtr1']?.transportStatus === 'RECORDING';
    const action = isCurrentlyRecording ? 'stop' : 'record';

    try {
      const res = await fetch('/api/amp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, channel: 'Vtr1' }),
      });
      const data = await res.json();
      if (data.state) {
        setDeckState(data.state);
      }
    } catch (err) {
      console.error('Command failed:', err);
    }
  }, [deckState]);

  // Keyboard shortcut: Space or R toggles Record
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggleRecordCh1();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecordCh1]);

  const ch1 = deckState?.channels?.['Vtr1'] || {};
  const isRecording = ch1.transportStatus === 'RECORDING';
  const timecode = ch1.timecode || '00:00:00:00';
  const host = deckState?.host || '192.168.145.20';
  const port = deckState?.port || 3811;
  const isConnected = deckState?.isConnected;

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#07090e',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}>
        {/* Simple Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: '#0d1019',
          padding: '10px 18px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '12px',
        }}>
          <span style={{ fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
            GRASS VALLEY T3 • CH 1 (R1)
          </span>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: isConnected ? '#4ade80' : '#f87171',
            fontFamily: 'monospace',
            fontWeight: 700,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: `0 0 8px ${isConnected ? '#22c55e' : '#ef4444'}`,
            }} />
            <span>{host}:{port}</span>
          </div>
        </div>

        {/* Live SMPTE Timecode Display */}
        <div style={{
          width: '100%',
          background: '#04060a',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: `2px solid ${isRecording ? '#ff3333' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isRecording ? '0 0 35px rgba(255, 51, 51, 0.4)' : 'inset 0 2px 10px rgba(0,0,0,0.8)',
          transition: 'all 0.2s ease',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            color: isRecording ? '#ff6666' : '#64748b',
            marginBottom: '4px',
          }}>
            {isRecording ? '● ON AIR RECORDING' : 'IDLE / READY'}
          </div>

          <div style={{
            fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
            fontSize: '44px',
            fontWeight: 700,
            color: isRecording ? '#ff3333' : '#ffaa00',
            letterSpacing: '3px',
            lineHeight: 1,
            userSelect: 'none',
          }}>
            {timecode}
          </div>

          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
            Clip: <strong style={{ color: '#fff' }}>{ch1.activeClip?.name || 'R1_ISO_001'}</strong>
          </div>
        </div>

        {/* 🔴 ONLY ONE BUTTON: CH1 RECORD 🔴 */}
        <button
          type="button"
          id="btn-ch1-record"
          onClick={toggleRecordCh1}
          style={{
            width: '100%',
            background: isRecording
              ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)'
              : 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)',
            border: `3px solid ${isRecording ? '#f87171' : '#ef4444'}`,
            borderRadius: '18px',
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: isRecording
              ? '0 0 50px rgba(239, 68, 68, 0.75), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
              : '0 15px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(220, 38, 38, 0.4)',
            transition: 'all 0.15s ease',
            userSelect: 'none',
          }}
        >
          {isRecording ? (
            <Square size={54} fill="#ffffff" />
          ) : (
            <Circle size={54} fill="#ffffff" />
          )}

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 900,
              letterSpacing: '2px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            }}>
              {isRecording ? 'STOP CH1' : 'RECORD CH1'}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.85, marginTop: '4px' }}>
              {isRecording ? 'Click to Stop Recording' : 'Click to Start Recording (Hotkey: Space / R)'}
            </div>
          </div>
        </button>
      </div>
    </main>
  );
}
