import type { TextProvider, TextStructureInput } from '../types';

interface AnthropicMessagesResponse {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; name: string; input: unknown }
    | { type: string; [key: string]: unknown }
  >;
  stop_reason: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export class AnthropicProvider implements TextProvider {
  async structure(input: TextStructureInput): Promise<unknown> {
    const key = requireEnv('ANTHROPIC_API_KEY');
    const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
    const toolName = input.schemaName ?? 'emit_structured_output';

    // Anthropic does not have native JSON-schema response_format. Use tool-use:
    // declare a single tool whose input_schema is the desired JSON schema and
    // force the model to call it. The tool input becomes our structured output.
    const body = {
      model,
      max_tokens: input.maxTokens ?? 4000,
      temperature: input.temperature ?? 0.3,
      system: input.systemPrompt,
      tools: [
        {
          name: toolName,
          description: 'Emit the structured output that satisfies the requested schema.',
          input_schema: input.jsonSchema,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
      messages: [
        { role: 'user', content: input.userPrompt },
      ],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${errorText.slice(0, 500)}`);
    }

    const result = (await response.json()) as AnthropicMessagesResponse;
    const toolUse = result.content.find(
      (block): block is { type: 'tool_use'; name: string; input: unknown } =>
        block.type === 'tool_use' && (block as { name?: string }).name === toolName,
    );

    if (!toolUse) {
      throw new Error('Anthropic did not return a tool_use block with structured output');
    }

    return toolUse.input;
  }
}
