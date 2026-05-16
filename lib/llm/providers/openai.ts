import type { TextProvider, TextStructureInput } from '../types';

interface OpenAIChatCompletionResponse {
  choices: Array<{ message: { content: string | null } }>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export class OpenAIProvider implements TextProvider {
  async structure(input: TextStructureInput): Promise<unknown> {
    const key = requireEnv('OPENAI_API_KEY');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const body = {
      model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: input.schemaName ?? 'structured_output',
          schema: input.jsonSchema,
          strict: true,
        },
      },
      max_tokens: input.maxTokens ?? 4000,
      temperature: input.temperature ?? 0.3,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText.slice(0, 500)}`);
    }

    const result = (await response.json()) as OpenAIChatCompletionResponse;
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }
    return JSON.parse(content);
  }
}
