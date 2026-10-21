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
        if (data && data.channels) {
          setDeckState(data);
        }
      } catch (err) {}
    };

    const initConnection = async () => {
      try {
        const res = await fetch('/api/amp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'hardware', host: '192.168.145.20', port: 3811, channel: 'Vtr1' }),
        });
        const data = await res.json();
        if (data && data.channels) setDeckState(data);
      } catch (err) {}
    };

    initConnection();
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
  const sendCommand = useCallback(async (action) => {
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
  }, []);

  const startRecordCh1 = useCallback(() => {
    sendCommand('record');
  }, [sendCommand]);

  const stopRecordCh1 = useCallback(() => {
    sendCommand('stop');
  }, [sendCommand]);

  // Keyboard shortcuts: R for record, S / Escape for stop, Space to toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === 'r') {
        e.preventDefault();
        startRecordCh1();
      } else if (key === 's' || e.key === 'Escape') {
        e.preventDefault();
        stopRecordCh1();
      } else if (e.key === ' ') {
        e.preventDefault();
        const isRec = deckState?.channels?.['Vtr1']?.transportStatus === 'RECORDING';
        if (isRec) stopRecordCh1();
        else startRecordCh1();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deckState, startRecordCh1, stopRecordCh1]);

  const ch1 = deckState?.channels?.['Vtr1'] || {};
  const isRecording = ch1.transportStatus === 'RECORDING' || ch1.tally?.recording === true;
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
          border: `2px solid ${isRecording ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isRecording ? '0 0 35px rgba(239, 68, 68, 0.4)' : 'inset 0 2px 10px rgba(0,0,0,0.8)',
          transition: 'all 0.2s ease',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            color: isRecording ? '#f87171' : '#64748b',
            marginBottom: '4px',
          }}>
            {isRecording ? '● ON AIR RECORDING' : 'IDLE / READY'}
          </div>

          <div style={{
            fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
            fontSize: '44px',
            fontWeight: 700,
            color: isRecording ? '#ef4444' : '#ffaa00',
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

        {/* 🔴 ACTION BUTTONS: RECORD & STOP RECORD ⏹ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          width: '100%',
        }}>
          {/* RECORD BUTTON */}
          <button
            type="button"
            id="btn-ch1-record"
            onClick={startRecordCh1}
            style={{
              background: isRecording
                ? 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)'
                : 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
              border: `2px solid ${isRecording ? '#fca5a5' : '#ef4444'}`,
              borderRadius: '16px',
              padding: '36px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: isRecording
                ? '0 0 35px rgba(239, 68, 68, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.5)'
                : '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              transform: isRecording ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <Circle size={44} fill="#ffffff" />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
              }}>
                RECORD CH1
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9, marginTop: '4px' }}>
                {isRecording ? '● RECORDING ACTIVE' : 'Click to Record (Hotkey: R)'}
              </div>
            </div>
          </button>

          {/* STOP RECORD BUTTON */}
          <button
            type="button"
            id="btn-ch1-stop"
            onClick={stopRecordCh1}
            style={{
              background: isRecording
                ? 'linear-gradient(180deg, #475569 0%, #1e293b 100%)'
                : 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              border: `2px solid ${isRecording ? '#f87171' : 'rgba(255, 255, 255, 0.12)'}`,
              borderRadius: '16px',
              padding: '36px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: isRecording ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              boxShadow: isRecording
                ? '0 0 25px rgba(248, 113, 113, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                : '0 10px 25px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
          >
            <Square size={44} fill={isRecording ? '#ffffff' : '#94a3b8'} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
              }}>
                STOP RECORD
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9, marginTop: '4px' }}>
                {isRecording ? 'Click to Stop (Hotkey: S)' : 'Channel Idle (Hotkey: S)'}
              </div>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
