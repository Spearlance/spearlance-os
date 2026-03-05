export interface FunctionCall {
  id: string;
  name: string;
  arguments: string;
}

export async function consumeStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<{
  assistantMessage: string;
  functionCalls: FunctionCall[];
}> {
  const decoder = new TextDecoder();
  const functionCalls: Record<number, FunctionCall> = {};
  let assistantMessage = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || line.startsWith(':')) continue;
      if (!line.startsWith('data: ')) continue;

      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;

        // Accumulate assistant message content
        if (delta?.content) {
          assistantMessage += delta.content;
        }

        // Accumulate function calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;

            if (!functionCalls[index]) {
              functionCalls[index] = {
                id: toolCall.id || `call_${index}`,
                name: '',
                arguments: ''
              };
            }

            if (toolCall.function?.name) {
              functionCalls[index].name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              functionCalls[index].arguments += toolCall.function.arguments;
            }
          }
        }
      } catch (_e) {
        // Ignore parse errors for incomplete chunks
      }
    }
  }

  // Convert functionCalls object to array
  const functionCallsArray = Object.values(functionCalls).filter(
    (fc): fc is FunctionCall => fc.name !== ''
  );

  return {
    assistantMessage,
    functionCalls: functionCallsArray,
  };
}
