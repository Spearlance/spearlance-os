export function createSSEResponse(
  content: string,
  corsHeaders: Record<string, string>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      if (content) {
        const chunk = {
          choices: [{
            delta: { content },
            index: 0
          }]
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

export function passthroughStream(
  body: ReadableStream,
  corsHeaders: Record<string, string>
): Response {
  return new Response(body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
