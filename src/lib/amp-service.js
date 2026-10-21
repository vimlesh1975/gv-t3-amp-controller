/**
 * Grass Valley T3 iDDR Backend Service & Hardware / Simulator Bridge
 * Manages TCP Socket to T3 Deck or High-Fidelity Virtual Deck Simulator
 */

import net from 'net';
import {
  buildCratPacket,
  buildCmdsPacket,
  framesToTimecode,
  timecodeToFrames,
  parseTransportStatus,
  AMP_COMMANDS,
  SHUTTLE_SPEEDS,
} from './amp-protocol.js';

// Preloaded broadcast clips for T3 iDDR clip bin
const DEFAULT_CLIPS = [
  {
    id: 'CLIP_001',
    name: 'OPENING_TITLES_4K_HDR',
    duration: '00:00:30:00',
    durationFrames: 900,
    inPoint: '00:00:00:00',
    outPoint: '00:00:30:00',
    format: 'ProRes 422 HQ',
    fps: 29.97,
    resolution: '3840x2160',
    date: '2026-10-21 08:30',
    bin: 'SHOW_ASSETS',
  },
  {
    id: 'CLIP_002',
    name: 'BREAKING_NEWS_PKG_1080i',
    duration: '00:02:15:15',
    durationFrames: 4065,
    inPoint: '00:00:00:00',
    outPoint: '00:02:15:15',
    format: 'Grass Valley HQX',
    fps: 29.97,
    resolution: '1920x1080i',
    date: '2026-10-21 10:15',
    bin: 'NEWS_FEED',
  },
  {
    id: 'CLIP_003',
    name: 'SPORTS_REPLAY_SLOMO_CAM2',
    duration: '00:00:45:00',
    durationFrames: 1350,
    inPoint: '00:00:05:00',
    outPoint: '00:00:40:00',
    format: 'DNxHD 220x',
    fps: 59.94,
    resolution: '1920x1080p',
    date: '2026-10-21 11:02',
    bin: 'REPLAY_BIN',
  },
  {
    id: 'CLIP_004',
    name: 'COMMERCIAL_SPOT_AUTO_30S',
    duration: '00:00:30:00',
    durationFrames: 900,
    inPoint: '00:00:00:00',
    outPoint: '00:00:30:00',
    format: 'XDCAM-HD422',
    fps: 29.97,
    resolution: '1920x1080i',
    date: '2026-10-20 18:00',
    bin: 'COMMERCIALS',
  },
  {
    id: 'CLIP_005',
    name: 'STATION_IDENT_BUMPER',
    duration: '00:00:08:12',
    durationFrames: 252,
    inPoint: '00:00:00:00',
    outPoint: '00:00:08:12',
    format: 'ProRes 4444',
    fps: 29.97,
    resolution: '1920x1080p',
    date: '2026-10-21 07:00',
    bin: 'GRAPHICS',
  },
];

class GrassValleyAmpService {
  constructor() {
    this.mode = 'hardware'; // 'hardware' | 'simulator'
    this.host = '192.168.145.20';
    this.port = 3811;
    this.activeChannel = 'Vtr1'; // 'Vtr1' (R1), 'Vtr2' (P1), 'Vtr3' (P2)
    this.isConnected = false;
    this.connectionState = 'connecting'; // 'connected' | 'connecting' | 'disconnected' | 'error'
    this.lastError = null;

    // Multi-channel 3-Recorder state (R1, R2, R3)
    this.channels = {
      Vtr1: {
        id: 'Vtr1',
        label: 'R1 (Recorder 1)',
        type: 'RECORD',
        inputSource: 'SDI IN 1',
        transportStatus: 'STOPPED',
        timecode: '01:00:00:00',
        currentFrames: 108000,
        fps: 29.97,
        dropFrame: false,
        activeClip: {
          id: 'REC_CAM1',
          name: 'CAM1_ISO_001',
          duration: '00:00:00:00',
          durationFrames: 0,
          format: 'Grass Valley HQX',
          fps: 29.97,
          resolution: '1920x1080i',
          bin: 'REC_BIN_R1',
        },
        inPoint: '01:00:00:00',
        outPoint: '01:00:00:00',
        speed: 1.0,
        audioL: -18,
        audioR: -19,
        tally: { onAir: false, recording: false, cued: true },
      },
      Vtr2: {
        id: 'Vtr2',
        label: 'R2 (Recorder 2)',
        type: 'RECORD',
        inputSource: 'SDI IN 2',
        transportStatus: 'STOPPED',
        timecode: '01:00:00:00',
        currentFrames: 108000,
        fps: 29.97,
        dropFrame: false,
        activeClip: {
          id: 'REC_CAM2',
          name: 'CAM2_ISO_001',
          duration: '00:00:00:00',
          durationFrames: 0,
          format: 'Grass Valley HQX',
          fps: 29.97,
          resolution: '1920x1080i',
          bin: 'REC_BIN_R2',
        },
        inPoint: '01:00:00:00',
        outPoint: '01:00:00:00',
        speed: 1.0,
        audioL: -20,
        audioR: -21,
        tally: { onAir: false, recording: false, cued: true },
      },
      Vtr3: {
        id: 'Vtr3',
        label: 'R3 (Recorder 3)',
        type: 'RECORD',
        inputSource: 'SDI IN 3',
        transportStatus: 'STOPPED',
        timecode: '01:00:00:00',
        currentFrames: 108000,
        fps: 29.97,
        dropFrame: false,
        activeClip: {
          id: 'REC_CAM3',
          name: 'CAM3_ISO_001',
          duration: '00:00:00:00',
          durationFrames: 0,
          format: 'Grass Valley HQX',
          fps: 29.97,
          resolution: '1920x1080i',
          bin: 'REC_BIN_R3',
        },
        inPoint: '01:00:00:00',
        outPoint: '01:00:00:00',
        speed: 1.0,
        audioL: -22,
        audioR: -22,
        tally: { onAir: false, recording: false, cued: true },
      },
    };

    this.clips = [...DEFAULT_CLIPS];
    this.packetLogs = [];
    this.subscribers = new Set();
    this.socket = null;
    this.heartbeatTimer = null;
    this.simulationTimer = null;

    // Start background simulation clock
    this.startSimulationClock();

    // Add initial log
    this.logPacket('SYS', 'INITIALIZED', 'Grass Valley T3 iDDR Controller Engine Ready');
  }

  logPacket(direction, hex, parsed) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString() + '.' + String(Date.now() % 1000).padStart(3, '0'),
      direction, // 'TX' | 'RX' | 'SYS'
      hex,
      parsed,
    };
    this.packetLogs.unshift(entry);
    if (this.packetLogs.length > 80) {
      this.packetLogs.pop();
    }
    this.notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const payload = this.getStateSnapshot();
    for (const callback of this.subscribers) {
      try {
        callback(payload);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    }
  }

  getStateSnapshot() {
    return {
      mode: this.mode,
      host: this.host,
      port: this.port,
      activeChannel: this.activeChannel,
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      lastError: this.lastError,
      channels: this.channels,
      currentChannelState: this.channels[this.activeChannel] || {},
      clips: this.clips,
      recentLogs: this.packetLogs.slice(0, 25),
    };
  }

  // Set Connection Mode: 'simulator' or 'hardware'
  async configureConnection({ mode = 'hardware', host = '192.168.145.20', port = 3811, channel = 'Vtr1' }) {
    this.activeChannel = channel;
    this.host = host;
    this.port = parseInt(port, 10) || 3811;

    if (mode === 'simulator') {
      if (this.socket) {
        try {
          this.socket.destroy();
        } catch (e) {}
        this.socket = null;
      }
      this.mode = 'simulator';
      this.isConnected = true;
      this.connectionState = 'connected';
      this.lastError = null;
      this.logPacket('SYS', 'MODE_SIMULATOR', `Switched to Virtual T3 iDDR Simulator on Channel ${channel}`);
      this.notifySubscribers();
      return { success: true, mode: 'simulator' };
    }

    // Hardware mode
    this.mode = 'hardware';
    this.connectionState = 'connecting';
    this.notifySubscribers();
    return this.connectHardwareSocket();
  }

  // Connect TCP socket to real Grass Valley T3
  async connectHardwareSocket() {
    return new Promise((resolve) => {
      if (this.socket) {
        try {
          this.socket.destroy();
        } catch (e) {}
        this.socket = null;
      }

      this.logPacket('SYS', 'TCP_CONNECT', `Opening TCP socket to ${this.host}:${this.port}...`);

      const socket = new net.Socket();
      this.socket = socket;
      socket.setTimeout(5000);

      socket.connect(this.port, this.host, () => {
        this.isConnected = true;
        this.connectionState = 'connected';
        this.lastError = null;
        this.logPacket('SYS', 'TCP_CONNECTED', `Connected to Grass Valley T3 at ${this.host}:${this.port}`);

        // Send CRAT connection packet for the target channel
        const crat = buildCratPacket(this.activeChannel);
        this.logPacket('TX', crat.trim(), `CRAT Request: Connect channel ${this.activeChannel}`);
        socket.write(crat);

        // Start periodic status sense
        this.startHardwareHeartbeat();
        this.notifySubscribers();
        resolve({ success: true, mode: 'hardware' });
      });

      socket.on('data', (data) => {
        const str = data.toString('utf8');
        this.handleHardwareResponse(str, data);
      });

      socket.on('timeout', () => {
        this.lastError = 'Connection timed out';
        this.logPacket('SYS', 'ERR_TIMEOUT', `Connection timeout to ${this.host}:${this.port}`);
        socket.destroy();
      });

      socket.on('error', (err) => {
        this.lastError = err.message;
        this.isConnected = false;
        this.connectionState = 'error';
        this.logPacket('SYS', 'ERR_SOCKET', `Socket Error: ${err.message}`);
        this.notifySubscribers();
        resolve({ success: false, error: err.message });
      });

      socket.on('close', () => {
        this.isConnected = false;
        this.connectionState = 'disconnected';
        this.logPacket('SYS', 'TCP_CLOSED', `Socket connection closed.`);
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.notifySubscribers();

        // Auto-reconnect retry every 2.5 seconds if configured for hardware mode
        if (this.mode === 'hardware' && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.mode === 'hardware' && !this.isConnected) {
              this.logPacket('SYS', 'RECONNECT', `Retrying connection to ${this.host}:${this.port}...`);
              this.connectHardwareSocket();
            }
          }, 2500);
        }
      });
    });
  }

  startHardwareHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.isConnected) {
        // Poll transport status (612002) and timecode (610C01)
        this.sendHardwareCommand(AMP_COMMANDS.STATUS_SENSE);
        setTimeout(() => {
          if (this.socket && this.isConnected) {
            this.sendHardwareCommand(AMP_COMMANDS.TIMECODE_SENSE);
          }
        }, 100);
      }
    }, 500);
  }

  sendHardwareCommand(cmdHex) {
    if (!this.socket || !this.isConnected) return false;
    try {
      const packet = buildCmdsPacket(cmdHex);
      this.logPacket('TX', packet.trim(), `AMP Command: ${cmdHex}`);
      this.socket.write(packet);
      return true;
    } catch (err) {
      this.logPacket('SYS', 'ERR_WRITE', `Socket write error: ${err.message}`);
      return false;
    }
  }

  handleHardwareResponse(str, buffer) {
    if (str.includes('1001')) {
      this.logPacket('RX', '1001', 'ACK (Command Accepted)');
    } else if (str.includes('1111')) {
      this.logPacket('RX', '1111', 'NAK (Command Rejected)');
    } else if (str.length >= 4) {
      this.logPacket('RX', str.trim(), `AMP Telemetry Data (${str.length} bytes)`);
      // Parse transport bits if 72.20
      if (str.startsWith('7220') || str.includes('7220')) {
        const hex = str.replace(/[^0-9a-fA-F]/g, '');
        if (hex.length >= 6) {
          const statusByte = parseInt(hex.substr(4, 2), 16);
          const parsed = parseTransportStatus(statusByte);
          const ch = this.channels[this.activeChannel];
          if (ch) {
            if (parsed.isPlaying) ch.transportStatus = 'PLAYING';
            else if (parsed.isRecording) ch.transportStatus = 'RECORDING';
            else if (parsed.isFastForward) ch.transportStatus = 'FF';
            else if (parsed.isRewind) ch.transportStatus = 'RW';
            else ch.transportStatus = 'STOPPED';
            this.notifySubscribers();
          }
        }
      }
    }
  }

  // High-Fidelity Simulation Clock
  startSimulationClock() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    
    // Tick at 10Hz for smooth UI timecode updates
    this.simulationTimer = setInterval(() => {
      let changed = false;

      for (const key of Object.keys(this.channels)) {
        const ch = this.channels[key];
        const fps = ch.fps || 29.97;
        const frameStep = fps / 10; // ~3 frames per 100ms

        if (ch.transportStatus === 'PLAYING') {
          ch.currentFrames += frameStep * (ch.speed || 1.0);
          changed = true;

          // Audio meter bounce
          ch.audioL = Math.max(-42, Math.min(-6, -16 + (Math.random() * 8 - 4)));
          ch.audioR = Math.max(-42, Math.min(-6, -17 + (Math.random() * 8 - 4)));

          // Check outPoint loop
          if (ch.activeClip) {
            const outFrames = timecodeToFrames(ch.outPoint || ch.activeClip.outPoint, fps);
            if (ch.currentFrames >= outFrames) {
              if (ch.loop) {
                const inFrames = timecodeToFrames(ch.inPoint || ch.activeClip.inPoint, fps);
                ch.currentFrames = inFrames;
              } else {
                ch.currentFrames = outFrames;
                ch.transportStatus = 'STOPPED';
              }
            }
          }
          ch.timecode = framesToTimecode(ch.currentFrames, fps, ch.dropFrame);
        } else if (ch.transportStatus === 'RECORDING') {
          ch.currentFrames += frameStep;
          changed = true;
          ch.audioL = Math.max(-36, Math.min(-3, -12 + (Math.random() * 6 - 3)));
          ch.audioR = Math.max(-36, Math.min(-3, -12 + (Math.random() * 6 - 3)));
          ch.timecode = framesToTimecode(ch.currentFrames, fps, ch.dropFrame);

          if (ch.activeClip) {
            ch.activeClip.durationFrames = Math.max(ch.activeClip.durationFrames, ch.currentFrames);
            ch.activeClip.duration = framesToTimecode(ch.activeClip.durationFrames, fps);
            ch.outPoint = ch.timecode;
          }
        } else if (ch.transportStatus === 'FF' || ch.transportStatus === 'SHUTTLE') {
          const rate = ch.shuttleRate || 2.0;
          ch.currentFrames += frameStep * rate;
          changed = true;
          ch.audioL = -48;
          ch.audioR = -48;
          ch.timecode = framesToTimecode(ch.currentFrames, fps, ch.dropFrame);
        } else if (ch.transportStatus === 'RW') {
          const rate = Math.abs(ch.shuttleRate || 2.0);
          ch.currentFrames = Math.max(0, ch.currentFrames - frameStep * rate);
          changed = true;
          ch.audioL = -48;
          ch.audioR = -48;
          ch.timecode = framesToTimecode(ch.currentFrames, fps, ch.dropFrame);
        } else if (ch.transportStatus === 'STOPPED' || ch.transportStatus === 'STILL') {
          // Resting audio floor
          if (ch.audioL > -48) {
            ch.audioL = Math.max(-48, ch.audioL - 3);
            ch.audioR = Math.max(-48, ch.audioR - 3);
            changed = true;
          }
        }
      }

      if (changed) {
        this.notifySubscribers();
      }
    }, 100);
  }

  // Execute Transport & Playout Commands
  executeCommand(action, params = {}) {
    const ch = this.channels[this.activeChannel];
    if (!ch) return { success: false, error: 'Channel not found' };

    switch (action) {
      case 'record_all': {
        const cmdHex = AMP_COMMANDS.RECORD;
        this.logPacket('SYS', 'REC_ALL', 'RECORD ALL issued across all recording channels');
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        }
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substr(0, 14);
        for (const k of Object.keys(this.channels)) {
          const c = this.channels[k];
          if (c.type === 'RECORD' || c.type === 'RECORD_PLAY') {
            c.transportStatus = 'RECORDING';
            c.speed = 1.0;
            c.tally.recording = true;
            c.tally.onAir = false;

            const isoPrefix = c.id === 'Vtr1' ? 'CAM1' : c.id === 'Vtr2' ? 'CAM2' : 'CAM3';
            c.activeClip = {
              id: 'REC_' + k + '_' + Date.now(),
              name: `${isoPrefix}_ISO_${timestamp}`,
              duration: '00:00:00:00',
              durationFrames: 0,
              inPoint: c.timecode,
              outPoint: c.timecode,
              format: 'Grass Valley HQX',
              fps: c.fps,
              resolution: '1920x1080i',
              date: new Date().toLocaleString(),
              bin: `REC_BIN_${c.id}`,
            };
            this.clips.unshift(c.activeClip);
          }
        }
        this.logPacket('TX', `CMDS0004${cmdHex}`, 'RECORD ALL command sent to T3 (3 Recorders)');
        this.logPacket('RX', '1001', 'ACK: R1, R2, R3 recording in sync');
        break;
      }

      case 'stop_all': {
        const cmdHex = AMP_COMMANDS.STOP;
        this.logPacket('SYS', 'STOP_ALL', 'STOP ALL issued across all channels');
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        }
        for (const k of Object.keys(this.channels)) {
          const c = this.channels[k];
          c.transportStatus = 'STOPPED';
          c.speed = 0;
          c.shuttleRate = 0;
          c.tally.recording = false;
          c.tally.onAir = false;
        }
        this.logPacket('TX', `CMDS0004${cmdHex}`, 'STOP ALL command sent');
        this.logPacket('RX', '1001', 'ACK: All channels stopped');
        break;
      }

      case 'play_all': {
        const cmdHex = AMP_COMMANDS.PLAY;
        this.logPacket('SYS', 'PLAY_ALL', 'PLAY ALL issued across all playout channels');
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        }
        for (const k of Object.keys(this.channels)) {
          const c = this.channels[k];
          c.transportStatus = 'PLAYING';
          c.speed = 1.0;
          c.shuttleRate = 1.0;
          c.tally.recording = false;
          c.tally.onAir = true;
        }
        this.logPacket('TX', `CMDS0004${cmdHex}`, 'PLAY ALL command sent');
        this.logPacket('RX', '1001', 'ACK: Playout started on channels');
        break;
      }

      case 'play': {
        const cmdHex = AMP_COMMANDS.PLAY;
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.transportStatus = 'PLAYING';
          ch.speed = 1.0;
          ch.shuttleRate = 1.0;
          ch.tally.recording = false;
          ch.tally.onAir = true;
          this.logPacket('TX', `CMDS0004${cmdHex}`, `PLAY command on ${ch.id}`);
          this.logPacket('RX', '1001', 'ACK: Playout started');
        }
        break;
      }

      case 'stop': {
        const cmdHex = AMP_COMMANDS.STOP;
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.transportStatus = 'STOPPED';
          ch.speed = 0;
          ch.shuttleRate = 0;
          ch.tally.recording = false;
          ch.tally.onAir = false;
          this.logPacket('TX', `CMDS0004${cmdHex}`, `STOP command on ${ch.id}`);
          this.logPacket('RX', '1001', 'ACK: Transport stopped');
        }
        break;
      }

      case 'record': {
        const cmdHex = AMP_COMMANDS.RECORD;
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.transportStatus = 'RECORDING';
          ch.speed = 1.0;
          ch.tally.recording = true;
          ch.tally.onAir = false;

          // If no active clip or recording new clip
          if (!ch.activeClip || ch.activeClip.id !== 'REC_ACTIVE') {
            const clipName = params.clipName || `LIVE_REC_${new Date().toISOString().replace(/[-:T.]/g, '').substr(0, 14)}`;
            const newClip = {
              id: 'REC_' + Date.now(),
              name: clipName,
              duration: '00:00:00:00',
              durationFrames: 0,
              inPoint: ch.timecode,
              outPoint: ch.timecode,
              format: 'Grass Valley HQX',
              fps: ch.fps,
              resolution: '1920x1080i',
              date: new Date().toLocaleString(),
              bin: 'RECORDINGS',
            };
            this.clips.unshift(newClip);
            ch.activeClip = newClip;
          }

          this.logPacket('TX', `CMDS0004${cmdHex}`, `RECORD command on ${ch.id}`);
          this.logPacket('RX', '1001', `ACK: Recording started [${ch.activeClip.name}]`);
        }
        break;
      }

      case 'pause':
      case 'still': {
        ch.transportStatus = 'STILL';
        ch.speed = 0;
        ch.shuttleRate = 0;
        this.logPacket('TX', 'CMDS00042000', `PAUSE / STILL command on ${ch.id}`);
        this.logPacket('RX', '1001', 'ACK: Playout paused on still frame');
        break;
      }

      case 'shuttle': {
        const rate = parseFloat(params.rate) || 2.0;
        const speedObj = SHUTTLE_SPEEDS.find((s) => s.rate === Math.abs(rate)) || SHUTTLE_SPEEDS[4];
        const isFwd = rate >= 0;
        const cmdHex = isFwd ? AMP_COMMANDS.shuttleFwd(speedObj.hex) : AMP_COMMANDS.shuttleRev(speedObj.hex);

        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.transportStatus = isFwd ? 'FF' : 'RW';
          ch.shuttleRate = rate;
          this.logPacket('TX', `CMDS0006${cmdHex}`, `SHUTTLE ${rate}x command on ${ch.id}`);
          this.logPacket('RX', '1001', `ACK: Shuttle speed ${rate}x`);
        }
        break;
      }

      case 'jog': {
        const frames = parseInt(params.frames, 10) || 1;
        const isFwd = frames > 0;
        const count = Math.min(15, Math.abs(frames));
        const cmdHex = isFwd ? AMP_COMMANDS.jogFwd(count) : AMP_COMMANDS.jogRev(count);

        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.transportStatus = 'STILL';
          ch.currentFrames = Math.max(0, ch.currentFrames + frames);
          ch.timecode = framesToTimecode(ch.currentFrames, ch.fps, ch.dropFrame);
          this.logPacket('TX', `CMDS0006${cmdHex}`, `JOG ${frames > 0 ? '+' : ''}${frames} frames on ${ch.id}`);
          this.logPacket('RX', '1001', `ACK: Position ${ch.timecode}`);
        }
        break;
      }

      case 'cue_timecode': {
        const tc = params.timecode || '00:00:00:00';
        const cmdHex = AMP_COMMANDS.cueTimecode(tc);
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.transportStatus = 'STOPPED';
          ch.timecode = tc;
          ch.currentFrames = timecodeToFrames(tc, ch.fps);
          this.logPacket('TX', `CMDS0010${cmdHex}`, `CUE to ${tc} on ${ch.id}`);
          this.logPacket('RX', '1001', `ACK: Cued to ${tc}`);
        }
        break;
      }

      case 'load_clip': {
        const clip = this.clips.find((c) => c.id === params.clipId || c.name === params.clipName);
        if (clip) {
          ch.activeClip = clip;
          ch.timecode = clip.inPoint || '00:00:00:00';
          ch.inPoint = clip.inPoint || '00:00:00:00';
          ch.outPoint = clip.outPoint || clip.duration;
          ch.currentFrames = timecodeToFrames(ch.timecode, ch.fps);
          ch.transportStatus = 'STOPPED';

          const cmdHex = AMP_COMMANDS.loadClip(clip.name);
          if (this.mode === 'hardware') {
            this.sendHardwareCommand(cmdHex);
          } else {
            this.logPacket('TX', `CMDS${cmdHex.length}${cmdHex}`, `LOAD CLIP: "${clip.name}" onto ${ch.id}`);
            this.logPacket('RX', '1001', `ACK: Clip loaded. Duration: ${clip.duration}`);
          }
        }
        break;
      }

      case 'set_loop': {
        const enabled = Boolean(params.enabled);
        ch.loop = enabled;
        const cmdHex = enabled ? AMP_COMMANDS.LOOP_ON : AMP_COMMANDS.LOOP_OFF;
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          this.logPacket('TX', `CMDS0006${cmdHex}`, `SET LOOP: ${enabled ? 'ON' : 'OFF'} on ${ch.id}`);
          this.logPacket('RX', '1001', `ACK: Loop mode ${enabled ? 'active' : 'disabled'}`);
        }
        break;
      }

      case 'set_mark_in': {
        ch.inPoint = params.timecode || ch.timecode;
        this.logPacket('SYS', 'MARK_IN', `Mark IN point set to ${ch.inPoint} on ${ch.id}`);
        break;
      }

      case 'set_mark_out': {
        ch.outPoint = params.timecode || ch.timecode;
        this.logPacket('SYS', 'MARK_OUT', `Mark OUT point set to ${ch.outPoint} on ${ch.id}`);
        break;
      }

      case 'goto_in': {
        ch.timecode = ch.inPoint;
        ch.currentFrames = timecodeToFrames(ch.inPoint, ch.fps);
        ch.transportStatus = 'STOPPED';
        this.logPacket('SYS', 'GOTO_IN', `Cue to IN Point: ${ch.inPoint}`);
        break;
      }

      case 'goto_out': {
        ch.timecode = ch.outPoint;
        ch.currentFrames = timecodeToFrames(ch.outPoint, ch.fps);
        ch.transportStatus = 'STOPPED';
        this.logPacket('SYS', 'GOTO_OUT', `Cue to OUT Point: ${ch.outPoint}`);
        break;
      }

      case 'eject': {
        const cmdHex = AMP_COMMANDS.EJECT;
        if (this.mode === 'hardware') {
          this.sendHardwareCommand(cmdHex);
        } else {
          ch.activeClip = null;
          ch.transportStatus = 'STOPPED';
          this.logPacket('TX', `CMDS0004${cmdHex}`, `EJECT command on ${ch.id}`);
          this.logPacket('RX', '1001', 'ACK: Channel media ejected');
        }
        break;
      }

      case 'send_raw': {
        const rawHex = String(params.rawHex || '').trim();
        if (rawHex) {
          if (this.mode === 'hardware') {
            this.sendHardwareCommand(rawHex);
          } else {
            this.logPacket('TX', `CMDS${rawHex.length}${rawHex}`, `RAW AMP COMMAND: ${rawHex}`);
            this.logPacket('RX', '1001', 'ACK (Simulator Accepted)');
          }
        }
        break;
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }

    this.notifySubscribers();
    return { success: true, channelState: ch };
  }

  // Switch Active Controlled Channel
  setActiveChannel(channelId) {
    if (this.channels[channelId]) {
      this.activeChannel = channelId;
      this.logPacket('SYS', 'CH_SELECT', `Active control switched to ${channelId} (${this.channels[channelId].label})`);

      if (this.mode === 'hardware' && this.isConnected && this.socket) {
        const crat = buildCratPacket(channelId);
        this.logPacket('TX', crat.trim(), `CRAT Request: Rebind channel to ${channelId}`);
        this.socket.write(crat);
      }

      this.notifySubscribers();
      return true;
    }
    return false;
  }
}

// Global Singleton to preserve state across Next.js API calls
if (!globalThis._gvAmpService) {
  globalThis._gvAmpService = new GrassValleyAmpService();
}

export const ampService = globalThis._gvAmpService;
