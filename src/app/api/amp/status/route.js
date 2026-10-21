import { NextResponse } from 'next/server';
import { ampService } from '../../../../lib/amp-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const state = ampService.getStateSnapshot();
    return NextResponse.json({ success: true, ...state });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
