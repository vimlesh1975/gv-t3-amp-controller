import { NextResponse } from 'next/server';
import net from 'net';
import { buildCratPacket } from '../../../../lib/amp-protocol';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const host = body.host || '192.168.145.20';
    const port = parseInt(body.port, 10) || 3811;
    const testChannels = body.channels || ['R1', 'Vtr1', 'vtr1', 'r1', 'R2', 'R3', 'Channel 1'];

    const results = [];

    for (const ch of testChannels) {
      const res = await new Promise((resolve) => {
        const s = new net.Socket();
        s.setTimeout(2500);

        let connected = false;
        let responseData = '';
        let error = null;

        s.connect(port, host, () => {
          connected = true;
          const crat = buildCratPacket(ch);
          s.write(crat);
        });

        s.on('data', (d) => {
          responseData += d.toString('utf8');
        });

        s.on('timeout', () => {
          s.destroy();
          resolve({ channel: ch, connected: false, error: 'Connection timed out' });
        });

        s.on('error', (err) => {
          error = err.message;
        });

        s.on('close', () => {
          if (responseData.includes('1001')) {
            resolve({ channel: ch, connected: true, status: 'ACK (Connected & Bound!)', response: responseData });
          } else if (responseData.includes('1111')) {
            resolve({ channel: ch, connected: true, status: 'NAK (Channel rejected)', response: responseData });
          } else if (error) {
            resolve({ channel: ch, connected, status: `Socket Error: ${error}`, error });
          } else {
            resolve({ channel: ch, connected, status: 'Closed by peer without response', response: responseData });
          }
        });
      });

      results.push(res);
      if (res.connected && res.status.includes('ACK')) {
        break; // Found working channel!
      }
    }

    return NextResponse.json({ success: true, host, port, results });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
