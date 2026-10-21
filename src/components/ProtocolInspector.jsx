'use client';

import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ProtocolInspector({ logs = [], onSendRaw }) {
  const [rawInput, setRawInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    onSendRaw(rawInput.trim());
    setRawInput('');
  };

  const handleQuickCmd = (cmd) => {
    onSendRaw(cmd);
  };

  return (
    <div className="protocol-inspector-container" id="amp-protocol-inspector">
      {/* Live Terminal Log Stream */}
      <div className="logs-terminal" id="terminal-logs-scroll">
        {logs.map((log) => (
          <div key={log.id} className="log-line">
            <span className="log-time">{log.time}</span>
            <span className={`log-dir ${log.direction}`}>{log.direction}</span>
            <span className="log-hex">{log.hex}</span>
            <span className="log-desc">— {log.parsed}</span>
          </div>
        ))}
      </div>

      {/* Raw Command Sender */}
      <form onSubmit={handleSend} className="raw-cmd-bar">
        <input
          type="text"
          id="raw-hex-input"
          className="raw-hex-input"
          placeholder="Enter AMP Hex Command (e.g., 2001 for Play, 2000 for Stop)..."
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
        />
        <button type="submit" id="btn-send-raw-hex" className="btn-send-raw">
          Send Hex
        </button>
      </form>

      {/* Quick Command Macros */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>MACROS:</span>
        <button
          type="button"
          className="btn-micro-jog"
          onClick={() => handleQuickCmd('2001')}
          title="Send AMP 20.01 (Play)"
        >
          2001 (Play)
        </button>
        <button
          type="button"
          className="btn-micro-jog"
          onClick={() => handleQuickCmd('2000')}
          title="Send AMP 20.00 (Stop)"
        >
          2000 (Stop)
        </button>
        <button
          type="button"
          className="btn-micro-jog"
          onClick={() => handleQuickCmd('612002')}
          title="Send AMP 61.20 (Transport Sense)"
        >
          612002 (Sense)
        </button>
        <button
          type="button"
          className="btn-micro-jog"
          onClick={() => handleQuickCmd('610c01')}
          title="Send AMP 61.0C (Timecode Sense)"
        >
          610C01 (TC Sense)
        </button>
        <button
          type="button"
          className="btn-micro-jog"
          onClick={() => handleQuickCmd('a2140000')}
          title="Send AMP A2.14 (List First ID)"
        >
          A214 (List)
        </button>
      </div>
    </div>
  );
}
