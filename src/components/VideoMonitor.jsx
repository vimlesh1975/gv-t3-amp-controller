'use client';

import React, { useEffect, useRef } from 'react';
import { Film, Disc3, CircleAlert, Tv } from 'lucide-react';

export default function VideoMonitor({ channelState }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const frameOffsetRef = useRef(0);

  const status = channelState?.transportStatus || 'STOPPED';
  const isRec = status === 'RECORDING';
  const isPlay = status === 'PLAYING';
  const isFF = status === 'FF' || status === 'SHUTTLE';
  const isRW = status === 'RW';
  const isStill = status === 'STILL';

  let tallyClass = '';
  if (isRec) tallyClass = 'tally-rec';
  else if (isPlay) tallyClass = 'tally-play';
  else if (isStill || isFF || isRW) tallyClass = 'tally-cue';

  // Render authentic broadcast test pattern & moving raster
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = 640);
    let height = (canvas.height = 360);

    const render = () => {
      // Advance motion when playing or shuttling
      if (isPlay) {
        frameOffsetRef.current += 2;
      } else if (isFF) {
        frameOffsetRef.current += 8;
      } else if (isRW) {
        frameOffsetRef.current -= 8;
      } else if (isRec) {
        frameOffsetRef.current += 1.5;
      }

      const offset = frameOffsetRef.current;

      // Dark broadcast backdrop
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, width, height);

      // Draw SMPTE color bars background or dynamic raster
      const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      const barWidth = width / colors.length;

      // Draw top 65% SMPTE color bars with subtle scanlines
      for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.globalAlpha = 0.22;
        ctx.fillRect(i * barWidth, 0, barWidth, height * 0.65);
      }

      // Middle gradient segment
      const grad = ctx.createLinearGradient(0, height * 0.65, width, height * 0.75);
      grad.addColorStop(0, '#001a33');
      grad.addColorStop(0.5, '#003366');
      grad.addColorStop(1, '#001a33');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, height * 0.65, width, height * 0.1);

      // Bottom section (PLUGE & sync black)
      ctx.fillStyle = '#030508';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, height * 0.75, width, height * 0.25);

      // Moving playhead indicator bar on bottom
      const playheadX = ((offset * 2) % (width + 40)) - 20;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = isRec ? '#ff2a2a' : isPlay ? '#00e676' : '#00d4ff';
      ctx.fillRect(playheadX, height * 0.74, 32, 4);

      // If recording, pulse subtle red vignette
      if (isRec) {
        const pulse = 0.15 + Math.sin(Date.now() / 200) * 0.1;
        ctx.fillStyle = `rgba(255, 42, 42, ${pulse})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Scanline effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.globalAlpha = 1.0;
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlay, isRec, isFF, isRW, isStill]);

  return (
    <div className={`preview-screen-wrapper ${tallyClass}`} id="broadcast-video-monitor">
      {/* Dynamic Screen Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Safe Area Guides */}
      <div className="safe-area-guide" />
      <div className="screen-center-cross" />

      {/* Top OSD Bar */}
      <div className="osd-bar-top">
        <div className="osd-channel-tag">
          <Tv size={12} color="#00d4ff" />
          <span>{channelState?.label || 'CHANNEL'}</span>
        </div>

        <div className={`osd-tally-pill ${isRec ? 'rec' : isPlay ? 'play' : 'stop'}`}>
          {isRec ? '● RECORDING' : isPlay ? '▶ PLAYING' : status}
        </div>

        <div className="osd-video-format">
          {channelState?.activeClip?.format || '1080/59.94i HQX'} • {channelState?.activeClip?.resolution || '1920x1080'}
        </div>
      </div>

      {/* Bottom OSD Bar */}
      <div className="osd-bar-bottom">
        <div className="osd-clip-name">
          {channelState?.activeClip?.name || 'NO CLIP LOADED'}
        </div>

        <div className="osd-burnin-tc">
          {channelState?.timecode || '00:00:00:00'}
        </div>
      </div>
    </div>
  );
}
