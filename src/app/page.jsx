'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Circle, Square, Server, Activity, ShieldCheck } from 'lucide-react';

export default function GrassValley3RecorderController() {
  const [deckState, setDeckState] = useState(null);
  const [lastAction, setLastAction] = useState(null);

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

  // Send Command to Backend
  const handleCommand = useCallback(async (action) => {
    setLastAction(action === 'record_all' ? 'RECORDING ALL CHANNELS' : 'STOPPED ALL CHANNELS');
    try {
      const res = await fetch('/api/amp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.state) {
        setDeckState(data.state);
      }
    } catch (err) {
      console.error('Command failed:', err);
    }
  }, []);

  const handleConnectRetry = useCallback(async () => {
    try {
      await fetch('/api/amp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'hardware', host: '192.168.145.20', port: 3811, channel: 'Vtr1' }),
      });
    } catch (e) {}
  }, []);

  // Keyboard shortcuts: Space / K = STOP ALL, Shift+R / R = RECORD ALL
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleCommand('stop_all');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleCommand('record_all');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCommand]);

  const channels = deckState?.channels || {};
  const r1 = channels['Vtr1'] || {};
  const r2 = channels['Vtr2'] || {};
  const r3 = channels['Vtr3'] || {};

  const isAnyRecording =
    r1.transportStatus === 'RECORDING' ||
    r2.transportStatus === 'RECORDING' ||
    r3.transportStatus === 'RECORDING';

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
        maxWidth: '1020px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Top Status Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #131722 0%, #0c0f17 100%)',
          padding: '14px 22px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #00d4ff, #0055ff)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '12px',
              padding: '4px 9px',
              borderRadius: '4px',
            }}>
              GV
            </div>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', color: '#fff', margin: 0 }}>
                GRASS VALLEY T3 iDDR • 3-CHANNEL RECORDER
              </h1>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>
                AMP OVER TCP PORT 3811
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${isConnected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 68, 68, 0.4)'}`,
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              color: isConnected ? '#4ade80' : '#f87171',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                boxShadow: `0 0 10px ${isConnected ? '#22c55e' : '#ef4444'}`,
              }} />
              <span>{isConnected ? `CONNECTED: ${host}:${port}` : `DISCONNECTED: ${host}:${port}`}</span>
            </div>

            <button
              type="button"
              onClick={handleConnectRetry}
              style={{
                background: '#1a2233',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </header>

        {/* Action Needed Banner when disconnected */}
        {!isConnected && (
          <div style={{
            background: 'rgba(255, 179, 0, 0.08)',
            border: '1px solid rgba(255, 179, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#fef08a',
            gap: '12px',
          }}>
            <div>
              ⚠️ <strong>Action Needed on T3 Unit:</strong> The T3 is connected on port 3811, but the channel is in <strong>Local</strong> mode.
              On your T3 screen, click the <strong>[ Local / Remote ]</strong> button on each recorder channel so it switches to <strong>[ Remote ]</strong>.
            </div>
            <button
              type="button"
              onClick={handleConnectRetry}
              style={{
                background: '#f59e0b',
                border: 'none',
                borderRadius: '5px',
                color: '#000',
                fontWeight: 800,
                padding: '6px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '11px',
              }}
            >
              Connect Now
            </button>
          </div>
        )}

        {/* 🔴 ONLY TWO BUTTONS: RECORD ALL & STOP ALL ⏹️ */}
        <section aria-label="Master Transport" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
        }}>
          {/* RECORD ALL BUTTON */}
          <button
            type="button"
            id="btn-record-all"
            onClick={() => handleCommand('record_all')}
            style={{
              background: isAnyRecording
                ? 'linear-gradient(180deg, #b91c1c 0%, #450a0a 100%)'
                : 'linear-gradient(180deg, #ef4444 0%, #991b1b 100%)',
              border: '3px solid #ff4d4d',
              borderRadius: '16px',
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: isAnyRecording
                ? '0 0 45px rgba(255, 77, 77, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
                : '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.35)',
              transform: isAnyRecording ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
          >
            <Circle
              size={54}
              fill="#ffffff"
              style={{
                filter: isAnyRecording ? 'drop-shadow(0 0 12px #fff)' : 'none',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '2px',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}>
                RECORD ALL
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9, marginTop: '4px' }}>
                Start Recording on R1, R2, R3 (Hotkey: R)
              </div>
            </div>
          </button>

          {/* STOP ALL BUTTON */}
          <button
            type="button"
            id="btn-stop-all"
            onClick={() => handleCommand('stop_all')}
            style={{
              background: !isAnyRecording
                ? 'linear-gradient(180deg, #d97706 0%, #78350f 100%)'
                : 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
              border: '3px solid #fbbf24',
              borderRadius: '16px',
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: !isAnyRecording
                ? '0 0 40px rgba(245, 158, 11, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
                : '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 18px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
          >
            <Square size={50} fill="#ffffff" />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '2px',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}>
                STOP ALL
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9, marginTop: '4px' }}>
                Halt All 3 Channels (Hotkey: Space or K)
              </div>
            </div>
          </button>
        </section>

        {/* 3 RECORDER STATUS TILES (R1, R2, R3) */}
        <section aria-label="3 Recorder Channels" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          {/* RECORDER 1 */}
          <div style={{
            background: '#0d1019',
            borderRadius: '10px',
            border: `2px solid ${r1.transportStatus === 'RECORDING' ? '#ff3333' : 'rgba(255, 255, 255, 0.1)'}`,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: r1.transportStatus === 'RECORDING' ? '0 0 24px rgba(255, 51, 51, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#f87171' }}>RECORDER 1 (R1)</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                background: r1.transportStatus === 'RECORDING' ? '#dc2626' : '#1e293b',
                color: '#fff',
                letterSpacing: '0.5px',
              }}>
                {r1.transportStatus || 'STOPPED'}
              </span>
            </div>

            <div style={{
              background: '#05070d',
              borderRadius: '6px',
              padding: '12px 10px',
              textAlign: 'center',
              fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
              fontSize: '26px',
              fontWeight: 700,
              color: r1.transportStatus === 'RECORDING' ? '#ff3333' : '#ffaa00',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              letterSpacing: '2px',
            }}>
              {r1.timecode || '00:00:00:00'}
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Clip: <strong style={{ color: '#fff' }}>{r1.activeClip?.name || 'IDLE'}</strong></span>
              <span>1080/59.94i</span>
            </div>
          </div>

          {/* RECORDER 2 */}
          <div style={{
            background: '#0d1019',
            borderRadius: '10px',
            border: `2px solid ${r2.transportStatus === 'RECORDING' ? '#ff3333' : 'rgba(255, 255, 255, 0.1)'}`,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: r2.transportStatus === 'RECORDING' ? '0 0 24px rgba(255, 51, 51, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#f87171' }}>RECORDER 2 (R2)</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                background: r2.transportStatus === 'RECORDING' ? '#dc2626' : '#1e293b',
                color: '#fff',
                letterSpacing: '0.5px',
              }}>
                {r2.transportStatus || 'STOPPED'}
              </span>
            </div>

            <div style={{
              background: '#05070d',
              borderRadius: '6px',
              padding: '12px 10px',
              textAlign: 'center',
              fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
              fontSize: '26px',
              fontWeight: 700,
              color: r2.transportStatus === 'RECORDING' ? '#ff3333' : '#ffaa00',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              letterSpacing: '2px',
            }}>
              {r2.timecode || '00:00:00:00'}
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Clip: <strong style={{ color: '#fff' }}>{r2.activeClip?.name || 'IDLE'}</strong></span>
              <span>1080/59.94i</span>
            </div>
          </div>

          {/* RECORDER 3 */}
          <div style={{
            background: '#0d1019',
            borderRadius: '10px',
            border: `2px solid ${r3.transportStatus === 'RECORDING' ? '#ff3333' : 'rgba(255, 255, 255, 0.1)'}`,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: r3.transportStatus === 'RECORDING' ? '0 0 24px rgba(255, 51, 51, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#f87171' }}>RECORDER 3 (R3)</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                background: r3.transportStatus === 'RECORDING' ? '#dc2626' : '#1e293b',
                color: '#fff',
                letterSpacing: '0.5px',
              }}>
                {r3.transportStatus || 'STOPPED'}
              </span>
            </div>

            <div style={{
              background: '#05070d',
              borderRadius: '6px',
              padding: '12px 10px',
              textAlign: 'center',
              fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
              fontSize: '26px',
              fontWeight: 700,
              color: r3.transportStatus === 'RECORDING' ? '#ff3333' : '#ffaa00',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              letterSpacing: '2px',
            }}>
              {r3.timecode || '00:00:00:00'}
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Clip: <strong style={{ color: '#fff' }}>{r3.activeClip?.name || 'IDLE'}</strong></span>
              <span>1080/59.94i</span>
            </div>
          </div>
        </section>

        {/* Live AMP Telemetry Status Bar */}
        <footer style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#090c14',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '11px',
          color: '#64748b',
          fontFamily: 'monospace',
        }}>
          <div>
            LATEST ACTION: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{lastAction || 'READY'}</span>
          </div>
          <div>
            RECENT AMP LOG: <span style={{ color: '#e2e8f0' }}>{deckState?.recentLogs?.[0]?.hex || 'CMDS00042000'}</span> ({deckState?.recentLogs?.[0]?.parsed || 'STOP'})
          </div>
        </footer>
      </div>
    </main>
  );
}
