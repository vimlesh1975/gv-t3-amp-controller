import { NextResponse } from 'next/server';
import { ampService } from '../../../../lib/amp-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, params, channel } = body;

    // Optional channel switch
    if (channel && channel !== ampService.activeChannel) {
      ampService.setActiveChannel(channel);
    }

    if (action === 'set_channel') {
      const switched = ampService.setActiveChannel(params?.channel || channel);
      return NextResponse.json({ success: switched, state: ampService.getStateSnapshot() });
    }

    const result = ampService.executeCommand(action, params);
    const snapshot = ampService.getStateSnapshot();

    return NextResponse.json({
      success: result.success,
      error: result.error,
      state: snapshot,
    });
  } catch (error) {
    console.error('API /api/amp/command error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
