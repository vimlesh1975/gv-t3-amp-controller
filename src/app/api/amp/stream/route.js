import { ampService } from '../../../../lib/amp-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state immediately
      const initialPayload = `data: ${JSON.stringify(ampService.getStateSnapshot())}\n\n`;
      controller.enqueue(encoder.encode(initialPayload));

      // Subscribe to real-time service updates
      const unsubscribe = ampService.subscribe((snapshot) => {
        try {
          const chunk = `data: ${JSON.stringify(snapshot)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch (e) {
          // Stream might be closed
        }
      });

      // Keepalive heartbeat
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 15000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
