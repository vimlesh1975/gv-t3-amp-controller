'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Circle,
  Square,
  Play,
  Server,
  Wifi,
  Activity,
  ArrowLeft,
  RefreshCw,
  Send,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function SimpleTestPage() {
  const [deckState, setDeckState] = useState(null);
  const [host, setHost] = useState('192.168.145.20');
  const [port, setPort] = useState(3811);
  const [channel, setChannel] = useState('Vtr1');
  const [mode, setMode] = useState('hardware');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState(null);
  const [customHex, setCustomHex] = useState('');

  // Fetch status and connect SSE stream
  useEffect(() => {
    let eventSource = null;
    let pollInterval = null;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/amp/status');
        const data = await res.json();
        if (data.success) {
          setDeckState(data);
          if (data.host) setHost(data.host);
          if (data.port) setPort(data.port);
          if (data.mode) setMode(data.mode);
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
          pollInterval = setInterval(fetchStatus, 400);
        }
      };
    } catch (err) {
      pollInterval = setInterval(fetchStatus, 400);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Send Command
  const sendCommand = useCallback(async (action, params = {}, targetChannel = null) => {
    try {
      const res = await fetch('/api/amp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params, channel: targetChannel }),
      });
      const data = await res.json();
      if (data.state) {
        setDeckState(data.state);
      }
    } catch (err) {
      console.error('Command error:', err);
    }
  }, []);

  // Connect to T3 Socket
  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    setIsConnecting(true);
    setConnectResult(null);

    try {
      const res = await fetch('/api/amp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          host,
          port: parseInt(port, 10),
          channel,
        }),
      });
      const data = await res.json();
      setDeckState(data);

      if (data.success && data.isConnected) {
        setConnectResult({ type: 'success', msg: `Connected to Grass Valley T3 at ${host}:${port} on channel ${channel}` });
      } else if (data.mode === 'simulator') {
        setConnectResult({ type: 'info', msg: 'Running in Virtual T3 Simulator Mode' });
      } else {
        setConnectResult({
          type: 'error',
          msg: data.error || (data.lastError ? `Socket error: ${data.lastError}` : 'Connection rejected (ECONNRESET). Check that AMP Remote is ON in T3 Settings.'),
        });
      }
    } catch (err) {
      setConnectResult({ type: 'error', msg: `Network failure: ${err.message}` });
    } finally {
      setIsConnecting(false);
    }
  };

  const isConnected = deckState?.isConnected;
  const channels = deckState?.channels || {};
  const ch1 = channels['Vtr1'] || {};
  const ch2 = channels['Vtr2'] || {};
  const ch3 = channels['Vtr3'] || {};

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '20px 24px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#10141f',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00d4ff, #0055ff)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
          }}>
            GV
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
              Grass Valley T3 iDDR • Quick Test Bench
            </h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
              AMP Protocol Socket Testing for IP {host}:{port}
            </p>
          </div>
        </div>

        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#1a2233',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#e2e8f0',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>Full Broadcast Deck Console</span>
        </Link>
      </div>

      {/* MASTER ACTION BUTTONS (ONLY TWO BUTTONS: RECORD ALL & STOP ALL) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
      }}>
        {/* RECORD ALL */}
        <button
          type="button"
          id="btn-master-record-all"
          onClick={() => sendCommand('record_all')}
          style={{
            background: 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)',
            border: '3px solid #ef4444',
            boxShadow: '0 0 35px rgba(239, 68, 68, 0.45)',
            borderRadius: '14px',
            padding: '36px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            userSelect: 'none',
          }}
        >
          <Circle size={48} fill="#fff" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '1px' }}>
              RECORD ALL
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 600 }}>
              Trigger recording on all 3 Recorders (R1, R2, R3)
            </div>
          </div>
        </button>

        {/* STOP ALL */}
        <button
          type="button"
          id="btn-master-stop-all"
          onClick={() => sendCommand('stop_all')}
          style={{
            background: 'linear-gradient(180deg, #d97706 0%, #78350f 100%)',
            border: '3px solid #f59e0b',
            boxShadow: '0 0 35px rgba(245, 158, 11, 0.4)',
            borderRadius: '14px',
            padding: '36px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            userSelect: 'none',
          }}
        >
          <Square size={44} fill="#fff" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '1px' }}>
              STOP ALL
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 600 }}>
              Immediate halt across all 3 Recorders
            </div>
          </div>
        </button>
      </div>

      {/* SOCKET CONNECTION & HARDWARE CONFIG */}
      <div style={{
        background: '#0d111a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} color="#00d4ff" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              T3 iDDR Hardware Connection (TCP:3811)
            </span>
          </div>

          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
            background: isConnected ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 68, 68, 0.15)',
            color: isConnected ? '#4ade80' : '#f87171',
            border: `1px solid ${isConnected ? '#22c55e' : '#ef4444'}`,
          }}>
            {isConnected ? `CONNECTED: ${host}:${port}` : 'SOCKET DISCONNECTED / RECONNECTING'}
          </div>
        </div>

        <form onSubmit={handleConnect} style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 120px 160px 140px auto',
          gap: '10px',
          alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
              IP ADDRESS
            </label>
            <input
              type="text"
              id="test-input-ip"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              style={{
                width: '100%',
                background: '#06080e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
              PORT
            </label>
            <input
              type="number"
              id="test-input-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              style={{
                width: '100%',
                background: '#06080e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
              AMP CHANNEL (CRAT)
            </label>
            <select
              id="test-select-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              style={{
                width: '100%',
                background: '#06080e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <option value="Vtr1">Vtr1 (R1 Default)</option>
              <option value="vtr1">vtr1 (lowercase)</option>
              <option value="R1">R1 (Channel 1)</option>
              <option value="P1">P1 (Channel 2)</option>
              <option value="P2">P2 (Channel 3)</option>
              <option value="Channel 1">Channel 1</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
              MODE
            </label>
            <select
              id="test-select-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                width: '100%',
                background: '#06080e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <option value="hardware">Hardware (Real T3)</option>
              <option value="simulator">Virtual Simulator</option>
            </select>
          </div>

          <button
            type="submit"
            id="btn-test-connect"
            disabled={isConnecting}
            style={{
              background: '#0284c7',
              border: 'none',
              borderRadius: '6px',
              padding: '9px 16px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect Socket'}
          </button>
        </form>

        {connectResult && (
          <div style={{
            fontSize: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: connectResult.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: connectResult.type === 'success' ? '#86efac' : '#fca5a5',
            border: `1px solid ${connectResult.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}>
            {connectResult.msg}
          </div>
        )}
      </div>

      {/* 3 CHANNELS INDIVIDUAL TILES */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '14px',
      }}>
        {/* Channel 1: R1 */}
        <div style={{
          background: '#0e121c',
          border: '1px solid rgba(255, 42, 42, 0.3)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>CH 1: R1 (REC)</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              background: ch1.transportStatus === 'RECORDING' ? '#dc2626' : '#1e293b',
              color: '#fff',
            }}>
              {ch1.transportStatus || 'STOPPED'}
            </span>
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: '24px',
            fontWeight: 700,
            color: ch1.transportStatus === 'RECORDING' ? '#ff3333' : '#ffaa00',
            textAlign: 'center',
            background: '#05070c',
            padding: '8px',
            borderRadius: '6px',
          }}>
            {ch1.timecode || '00:00:00:00'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => sendCommand('record', {}, 'Vtr1')}
              style={{
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              REC
            </button>
            <button
              type="button"
              onClick={() => sendCommand('stop', {}, 'Vtr1')}
              style={{
                background: '#d97706',
                border: 'none',
                color: '#fff',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              STOP
            </button>
          </div>
        </div>

        {/* Channel 2: P1 */}
        <div style={{
          background: '#0e121c',
          border: '1px solid rgba(0, 230, 118, 0.3)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#4ade80' }}>CH 2: P1 (PLAY)</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              background: ch2.transportStatus === 'PLAYING' ? '#16a34a' : '#1e293b',
              color: '#fff',
            }}>
              {ch2.transportStatus || 'STOPPED'}
            </span>
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: '24px',
            fontWeight: 700,
            color: ch2.transportStatus === 'PLAYING' ? '#00ff66' : '#ffaa00',
            textAlign: 'center',
            background: '#05070c',
            padding: '8px',
            borderRadius: '6px',
          }}>
            {ch2.timecode || '00:00:00:00'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => sendCommand('play', {}, 'Vtr2')}
              style={{
                background: '#16a34a',
                border: 'none',
                color: '#fff',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              PLAY
            </button>
            <button
              type="button"
              onClick={() => sendCommand('stop', {}, 'Vtr2')}
              style={{
                background: '#d97706',
                border: 'none',
                color: '#fff',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              STOP
            </button>
          </div>
        </div>

        {/* Channel 3: P2 */}
        <div style={{
          background: '#0e121c',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>CH 3: P2 (PLAY)</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              background: ch3.transportStatus === 'PLAYING' ? '#0284c7' : '#1e293b',
              color: '#fff',
            }}>
              {ch3.transportStatus || 'STOPPED'}
            </span>
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: '24px',
            fontWeight: 700,
            color: ch3.transportStatus === 'PLAYING' ? '#00ffff' : '#ffaa00',
            textAlign: 'center',
            background: '#05070c',
            padding: '8px',
            borderRadius: '6px',
          }}>
            {ch3.timecode || '00:00:00:00'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => sendCommand('play', {}, 'Vtr3')}
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#fff',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              PLAY
            </button>
            <button
              type="button"
              onClick={() => sendCommand('stop', {}, 'Vtr3')}
              style={{
                background: '#d97706',
                border: 'none',
                color: '#fff',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              STOP
            </button>
          </div>
        </div>
      </div>

      {/* RAW AMP PACKET LOG TERMINAL */}
      <div style={{
        background: '#080a10',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
            LIVE AMP PROTOCOL STREAM (TX / RX PACKETS)
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            T3 Server: {host}:{port}
          </span>
        </div>

        <div style={{
          background: '#040508',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '6px',
          padding: '10px 12px',
          height: '180px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {deckState?.recentLogs?.map((log) => (
            <div key={log.id} style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#475569' }}>{log.time}</span>
              <span style={{
                color: log.direction === 'TX' ? '#60a5fa' : log.direction === 'RX' ? '#4ade80' : '#fbbf24',
                fontWeight: 700,
              }}>
                [{log.direction}]
              </span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{log.hex}</span>
              <span style={{ color: '#94a3b8' }}>— {log.parsed}</span>
            </div>
          ))}
        </div>

        {/* Custom Hex Sender */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Send custom hex (e.g., 2002 for Rec, 2000 for Stop, 612002 for Status)..."
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            style={{
              flex: 1,
              background: '#06080e',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (customHex.trim()) {
                sendCommand('send_raw', { rawHex: customHex.trim() });
                setCustomHex('');
              }
            }}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '6px 14px',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Send Hex
          </button>
        </div>
      </div>
    </div>
  );
}
