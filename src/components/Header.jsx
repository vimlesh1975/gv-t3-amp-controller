'use client';

import React from 'react';
import { Radio, Wifi, Server, Sliders, ShieldAlert } from 'lucide-react';

export default function Header({
  activeChannel,
  onSelectChannel,
  connectionState,
  mode,
  host,
  port,
  onOpenSettings,
}) {
  const isSim = mode === 'simulator';
  const isConnected = connectionState === 'connected';

  let statusClass = 'status-simulated';
  let statusText = 'VIRTUAL T3 SIMULATOR';

  if (!isSim) {
    if (isConnected) {
      statusClass = 'status-connected';
      statusText = `ONLINE: ${host}:${port}`;
    } else if (connectionState === 'connecting') {
      statusClass = 'status-simulated';
      statusText = 'CONNECTING...';
    } else {
      statusClass = 'status-error';
      statusText = 'OFFLINE';
    }
  }

  return (
    <header className="header-bar" id="app-header">
      {/* Brand & Identity */}
      <div className="header-brand">
        <div className="brand-logo-badge">
          <div className="gv-flag">GV</div>
          <span className="brand-title">GRASS VALLEY</span>
        </div>
        <div className="model-badge">T3 iDDR</div>
        <div className="amp-badge">AMP v3.4 TCP:3811</div>
      </div>

      {/* Multi-Channel Switcher (Grass Valley 3-Channel Architecture) */}
      <div className="channel-switcher" id="channel-switcher" role="tablist">
        <button
          type="button"
          id="tab-vtr1"
          role="tab"
          aria-selected={activeChannel === 'Vtr1'}
          className={`channel-tab ${activeChannel === 'Vtr1' ? 'active active-r1' : ''}`}
          onClick={() => onSelectChannel('Vtr1')}
        >
          <span className="channel-indicator-dot" />
          <span>CH 1: R1 (REC/PLAY)</span>
        </button>

        <button
          type="button"
          id="tab-vtr2"
          role="tab"
          aria-selected={activeChannel === 'Vtr2'}
          className={`channel-tab ${activeChannel === 'Vtr2' ? 'active active-p1' : ''}`}
          onClick={() => onSelectChannel('Vtr2')}
        >
          <span className="channel-indicator-dot" />
          <span>CH 2: P1 (PLAYOUT)</span>
        </button>

        <button
          type="button"
          id="tab-vtr3"
          role="tab"
          aria-selected={activeChannel === 'Vtr3'}
          className={`channel-tab ${activeChannel === 'Vtr3' ? 'active active-p2' : ''}`}
          onClick={() => onSelectChannel('Vtr3')}
        >
          <span className="channel-indicator-dot" />
          <span>CH 3: P2 (PLAYOUT)</span>
        </button>
      </div>

      {/* Connection Mode & Setup */}
      <div className="header-actions">
        <button
          type="button"
          id="btn-connection-status"
          className={`conn-pill ${statusClass}`}
          onClick={onOpenSettings}
          title="Click to configure Grass Valley AMP Hardware IP / Port"
        >
          <span className="status-pulse" />
          <span>{statusText}</span>
        </button>

        <button
          type="button"
          id="btn-open-settings"
          className="btn-secondary"
          onClick={onOpenSettings}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sliders size={13} />
          <span>Config</span>
        </button>
      </div>
    </header>
  );
}
