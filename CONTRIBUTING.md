# Contributing

Thanks for your interest in improving Swipekit. This document covers the
basics for getting set up and the small set of conventions we follow.

## Dev setup

```bash
git clone <your-fork-url>
cd swipekit
npm install
cp .env.example .env.local
npm run dev
```

The default `.env.example` sets `LLM_PROVIDER=demo` and `IMAGE_PROVIDER=demo`,
so the app runs end-to-end with no API keys. Swap in real provider credentials
when you want live generation.

## Adding a new LLM provider

Provider adapters live in `lib/llm/`. See `lib/llm/README.md` for the adapter
contract and a worked example. The short version:

1. Add a new file in `lib/llm/` that exports an adapter implementing the
   shared interface.
2. Register it in the provider switch so `LLM_PROVIDER=<your-name>` resolves
   to your adapter.
3. Document the env vars your adapter reads in `.env.example`.

## Customising themes

Swipekit ships with two fixed theme keys — `primary` (dark) and `secondary`
(light) — which map to the UI's theme picker. You can change everything
*inside* each theme by editing `brand.config.ts`: colours, overlay gradient,
CTA pill fill, FLUX colour-grading phrases, and the SVG fallback palette.
See `lib/brand.ts` for the full `BrandConfig` type.

## Code style

Follow existing patterns. Prefer reading a nearby file over inventing a new
convention. Run `npm run build` before sending a PR — a clean type check is
the bar.

## PR checklist

- [ ] `npm run build` passes (type check + build)
- [ ] No committed secrets (`.env*` is gitignored; double-check your diff)
- [ ] If you added env vars, they're listed in `.env.example` with a comment
- [ ] Screenshots or a short clip for any UI change

## Reporting issues

Bugs, feature requests, and questions all go in GitHub Issues. For security
issues, please email the maintainer rather than filing publicly.
