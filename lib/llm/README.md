# LLM / Image Provider Abstraction

A thin pluggable layer that lets slideco run against any text/image provider — or
no provider at all via **demo mode**. Two interfaces (`TextProvider`,
`ImageProvider`) selected at runtime via env vars.

## Quick start

Clone, install, and run with **zero keys**:

```bash
npm install
npm run dev
```

You get fully mocked carousels and SVG gradient backgrounds. No network calls,
no cost.

To go live, set provider env vars (see matrix below) and restart.

## How it works

```
┌─────────────────────┐      ┌────────────────────┐
│ app/api/structure   │ ───▶ │ getTextProvider()  │ ──▶ Azure/OpenAI/Anthropic/Demo
└─────────────────────┘      └────────────────────┘

┌─────────────────────┐      ┌────────────────────┐
│ app/api/generate-bg │ ───▶ │ getImageProvider() │ ──▶ Azure FLUX / Demo
└─────────────────────┘      └────────────────────┘
```

The factory in `index.ts` reads `LLM_PROVIDER` and `IMAGE_PROVIDER` and returns
a concrete implementation. Unknown values fall back to `demo` with a warning.

## Env var matrix

| `LLM_PROVIDER` | Required env vars                                                   | Notes                                              |
|----------------|---------------------------------------------------------------------|----------------------------------------------------|
| `demo`         | none                                                                | Default. In-process mock; no network calls.        |
| `azure`        | `AZURE_OPENAI_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` | Auto-routes to Azure `api-key` header or OpenAI-compatible `Authorization` based on endpoint host. |
| `openai`       | `OPENAI_API_KEY`, optional `OPENAI_MODEL` (default `gpt-4o-mini`)   | Standard `api.openai.com/v1/chat/completions` with JSON-schema response format. |
| `anthropic`    | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` (default `claude-opus-4-7`) | Uses tool-use with a forced `tool_choice` to coerce JSON-schema output. |

| `IMAGE_PROVIDER` | Required env vars                                  | Notes                                                          |
|------------------|----------------------------------------------------|----------------------------------------------------------------|
| `demo`           | none                                               | Default. Deterministic SVG gradients seeded from the prompt.   |
| `azure-flux`     | `AZURE_FOUNDRY_KEY`, `AZURE_FOUNDRY_ENDPOINT`      | FLUX.2-pro through Azure AI Foundry. Includes retry + safety-filter fallback. |

## Adding a new provider

1. **Pick the interface.** A text provider implements `TextProvider.structure`;
   an image provider implements `ImageProvider.generate`. See `types.ts`.

2. **Create the file** at `lib/llm/providers/<name>.ts`. Use `fetch()` directly
   — we intentionally avoid adding SDK deps. Read env vars via
   `process.env.<NAME>` and throw if a required one is missing.

3. **Register it** in `lib/llm/index.ts`:
   - Add the name to `TextProviderName` (or `ImageProviderName`) and the
     corresponding `Set`.
   - Add a `case` in `getTextProvider()` / `getImageProvider()`.

4. **Document it** by adding a row to the env-var matrix above.

Minimal text-provider skeleton:

```ts
import type { TextProvider, TextStructureInput } from '../types';

export class MyProvider implements TextProvider {
  async structure(input: TextStructureInput): Promise<unknown> {
    const key = process.env.MY_KEY;
    if (!key) throw new Error('MY_KEY is not set');

    const response = await fetch('https://api.example.com/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ /* vendor-specific payload using input.systemPrompt, input.userPrompt, input.jsonSchema */ }),
    });

    if (!response.ok) {
      throw new Error(`MyProvider failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    }
    const result = await response.json();
    return /* parsed JSON object matching input.jsonSchema */;
  }
}
```

## Demo mode

`providers/demo.ts` exports `DemoTextProvider` and `DemoImageProvider`:

- **Text:** parses `template`, `platform`, and slide count from the user prompt
  (the structure route formats them as labeled lines), then assembles a 1–8
  slide carousel from a small bank of plausible templates. Output matches the
  schema in `app/api/structure/route.ts` exactly.
- **Image:** hashes the prompt to deterministically pick a gradient palette and
  glow positions, then returns an inline `data:image/svg+xml;base64,…` URL at
  the requested dimensions.

Demo mode never hits the network, so it's also useful for tests and CI.

## Contract notes

- `TextProvider.structure` returns `unknown`. Callers should validate against
  their own schema before use — the contract guarantees JSON, not correctness.
- `ImageProvider.generate` always returns a usable `dataUrl`. If a provider's
  upstream rejects the prompt for safety reasons, it returns a fallback image
  and sets `safetyFiltered: true` rather than throwing.
- Hard failures (auth, network, malformed responses) throw. The API route
  decides whether to surface as a 500 or fall back.
