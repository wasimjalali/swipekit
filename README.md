# Carousel Forge

AI-powered LinkedIn & Instagram carousel generator. Bring your own brand.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

## What it does

- Turns a plain-text script into a polished multi-slide carousel sized for LinkedIn (1:1) or Instagram (3:4).
- Generates per-slide AI backgrounds in your brand palette, with sensible contrast and safe zones.
- Exports a single PDF (LinkedIn document carousel) or a ZIP of individual PNGs (Instagram).

## Screenshots

<!-- screenshot here: hero / main editor view -->
<!-- screenshot here: generated carousel preview -->
<!-- screenshot here: brand configuration -->

## Why this exists

Most carousel tools lock you into their templates, their brand opinions, and their pricing. Carousel Forge does the opposite — you fork it, drop in your brand config, point it at any LLM and image provider you want, and own the entire pipeline. No vendor lock-in on the visuals or the models.

## Quickstart

```bash
git clone <your-fork-url>
cd carousel-forge
npm install
cp .env.example .env.local
npm run dev
```

Then open <http://localhost:3000>.

The default config runs in **demo mode** with no API keys required — you get deterministic placeholder structure and backgrounds, enough to see the full UI and export flow. Add real provider credentials in `.env.local` when you want live generation.

## Configure your brand

Brand identity lives in `brand.config.ts` at the repo root. Edit it once and the entire app — UI chrome, slide chrome, generated backgrounds, exported assets — picks up your colors, logo, and tone.

The shape:

```ts
export const brand = {
  name: 'Acme',
  domain: 'acme.com',
  tone: 'confident, plainspoken, slightly irreverent',
  cta: 'Try Acme free → acme.com',
  themes: {
    'navy': {
      name: 'Navy',
      bg: '#0F1B3D',
      accent: '#C8A44E',
      text: '#FFFFFF',
    },
    'cream': {
      name: 'Cream',
      bg: '#FAF8F5',
      accent: '#0F1B3D',
      text: '#2D3748',
    },
  },
  logoLight: `<svg ...>`, // shown on dark backgrounds
  logoDark:  `<svg ...>`, // shown on light backgrounds
};
```

You can ship any number of themes. The first key becomes the default selection in the UI.

## LLM providers

<!-- TODO: confirm env var names once lib/llm/ is in place. Table below reflects the planned adapter set. -->

| Provider | `LLM_PROVIDER` | Required env vars |
|---|---|---|
| Demo (no key) | `demo` | — |
| Azure OpenAI | `azure-openai` | `AZURE_OPENAI_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` |
| OpenAI | `openai` | `OPENAI_API_KEY`, optional `OPENAI_MODEL` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` |

Image generation is selected separately via `IMAGE_PROVIDER` (`demo`, `azure-foundry`, or `openai`). See `.env.example` for the full list of variables and `lib/llm/README.md` for adapter internals.

## Architecture

The pipeline is intentionally linear: your script comes in, the LLM structures it into typed slide objects, an image model generates a background per slide, the client renders the composed slides, and the export step hands you a PDF or ZIP.

```
script text
     │
     ▼
/api/structure   ── LLM adapter ──► slide objects (headline, subtext, theme, accent)
     │
     ▼
/api/generate-bg ── image adapter ─► per-slide background (data URL)
     │
     ▼
client render    ── React + brand.config ─► final slide DOM
     │
     ▼
export           ── html2canvas + jspdf/jszip ─► PDF or ZIP of PNGs
```

Everything brand-specific is read from `brand.config.ts`. Everything provider-specific is read from `.env.local`. The slide layout engine has no opinion about either.

## Roadmap

- Pluggable export targets (Google Slides, Figma frames, raw HTML).
- Per-slide regeneration without re-running the full structure pass.
- A small library of script archetypes (case study, listicle, hot take, teardown).
- Team mode: shared `brand.config.ts` plus per-author tone overrides.
- Optional self-hosted image model adapter (SDXL / FLUX) for fully air-gapped use.

## Contributing

PRs are very welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, how to add a new LLM provider, how to add a theme, and the PR checklist.

## License

[MIT](./LICENSE).

## Acknowledgements

Originally built to power karkoai.com, open-sourced for the community.
