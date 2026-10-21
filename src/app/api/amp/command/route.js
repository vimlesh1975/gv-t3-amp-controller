import { NextResponse } from 'next/server';
import { ampService } from '../../../../lib/amp-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, params, channel } = body;

    if (action === 'set_channel') {
      const targetCh = params?.channel || channel;
      const switched = ampService.setActiveChannel(targetCh);
      return NextResponse.json({ success: switched, state: ampService.getStateSnapshot() });
    }

    const cmdParams = { ...(params || {}), channel: channel || params?.channel };
    const result = ampService.executeCommand(action, cmdParams);
    const snapshot = ampService.getStateSnapshot();

    return NextResponse.json({
      success: result.success,
      error: result.error,
      state: snapshot,
    });
  } catch (error) {
    console.error('API /api/amp/command error:', error.stack || error);
    return NextResponse.json({ success: false, error: error.stack || error.message }, { status: 500 });
  }
}
