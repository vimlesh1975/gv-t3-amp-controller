import { NextResponse } from 'next/server';
import { ampService } from '../../../../lib/amp-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { mode, host, port, channel } = body;

    const result = await ampService.configureConnection({
      mode,
      host,
      port,
      channel,
    });

    const state = ampService.getStateSnapshot();
    return NextResponse.json({ success: result.success, error: result.error, ...state });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
