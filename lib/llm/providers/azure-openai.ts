import type { TextProvider, TextStructureInput } from '../types';

interface AzureChatCompletionResponse {
  choices: Array<{ message: { content: string | null } }>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export class AzureOpenAIProvider implements TextProvider {
  async structure(input: TextStructureInput): Promise<unknown> {
    const key = requireEnv('AZURE_OPENAI_KEY');
    const endpoint = requireEnv('AZURE_OPENAI_ENDPOINT');
    const deployment = requireEnv('AZURE_OPENAI_DEPLOYMENT');

    // Endpoint may be either the full Azure base (https://<resource>.openai.azure.com)
    // or an OpenAI-compatible base URL. Detect and route accordingly.
    const isAzureNative = /\.openai\.azure\.com/i.test(endpoint);
    const url = isAzureNative
      ? joinUrl(endpoint, `openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`)
      : joinUrl(endpoint, 'chat/completions');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isAzureNative) {
      headers['api-key'] = key;
    } else {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const body = {
      model: deployment,
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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI request failed (${response.status}): ${errorText.slice(0, 500)}`);
    }

    const result = (await response.json()) as AzureChatCompletionResponse;
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Azure OpenAI returned empty content');
    }
    return JSON.parse(content);
  }
}
