'use client';

import React, { useState } from 'react';
import { X, Server, Info, ShieldCheck } from 'lucide-react';

export default function ConnectionModal({
  isOpen,
  onClose,
  currentMode,
  currentHost,
  currentPort,
  currentChannel,
  onSave,
}) {
  const [mode, setMode] = useState(currentMode || 'hardware');
  const [host, setHost] = useState(currentHost || '192.168.145.20');
  const [port, setPort] = useState(currentPort || 3811);
  const [channel, setChannel] = useState(currentChannel || 'Vtr1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave({ mode, host, port, channel });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" id="connection-modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} color="#00d4ff" />
            <span className="modal-title">Grass Valley T3 Deck Connection</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Mode Selection */}
            <div className="form-group">
              <label className="form-label">Deck Engine Mode</label>
              <select
                id="select-deck-mode"
                className="form-select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="simulator">Virtual T3 iDDR Simulator (Interactive Simulation)</option>
                <option value="hardware">Physical Grass Valley T3 Hardware (TCP/IP Port 3811)</option>
              </select>
            </div>

            {/* Hardware Fields */}
            {mode === 'hardware' && (
              <>
                <div className="form-group">
                  <label className="form-label">T3 Server IP Address</label>
                  <input
                    type="text"
                    id="input-host-ip"
                    className="form-input"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.100"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">AMP TCP Port</label>
                  <input
                    type="number"
                    id="input-port"
                    className="form-input"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="3811"
                    required
                  />
                </div>
              </>
            )}

            {/* Target AMP Channel */}
            <div className="form-group">
              <label className="form-label">Target AMP Channel (CRAT)</label>
              <select
                id="select-channel"
                className="form-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="Vtr1">Vtr1 - Channel 1: R1 (Record & Playout)</option>
                <option value="Vtr2">Vtr2 - Channel 2: P1 (Playout)</option>
                <option value="Vtr3">Vtr3 - Channel 3: P2 (Playout)</option>
              </select>
            </div>

            {/* Protocol Notice */}
            <div style={{
              background: 'rgba(0, 212, 255, 0.05)',
              border: '1px solid rgba(0, 212, 255, 0.15)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#94a3b8',
              lineHeight: 1.5,
              display: 'flex',
              gap: '8px',
            }}>
              <Info size={16} color="#00d4ff" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                Grass Valley AMP sends a <code>CRAT</code> handshake to bind the channel, followed by <code>CMDS</code> transport frames. Ensure "AMP Remote" is enabled in Grass Valley T3 Workstation Settings.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" id="btn-save-conn-config" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Connecting...' : mode === 'hardware' ? 'Connect to T3 Hardware' : 'Apply Simulator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
