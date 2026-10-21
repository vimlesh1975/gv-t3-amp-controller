'use client';

import React, { useState } from 'react';
import { Film, Search, PlusCircle, PlaySquare, Check, RefreshCw } from 'lucide-react';

export default function ClipBin({
  clips = [],
  activeClip,
  activeChannel,
  onLoadClip,
  onStartNewRecording,
  onRefreshClips,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClips = clips.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.bin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="clip-bin-container" id="clip-bin-panel">
      {/* Search and Action Bar */}
      <div className="clip-bin-header-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            id="clip-search-input"
            className="clip-search-input"
            placeholder="Search Grass Valley clips or bins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          id="btn-refresh-clips"
          className="btn-secondary"
          onClick={onRefreshClips}
          title="Refresh Clip Directory from T3 (Grass Valley AMP: a2140000)"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RefreshCw size={12} />
          <span>Sync</span>
        </button>

        <button
          type="button"
          id="btn-start-new-rec"
          className="btn-new-rec"
          onClick={onStartNewRecording}
          title="Create New Clip and Start Recording on R1 (Grass Valley AMP: AE.02)"
        >
          <PlusCircle size={13} />
          <span>New Rec</span>
        </button>
      </div>

      {/* Clip List */}
      <div className="clip-list-scroll" id="clip-list-scroll">
        {filteredClips.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            No clips found matching "{searchTerm}"
          </div>
        ) : (
          filteredClips.map((clip) => {
            const isLoaded = activeClip?.id === clip.id;
            return (
              <div
                key={clip.id}
                id={`clip-card-${clip.id}`}
                className={`clip-card ${isLoaded ? 'active-loaded' : ''}`}
              >
                <div className="clip-meta-col">
                  <div className="clip-title-row">
                    <span className="clip-title" title={clip.name}>
                      {clip.name}
                    </span>
                    <span className="clip-format-badge">{clip.format}</span>
                    {isLoaded && (
                      <span style={{ fontSize: '10px', color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                        <Check size={11} /> Cued on {activeChannel}
                      </span>
                    )}
                  </div>

                  <div className="clip-submeta">
                    <span>Dur: {clip.duration}</span>
                    <span>Res: {clip.resolution}</span>
                    <span>Bin: {clip.bin}</span>
                  </div>
                </div>

                <div className="clip-actions-col">
                  <button
                    type="button"
                    id={`btn-load-clip-${clip.id}`}
                    className="btn-load-ch"
                    onClick={() => onLoadClip(clip)}
                    title={`Load "${clip.name}" to channel ${activeChannel}`}
                  >
                    Load to {activeChannel}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
